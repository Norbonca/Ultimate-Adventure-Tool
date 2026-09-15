-- ============================================================================
-- Migration 040: M23 — profil ország ↔ időzóna összerendelés, szerveroldali ellenőrzés
-- ============================================================================
-- Norbert döntései (2026-09-15):
--   1. Ország nélküli profilnál a böngésző nyelve/időzónája alapján a felület FELAJÁNL országot és
--      időzónát; automatikus mentés nincs (kódoldal, nem ez a migráció).
--   2. Országgal megadott profil időzóna nélkül nem fordulhat elő. Az ország ↔ időzóna összerendelés
--      a saját `ref_timezones` törzs (country_code). Ahol egy országnak több, eltérő eltolású vagy
--      szabályú zónája van, a felhasználó választ; egyzónás országnál a zóna automatikus.
--   3. Számozás: a 039 az M121 tervezett migrációjának FENNTARTVA (ezért nincs 039-es fájl).
--   4. A profil mentésekor szerveroldalon ellenőrizzük, hogy az ország aktív (`ref_countries.is_active`).
--
-- Tartalom:
--   1. Hiányzó, eltérő eltolású/szabályú valós zónák aktív országokhoz (US, CA, MX, AU, CL, NZ).
--      Az utc_offset a standard (téli) eltolás, a has_dst jelzi a nyári időszámítást (007/037 konvenció).
--   2. `ref_countries.primary_timezone` kitöltése, ahol NULL (többzónásnál explicit, egyzónásnál az
--      egyetlen aktív zóna). Admin által már kitöltött értéket nem ír felül.
--   3. Backfill a trigger ELŐTT: országos profil hiányzó / nem az országhoz tartozó zónája → az ország
--      fő zónája. Többzónás országnál ez a fő zóna; a felhasználó a profilban módosíthatja.
--   4. `validate_profile_country_timezone()` + BEFORE INSERT OR UPDATE OF country_code, timezone trigger
--      a `profiles` táblán, minden szerepkörre. Hibakulcsok (ERRCODE 23514):
--        profile_country_inactive, profile_timezone_required,
--        profile_timezone_country_mismatch, profile_timezone_invalid
--
-- Inaktív vagy nem létező országú profilokat a backfill NEM módosít (helyben 0 ilyen volt). Élesítés
-- előtt élesben ellenőrizendő (mindkettőnek 0-t kell adnia, különben előbb kézi rendezés kell):
--   SELECT count(*) FROM public.profiles p
--   LEFT JOIN public.ref_countries c ON c.code = p.country_code
--   WHERE p.country_code IS NOT NULL AND (c.code IS NULL OR NOT c.is_active);
--   SELECT count(*) FROM public.profiles p
--   WHERE p.country_code IS NULL AND p.timezone IS NOT NULL
--     AND NOT EXISTS (SELECT 1 FROM public.ref_timezones t WHERE t.tz_id = p.timezone);
--
-- Idempotens: ON CONFLICT DO NOTHING, WHERE ... IS NULL / feltételes UPDATE, CREATE OR REPLACE,
-- DROP TRIGGER IF EXISTS + CREATE TRIGGER.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Hiányzó zónák
-- ============================================================================

INSERT INTO public.ref_timezones (tz_id, display_name, utc_offset_minutes, utc_offset_text, has_dst, country_code, sort_order) VALUES
  ('America/Phoenix',      'Phoenix (MST)',                 -420, 'UTC-07:00', false, 'US', 52),
  ('America/St_Johns',     'St. John''s (NST/NDT)',         -210, 'UTC-03:30', true,  'CA', 56),
  ('America/Halifax',      'Halifax (AST/ADT)',             -240, 'UTC-04:00', true,  'CA', 56),
  ('America/Winnipeg',     'Winnipeg (CST/CDT)',            -360, 'UTC-06:00', true,  'CA', 57),
  ('America/Regina',       'Regina (CST)',                  -360, 'UTC-06:00', false, 'CA', 57),
  ('America/Edmonton',     'Edmonton (MST/MDT)',            -420, 'UTC-07:00', true,  'CA', 57),
  ('America/Tijuana',      'Tijuana (PST/PDT)',             -480, 'UTC-08:00', true,  'MX', 75),
  ('America/Hermosillo',   'Hermosillo (MST)',              -420, 'UTC-07:00', false, 'MX', 75),
  ('America/Mazatlan',     'Mazatlán (MST)',                -420, 'UTC-07:00', false, 'MX', 75),
  ('Australia/Brisbane',   'Brisbane (AEST)',               600,  'UTC+10:00', false, 'AU', 59),
  ('Australia/Melbourne',  'Melbourne (AEST/AEDT)',         600,  'UTC+10:00', true,  'AU', 59),
  ('Australia/Hobart',     'Hobart (AEST/AEDT)',            600,  'UTC+10:00', true,  'AU', 59),
  ('Australia/Adelaide',   'Adelaide (ACST/ACDT)',          570,  'UTC+09:30', true,  'AU', 60),
  ('Australia/Darwin',     'Darwin (ACST)',                 570,  'UTC+09:30', false, 'AU', 60),
  ('Pacific/Easter',       'Easter Island (EAST/EASST)',    -360, 'UTC-06:00', true,  'CL', 66),
  ('America/Punta_Arenas', 'Punta Arenas (-03)',            -180, 'UTC-03:00', false, 'CL', 66),
  ('Pacific/Chatham',      'Chatham Islands (CHAST/CHADT)', 765,  'UTC+12:45', true,  'NZ', 58)
ON CONFLICT (tz_id) DO NOTHING;

-- ============================================================================
-- 2. ref_countries.primary_timezone (csak üres értéket tölt)
-- ============================================================================

-- Többzónás országok: explicit fő zóna.
UPDATE public.ref_countries c
SET primary_timezone = v.tz
FROM (VALUES
  ('US', 'America/New_York'), ('CA', 'America/Toronto'), ('MX', 'America/Mexico_City'),
  ('AU', 'Australia/Sydney'), ('CL', 'America/Santiago'), ('NZ', 'Pacific/Auckland'),
  ('EC', 'America/Guayaquil')
) AS v(code, tz)
WHERE c.code = v.code
  AND c.primary_timezone IS NULL
  AND EXISTS (SELECT 1 FROM public.ref_timezones t WHERE t.tz_id = v.tz AND t.country_code = v.code);

-- Egyzónás országok: az egyetlen aktív zóna.
UPDATE public.ref_countries c
SET primary_timezone = (
  SELECT t.tz_id FROM public.ref_timezones t
  WHERE t.country_code = c.code AND t.is_active
)
WHERE c.primary_timezone IS NULL
  AND (SELECT count(*) FROM public.ref_timezones t WHERE t.country_code = c.code AND t.is_active) = 1;

COMMENT ON COLUMN public.ref_countries.primary_timezone IS
  'M23: az ország fő IANA-időzónája (NyK-15). 040 óta minden aktív országnál kitöltve; a profil és a naptár tartaléka, ha a profil zónája hiányzik vagy nem az országé.';

-- ============================================================================
-- 3. Backfill (a trigger előtt)
-- ============================================================================
-- Aktív országú profil, amelynek zónája hiányzik vagy nem az országhoz tartozó aktív zóna → az ország
-- fő zónája. Többzónás országnál (pl. US) ez a fő zóna; a felhasználó a profilban módosíthatja.
-- Inaktív/nem létező országú profilt nem módosít (ld. fejléc-SELECT).

UPDATE public.profiles p
SET timezone = c.primary_timezone
FROM public.ref_countries c
WHERE c.code = p.country_code
  AND c.is_active
  AND c.primary_timezone IS NOT NULL
  AND (
    p.timezone IS NULL
    OR NOT EXISTS (
      SELECT 1 FROM public.ref_timezones t
      WHERE t.tz_id = p.timezone AND t.country_code = p.country_code AND t.is_active
    )
  );

-- ============================================================================
-- 4. Validáló függvény + trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION public.validate_profile_country_timezone()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.country_code IS NOT DISTINCT FROM OLD.country_code
     AND NEW.timezone IS NOT DISTINCT FROM OLD.timezone THEN
    RETURN NEW;
  END IF;

  IF NEW.country_code IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.ref_countries c WHERE c.code = NEW.country_code AND c.is_active
    ) THEN
      RAISE EXCEPTION 'profile_country_inactive' USING ERRCODE = '23514';
    END IF;

    IF NEW.timezone IS NULL THEN
      RAISE EXCEPTION 'profile_timezone_required' USING ERRCODE = '23514';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.ref_timezones t
      WHERE t.tz_id = NEW.timezone AND t.country_code = NEW.country_code AND t.is_active
    ) THEN
      RAISE EXCEPTION 'profile_timezone_country_mismatch' USING ERRCODE = '23514';
    END IF;
  ELSIF NEW.timezone IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.ref_timezones t WHERE t.tz_id = NEW.timezone) THEN
      RAISE EXCEPTION 'profile_timezone_invalid' USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.validate_profile_country_timezone() IS
  'M23 (040): profil ország aktív, országgal kötelező és az országhoz tartozó aktív időzóna; ország nélkül a zóna létező ref_timezones sor.';

DROP TRIGGER IF EXISTS validate_profile_country_timezone ON public.profiles;
CREATE TRIGGER validate_profile_country_timezone
  BEFORE INSERT OR UPDATE OF country_code, timezone ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.validate_profile_country_timezone();

COMMIT;

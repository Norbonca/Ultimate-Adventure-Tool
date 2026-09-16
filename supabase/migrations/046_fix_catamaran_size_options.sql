-- Migration 046: a katamarán méretopciók érték–felirat párjának javítása (UX-019)
--
-- Hiba: a vízi sportok `vessel_type` paraméterében a `catamaran_small` felirata „>45 láb”,
-- a `catamaran_big` felirata „<45 láb” volt — az érték jelentése és a felirat fordított.
-- A vitorlás párja (`sailboat_small` = <50, `sailboat_big` = >50) a helyes minta.
--
-- Javítás, két lépésben, egy tranzakcióban:
--   1. A feliratok cseréje, hogy az érték jelentése igaz legyen (small = <45, big = >45).
--   2. A már elmentett túrák értékének cseréje, hogy a szervező által LÁTOTT választás
--      (a felirat) megmaradjon: aki „>45 láb”-at választott, eddig `catamaran_small`-t
--      tárolt, mostantól `catamaran_big`-et tárol, és továbbra is „>45 láb”-at lát.
--
-- Idempotens: csak akkor fut, ha a `catamaran_small` felirata még a hibás „>45”;
-- olyan adatbázisban (helyi/seed), ahol az opciók nincsenek meg, nem csinál semmit.
-- Számozás: 043–045 az M23-é (PR #33), ezért 046; az M121 migrációja 047-től.
BEGIN;

DO $$
DECLARE
  v_param_ids uuid[];
BEGIN
  SELECT array_agg(DISTINCT o.parameter_id) INTO v_param_ids
  FROM public.ref_parameter_options o
  WHERE o.value = 'catamaran_small'
    AND o.label LIKE '%>45%';

  IF v_param_ids IS NULL THEN
    RAISE NOTICE '046: nincs javítandó katamarán-opció (már javítva vagy nem létezik)';
    RETURN;
  END IF;

  -- 1. Feliratok
  UPDATE public.ref_parameter_options o
  SET label = 'Catamaran <45 feet',
      label_localized = COALESCE(o.label_localized, '{}'::jsonb)
        || '{"en":"Catamaran <45 feet","hu":"Katamarán <45 láb"}'::jsonb
  WHERE o.value = 'catamaran_small' AND o.parameter_id = ANY (v_param_ids);

  UPDATE public.ref_parameter_options o
  SET label = 'Catamaran >45 feet',
      label_localized = COALESCE(o.label_localized, '{}'::jsonb)
        || '{"en":"Catamaran >45 feet","hu":"Katamarán >45 láb"}'::jsonb
  WHERE o.value = 'catamaran_big' AND o.parameter_id = ANY (v_param_ids);

  -- 2. Elmentett túrák: a látott választás megtartása (small ↔ big csere)
  UPDATE public.trips t
  SET category_details = jsonb_set(
        t.category_details,
        '{vessel_type}',
        CASE t.category_details->>'vessel_type'
          WHEN 'catamaran_small' THEN '"catamaran_big"'::jsonb
          ELSE '"catamaran_small"'::jsonb
        END
      )
  WHERE t.category_details->>'vessel_type' IN ('catamaran_small', 'catamaran_big');
END;
$$;

COMMIT;

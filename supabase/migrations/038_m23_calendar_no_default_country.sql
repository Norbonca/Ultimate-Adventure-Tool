-- Migration 038: M23 Calendar — nincs rögzített alap naptár-ország
--
-- Norbert döntése (2026-09-15, K-04, BR-M23-006): „Nem mondtam, hogy Magyarország legyen az
-- alapértelmezett naptárország, a felhasználó saját országa legyen, profilban legyen megadható.”
-- A naptár-ország forrása a profil országa (`profiles.country_code`, csak aktív `ref_countries`);
-- ország nélkül nincs országspecifikus naptár, a néző időzónája UTC. A nyelvhez rendelt alapország
-- (`calendar_default_country_by_locale`, a 037 seedje) megszűnik, a kód már nem olvassa.
--
-- Miért új migráció és nem a 037 javítása: a 037 a helyi adatbázison már lefutott
-- (supabase_migrations.schema_migrations: 037), a módosított 037 ott nem futna újra.
--
-- Idempotens: a DELETE hiányzó kulcsra üres művelet.
BEGIN;

DELETE FROM public.system_settings WHERE key = 'calendar_default_country_by_locale';

COMMIT;

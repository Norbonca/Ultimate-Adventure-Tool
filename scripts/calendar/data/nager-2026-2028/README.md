# Nager.Date pillanatkép (M23 Calendar seed)

- **Forrás:** https://date.nager.at — `GET /api/v3/PublicHolidays/{év}/{ország}`
- **Letöltve:** 2026-09-15, 45 európai ország × 2026–2028
- **Licenc:** MIT — a jogosult és a teljes licencszöveg: https://github.com/nager/Nager.Date (LICENSE); a licencszöveget az adat továbbadásakor mellékelni kell
- **Felhasználás:** a `scripts/calendar/build-calendar-seed.mjs` bemenete; a 043-as migráció az
  országos (`global: true`, `Public` típusú) ünnepeket veszi át. A magyar adatok nem innen jönnek
  (hivatalos jogforrás), ezt a fájlt a HU-hoz csak keresztellenőrzésre használja.

A fájlokat kézzel ne módosítsd; új pillanatképhez új mappa és a generátor bemenetének átírása kell.

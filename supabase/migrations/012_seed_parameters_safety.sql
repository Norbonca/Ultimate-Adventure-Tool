-- ============================================================================
-- 012 — Seed Data: Category Parameters + Parameter Options + Safety Requirements
-- ============================================================================
-- Modul:       M00 Reference Data
-- Sorok:       ~60 params + ~80 options + ~40 safety = ~180 sor
-- Forrás:      02_Category_Reference_Database_Design.md §3.1, §3.2, §3.10, §11
-- ============================================================================
-- MEGJEGYZÉS: Ez a fő konfiguráció, ami a Wizard Step 3 dinamikus űrlapját hajtja.
-- Minden parameter_key a trips.category_details JSONB kulcsaira képződik le.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. ref_category_parameters — Wizard Step 3 mezők
-- ============================================================================

-- ──────────────────────────────────────────────────
-- 1.1 HIKING — 11 paraméter
-- ──────────────────────────────────────────────────

INSERT INTO ref_category_parameters (category_id, parameter_key, label, label_localized, field_type, unit, is_required, validation, group_key, group_label, group_label_localized, display_order, is_filterable, show_on_card, icon_name) VALUES
  ((SELECT id FROM categories WHERE name = 'Hiking'), 'trail_distance_km', 'Trail Distance', '{"hu":"Útvonal távolság","de":"Streckenlänge"}',
   'number', 'km', true, '{"min":0.5,"max":500,"step":0.5}', 'route', 'Route Details', '{"hu":"Útvonal részletek"}', 1, true, true, 'ruler'),
  ((SELECT id FROM categories WHERE name = 'Hiking'), 'elevation_gain_m', 'Elevation Gain', '{"hu":"Szintemelkedés","de":"Höhenmeter Aufstieg"}',
   'number', 'm', true, '{"min":0,"max":9000,"step":10}', 'route', 'Route Details', '{"hu":"Útvonal részletek"}', 2, true, true, 'trending-up'),
  ((SELECT id FROM categories WHERE name = 'Hiking'), 'elevation_loss_m', 'Elevation Loss', '{"hu":"Szintcsökkenés","de":"Höhenmeter Abstieg"}',
   'number', 'm', false, '{"min":0,"max":9000,"step":10}', 'route', 'Route Details', '{"hu":"Útvonal részletek"}', 3, false, false, 'trending-down'),
  ((SELECT id FROM categories WHERE name = 'Hiking'), 'highest_point_m', 'Highest Point', '{"hu":"Legmagasabb pont","de":"Höchster Punkt"}',
   'number', 'm', false, '{"min":0,"max":8849,"step":1}', 'route', 'Route Details', '{"hu":"Útvonal részletek"}', 4, true, false, 'mountain'),
  ((SELECT id FROM categories WHERE name = 'Hiking'), 'terrain_type', 'Terrain Type', '{"hu":"Terep típus","de":"Geländetyp"}',
   'multiselect', NULL, true, NULL, 'terrain', 'Terrain & Conditions', '{"hu":"Terep és körülmények"}', 5, true, false, 'layers'),
  ((SELECT id FROM categories WHERE name = 'Hiking'), 'trail_marking', 'Trail Marking', '{"hu":"Jelölés","de":"Wegmarkierung"}',
   'select', NULL, false, NULL, 'terrain', 'Terrain & Conditions', '{"hu":"Terep és körülmények"}', 6, true, false, 'signpost'),
  ((SELECT id FROM categories WHERE name = 'Hiking'), 'water_sources', 'Water Sources Available', '{"hu":"Vízforrás elérhető","de":"Wasserquellen verfügbar"}',
   'boolean', NULL, false, NULL, 'logistics', 'Logistics', '{"hu":"Logisztika"}', 7, true, false, 'droplets'),
  ((SELECT id FROM categories WHERE name = 'Hiking'), 'hut_accommodation', 'Hut Accommodation', '{"hu":"Menedékház szállás","de":"Hüttenübernachtung"}',
   'boolean', NULL, false, NULL, 'logistics', 'Logistics', '{"hu":"Logisztika"}', 8, true, false, 'home'),
  ((SELECT id FROM categories WHERE name = 'Hiking'), 'camping_required', 'Camping Required', '{"hu":"Kempingezés szükséges","de":"Camping erforderlich"}',
   'boolean', NULL, false, NULL, 'logistics', 'Logistics', '{"hu":"Logisztika"}', 9, false, false, 'tent'),
  ((SELECT id FROM categories WHERE name = 'Hiking'), 'dogs_allowed', 'Dogs Allowed', '{"hu":"Kutya engedélyezett","de":"Hunde erlaubt"}',
   'boolean', NULL, false, NULL, 'rules', 'Rules & Permits', '{"hu":"Szabályok"}', 10, true, false, 'dog'),
  ((SELECT id FROM categories WHERE name = 'Hiking'), 'estimated_hours', 'Estimated Duration', '{"hu":"Becsült időtartam","de":"Geschätzte Dauer"}',
   'number', 'hours', false, '{"min":0.5,"max":200,"step":0.5}', 'route', 'Route Details', '{"hu":"Útvonal részletek"}', 11, true, true, 'clock');

-- ──────────────────────────────────────────────────
-- 1.2 WATER SPORTS (közös + Sailing) — 10 paraméter
-- ──────────────────────────────────────────────────

INSERT INTO ref_category_parameters (category_id, sub_discipline_id, parameter_key, label, label_localized, field_type, unit, is_required, validation, group_key, group_label, group_label_localized, display_order, is_filterable, show_on_card, icon_name) VALUES
  ((SELECT id FROM categories WHERE name = 'Water Sports'), NULL, 'water_type', 'Water Type', '{"hu":"Víz típus","de":"Gewässertyp"}',
   'select', NULL, true, NULL, 'environment', 'Environment', '{"hu":"Környezet"}', 1, true, true, 'waves'),
  ((SELECT id FROM categories WHERE name = 'Water Sports'), NULL, 'water_temp_min_c', 'Water Temperature (min)', '{"hu":"Vízhőmérséklet (min)","de":"Wassertemperatur (min)"}',
   'number', '°C', false, '{"min":-2,"max":40,"step":1}', 'conditions', 'Conditions', '{"hu":"Körülmények"}', 2, false, false, 'thermometer'),
  ((SELECT id FROM categories WHERE name = 'Water Sports'),
   (SELECT id FROM sub_disciplines WHERE name = 'Sailing' AND category_id = (SELECT id FROM categories WHERE name = 'Water Sports')),
   'vessel_type', 'Vessel Type', '{"hu":"Hajó típus","de":"Bootstyp"}',
   'select', NULL, true, NULL, 'vessel', 'Vessel', '{"hu":"Hajó"}', 3, true, true, 'ship'),
  ((SELECT id FROM categories WHERE name = 'Water Sports'),
   (SELECT id FROM sub_disciplines WHERE name = 'Sailing' AND category_id = (SELECT id FROM categories WHERE name = 'Water Sports')),
   'vessel_length_ft', 'Vessel Length', '{"hu":"Hajó hossza","de":"Bootslänge"}',
   'number', 'ft', false, '{"min":10,"max":200,"step":1}', 'vessel', 'Vessel', '{"hu":"Hajó"}', 4, false, false, 'ruler'),
  ((SELECT id FROM categories WHERE name = 'Water Sports'),
   (SELECT id FROM sub_disciplines WHERE name = 'Sailing' AND category_id = (SELECT id FROM categories WHERE name = 'Water Sports')),
   'daily_distance_nm', 'Daily Distance', '{"hu":"Napi távolság","de":"Tagesentfernung"}',
   'number', 'nm', false, '{"min":1,"max":200,"step":1}', 'route', 'Route', '{"hu":"Útvonal"}', 5, false, false, 'compass'),
  ((SELECT id FROM categories WHERE name = 'Water Sports'),
   (SELECT id FROM sub_disciplines WHERE name = 'Sailing' AND category_id = (SELECT id FROM categories WHERE name = 'Water Sports')),
   'night_sailing', 'Night Sailing', '{"hu":"Éjszakai vitorlázás","de":"Nachtsegeln"}',
   'boolean', NULL, false, NULL, 'route', 'Route', '{"hu":"Útvonal"}', 6, true, false, 'moon'),
  ((SELECT id FROM categories WHERE name = 'Water Sports'),
   (SELECT id FROM sub_disciplines WHERE name = 'Sailing' AND category_id = (SELECT id FROM categories WHERE name = 'Water Sports')),
   'marina_berths', 'Marina Berths Planned', '{"hu":"Kikötőhelyek tervezve","de":"Liegeplätze geplant"}',
   'boolean', NULL, false, NULL, 'logistics', 'Logistics', '{"hu":"Logisztika"}', 7, false, false, 'anchor'),
  ((SELECT id FROM categories WHERE name = 'Water Sports'),
   (SELECT id FROM sub_disciplines WHERE name = 'Diving' AND category_id = (SELECT id FROM categories WHERE name = 'Water Sports')),
   'dive_depth_max_m', 'Max Dive Depth', '{"hu":"Max merülési mélység","de":"Max. Tauchtiefe"}',
   'number', 'm', true, '{"min":1,"max":300,"step":1}', 'technical', 'Technical', '{"hu":"Technikai"}', 8, true, true, 'arrow-down'),
  ((SELECT id FROM categories WHERE name = 'Water Sports'),
   (SELECT id FROM sub_disciplines WHERE name = 'Kayaking' AND category_id = (SELECT id FROM categories WHERE name = 'Water Sports')),
   'river_grade', 'River Grade', '{"hu":"Folyó fokozat","de":"Flussschwierigkeit"}',
   'select', NULL, true, NULL, 'conditions', 'Conditions', '{"hu":"Körülmények"}', 9, true, true, 'waves'),
  ((SELECT id FROM categories WHERE name = 'Water Sports'),
   (SELECT id FROM sub_disciplines WHERE name = 'Surfing' AND category_id = (SELECT id FROM categories WHERE name = 'Water Sports')),
   'wave_height_max_m', 'Max Wave Height', '{"hu":"Max hullámmagasság","de":"Max. Wellenhöhe"}',
   'number', 'm', false, '{"min":0.3,"max":20,"step":0.1}', 'conditions', 'Conditions', '{"hu":"Körülmények"}', 10, true, false, 'waves');

-- ──────────────────────────────────────────────────
-- 1.3 CYCLING — 6 paraméter
-- ──────────────────────────────────────────────────

INSERT INTO ref_category_parameters (category_id, parameter_key, label, label_localized, field_type, unit, is_required, validation, group_key, group_label, group_label_localized, display_order, is_filterable, show_on_card, icon_name) VALUES
  ((SELECT id FROM categories WHERE name = 'Cycling'), 'total_distance_km', 'Total Distance', '{"hu":"Összes távolság","de":"Gesamtstrecke"}',
   'number', 'km', true, '{"min":1,"max":5000,"step":1}', 'route', 'Route Details', '{"hu":"Útvonal"}', 1, true, true, 'ruler'),
  ((SELECT id FROM categories WHERE name = 'Cycling'), 'elevation_gain_m', 'Elevation Gain', '{"hu":"Szintemelkedés","de":"Höhenmeter"}',
   'number', 'm', false, '{"min":0,"max":15000,"step":10}', 'route', 'Route Details', '{"hu":"Útvonal"}', 2, true, true, 'trending-up'),
  ((SELECT id FROM categories WHERE name = 'Cycling'), 'surface_types', 'Surface Types', '{"hu":"Felület típusok","de":"Oberflächentypen"}',
   'multiselect', NULL, true, NULL, 'terrain', 'Terrain', '{"hu":"Terep"}', 3, true, false, 'layers'),
  ((SELECT id FROM categories WHERE name = 'Cycling'), 'bike_type_required', 'Bike Type Required', '{"hu":"Szükséges kerékpár típus","de":"Erforderlicher Fahrradtyp"}',
   'select', NULL, true, NULL, 'equipment', 'Equipment', '{"hu":"Felszerelés"}', 4, true, true, 'bike'),
  ((SELECT id FROM categories WHERE name = 'Cycling'), 'support_vehicle', 'Support Vehicle', '{"hu":"Kísérő jármű","de":"Begleitfahrzeug"}',
   'boolean', NULL, false, NULL, 'logistics', 'Logistics', '{"hu":"Logisztika"}', 5, true, false, 'car'),
  ((SELECT id FROM categories WHERE name = 'Cycling'), 'charging_stations', 'Charging Stations (E-Bike)', '{"hu":"Töltőállomások (E-Bike)","de":"Ladestationen (E-Bike)"}',
   'boolean', NULL, false, NULL, 'logistics', 'Logistics', '{"hu":"Logisztika"}', 6, false, false, 'battery-charging');

-- ──────────────────────────────────────────────────
-- 1.4 MOUNTAIN — 6 paraméter
-- ──────────────────────────────────────────────────

INSERT INTO ref_category_parameters (category_id, parameter_key, label, label_localized, field_type, unit, is_required, validation, group_key, group_label, group_label_localized, display_order, is_filterable, show_on_card, icon_name) VALUES
  ((SELECT id FROM categories WHERE name = 'Mountain'), 'climbing_type', 'Climbing Type', '{"hu":"Mászás típusa","de":"Kletterart"}',
   'select', NULL, true, NULL, 'technical', 'Technical', '{"hu":"Technikai"}', 1, true, true, 'mountain'),
  ((SELECT id FROM categories WHERE name = 'Mountain'), 'altitude_max_m', 'Max Altitude', '{"hu":"Max. magasság","de":"Max. Höhe"}',
   'number', 'm', false, '{"min":0,"max":8849,"step":1}', 'route', 'Route', '{"hu":"Útvonal"}', 2, true, true, 'arrow-up'),
  ((SELECT id FROM categories WHERE name = 'Mountain'), 'rope_required', 'Rope Required', '{"hu":"Kötél szükséges","de":"Seil erforderlich"}',
   'boolean', NULL, false, NULL, 'technical', 'Technical', '{"hu":"Technikai"}', 3, true, false, 'link'),
  ((SELECT id FROM categories WHERE name = 'Mountain'), 'glacier_travel', 'Glacier Travel', '{"hu":"Gleccserjárás","de":"Gletscherbegehung"}',
   'boolean', NULL, false, NULL, 'technical', 'Technical', '{"hu":"Technikai"}', 4, true, false, 'snowflake'),
  ((SELECT id FROM categories WHERE name = 'Mountain'), 'summit_name', 'Summit Name', '{"hu":"Csúcs neve","de":"Gipfelname"}',
   'text', NULL, false, '{"maxLength":100}', 'route', 'Route', '{"hu":"Útvonal"}', 5, false, true, 'flag'),
  ((SELECT id FROM categories WHERE name = 'Mountain'), 'route_length_m', 'Route Length', '{"hu":"Útvonal hossza","de":"Routenlänge"}',
   'number', 'm', false, '{"min":10,"max":5000,"step":10}', 'route', 'Route', '{"hu":"Útvonal"}', 6, true, false, 'ruler');

-- ──────────────────────────────────────────────────
-- 1.5 WINTER SPORTS — 5 paraméter
-- ──────────────────────────────────────────────────

INSERT INTO ref_category_parameters (category_id, parameter_key, label, label_localized, field_type, unit, is_required, validation, group_key, group_label, group_label_localized, display_order, is_filterable, show_on_card, icon_name) VALUES
  ((SELECT id FROM categories WHERE name = 'Winter Sports'), 'snow_sport_type', 'Sport Type', '{"hu":"Sport típus","de":"Sportart"}',
   'select', NULL, true, NULL, 'technical', 'Technical', '{"hu":"Technikai"}', 1, true, true, 'snowflake'),
  ((SELECT id FROM categories WHERE name = 'Winter Sports'), 'avalanche_rating', 'Avalanche Danger Rating', '{"hu":"Lavinafokozat","de":"Lawinengefahrenstufe"}',
   'select', NULL, false, NULL, 'safety', 'Safety', '{"hu":"Biztonság"}', 2, true, true, 'alert-triangle'),
  ((SELECT id FROM categories WHERE name = 'Winter Sports'), 'ascent_m', 'Total Ascent', '{"hu":"Összes emelkedő","de":"Gesamter Aufstieg"}',
   'number', 'm', false, '{"min":0,"max":5000,"step":10}', 'route', 'Route', '{"hu":"Útvonal"}', 3, true, true, 'trending-up'),
  ((SELECT id FROM categories WHERE name = 'Winter Sports'), 'descent_m', 'Total Descent', '{"hu":"Összes ereszkedő","de":"Gesamte Abfahrt"}',
   'number', 'm', false, '{"min":0,"max":5000,"step":10}', 'route', 'Route', '{"hu":"Útvonal"}', 4, false, false, 'trending-down'),
  ((SELECT id FROM categories WHERE name = 'Winter Sports'), 'equipment_rental', 'Equipment Rental Available', '{"hu":"Felszerelésbérlés elérhető","de":"Ausrüstungsverleih verfügbar"}',
   'boolean', NULL, false, NULL, 'logistics', 'Logistics', '{"hu":"Logisztika"}', 5, true, false, 'package');

-- ============================================================================
-- 2. ref_parameter_options — Select/Multiselect értékek
-- ============================================================================

-- 2.1 Hiking — terrain_type opciók
INSERT INTO ref_parameter_options (parameter_id, value, label, label_localized, icon_name, sort_order) VALUES
  ((SELECT id FROM ref_category_parameters WHERE parameter_key = 'terrain_type' AND category_id = (SELECT id FROM categories WHERE name = 'Hiking')),
   'rocky', 'Rocky Terrain', '{"hu":"Sziklás terep","de":"Felsgelände"}', 'mountain', 1),
  ((SELECT id FROM ref_category_parameters WHERE parameter_key = 'terrain_type' AND category_id = (SELECT id FROM categories WHERE name = 'Hiking')),
   'forest', 'Forest Trail', '{"hu":"Erdei ösvény","de":"Waldweg"}', 'trees', 2),
  ((SELECT id FROM ref_category_parameters WHERE parameter_key = 'terrain_type' AND category_id = (SELECT id FROM categories WHERE name = 'Hiking')),
   'alpine_meadow', 'Alpine Meadow', '{"hu":"Alpesi rét","de":"Almwiese"}', 'flower-2', 3),
  ((SELECT id FROM ref_category_parameters WHERE parameter_key = 'terrain_type' AND category_id = (SELECT id FROM categories WHERE name = 'Hiking')),
   'coastal', 'Coastal Path', '{"hu":"Tengerparti ösvény","de":"Küstenpfad"}', 'waves', 4),
  ((SELECT id FROM ref_category_parameters WHERE parameter_key = 'terrain_type' AND category_id = (SELECT id FROM categories WHERE name = 'Hiking')),
   'desert', 'Desert', '{"hu":"Sivatag","de":"Wüste"}', 'sun', 5),
  ((SELECT id FROM ref_category_parameters WHERE parameter_key = 'terrain_type' AND category_id = (SELECT id FROM categories WHERE name = 'Hiking')),
   'snow_ice', 'Snow & Ice', '{"hu":"Hó és jég","de":"Schnee und Eis"}', 'snowflake', 6),
  ((SELECT id FROM ref_category_parameters WHERE parameter_key = 'terrain_type' AND category_id = (SELECT id FROM categories WHERE name = 'Hiking')),
   'gravel', 'Gravel Path', '{"hu":"Kavicsos út","de":"Schotterweg"}', 'circle-dot', 7),
  ((SELECT id FROM ref_category_parameters WHERE parameter_key = 'terrain_type' AND category_id = (SELECT id FROM categories WHERE name = 'Hiking')),
   'paved', 'Paved Road', '{"hu":"Aszfaltút","de":"Asphaltweg"}', 'route', 8),
  ((SELECT id FROM ref_category_parameters WHERE parameter_key = 'terrain_type' AND category_id = (SELECT id FROM categories WHERE name = 'Hiking')),
   'scree', 'Scree / Loose Rock', '{"hu":"Törmelék","de":"Geröll"}', 'triangle-alert', 9),
  ((SELECT id FROM ref_category_parameters WHERE parameter_key = 'terrain_type' AND category_id = (SELECT id FROM categories WHERE name = 'Hiking')),
   'bog_marsh', 'Bog / Marsh', '{"hu":"Mocsár / Láp","de":"Moor / Sumpf"}', 'droplets', 10);

-- 2.2 Hiking — trail_marking opciók
INSERT INTO ref_parameter_options (parameter_id, value, label, label_localized, sort_order) VALUES
  ((SELECT id FROM ref_category_parameters WHERE parameter_key = 'trail_marking' AND category_id = (SELECT id FROM categories WHERE name = 'Hiking')),
   'well_marked', 'Well Marked', '{"hu":"Jól jelölt","de":"Gut markiert"}', 1),
  ((SELECT id FROM ref_category_parameters WHERE parameter_key = 'trail_marking' AND category_id = (SELECT id FROM categories WHERE name = 'Hiking')),
   'partially_marked', 'Partially Marked', '{"hu":"Részben jelölt","de":"Teilweise markiert"}', 2),
  ((SELECT id FROM ref_category_parameters WHERE parameter_key = 'trail_marking' AND category_id = (SELECT id FROM categories WHERE name = 'Hiking')),
   'unmarked', 'Unmarked', '{"hu":"Jelöletlen","de":"Unmarkiert"}', 3),
  ((SELECT id FROM ref_category_parameters WHERE parameter_key = 'trail_marking' AND category_id = (SELECT id FROM categories WHERE name = 'Hiking')),
   'gps_recommended', 'GPS Recommended', '{"hu":"GPS ajánlott","de":"GPS empfohlen"}', 4),
  ((SELECT id FROM ref_category_parameters WHERE parameter_key = 'trail_marking' AND category_id = (SELECT id FROM categories WHERE name = 'Hiking')),
   'cairns', 'Cairns Only', '{"hu":"Csak kőrakások","de":"Nur Steinmännchen"}', 5);

-- 2.3 Water Sports — water_type opciók
INSERT INTO ref_parameter_options (parameter_id, value, label, label_localized, sort_order) VALUES
  ((SELECT id FROM ref_category_parameters WHERE parameter_key = 'water_type' AND category_id = (SELECT id FROM categories WHERE name = 'Water Sports')),
   'sea', 'Sea / Ocean', '{"hu":"Tenger / Óceán","de":"Meer / Ozean"}', 1),
  ((SELECT id FROM ref_category_parameters WHERE parameter_key = 'water_type' AND category_id = (SELECT id FROM categories WHERE name = 'Water Sports')),
   'lake', 'Lake', '{"hu":"Tó","de":"See"}', 2),
  ((SELECT id FROM ref_category_parameters WHERE parameter_key = 'water_type' AND category_id = (SELECT id FROM categories WHERE name = 'Water Sports')),
   'river', 'River', '{"hu":"Folyó","de":"Fluss"}', 3),
  ((SELECT id FROM ref_category_parameters WHERE parameter_key = 'water_type' AND category_id = (SELECT id FROM categories WHERE name = 'Water Sports')),
   'reservoir', 'Reservoir', '{"hu":"Víztározó","de":"Stausee"}', 4),
  ((SELECT id FROM ref_category_parameters WHERE parameter_key = 'water_type' AND category_id = (SELECT id FROM categories WHERE name = 'Water Sports')),
   'canal', 'Canal', '{"hu":"Csatorna","de":"Kanal"}', 5);

-- 2.4 Water Sports — vessel_type opciók (Sailing)
INSERT INTO ref_parameter_options (parameter_id, value, label, label_localized, sort_order) VALUES
  ((SELECT id FROM ref_category_parameters WHERE parameter_key = 'vessel_type'),
   'sailboat_25_30', 'Sailboat 25-30ft', '{"hu":"Vitorlás 25-30 láb","de":"Segelboot 25-30ft"}', 1),
  ((SELECT id FROM ref_category_parameters WHERE parameter_key = 'vessel_type'),
   'sailboat_30_40', 'Sailboat 30-40ft', '{"hu":"Vitorlás 30-40 láb","de":"Segelboot 30-40ft"}', 2),
  ((SELECT id FROM ref_category_parameters WHERE parameter_key = 'vessel_type'),
   'sailboat_40_50', 'Sailboat 40-50ft', '{"hu":"Vitorlás 40-50 láb","de":"Segelboot 40-50ft"}', 3),
  ((SELECT id FROM ref_category_parameters WHERE parameter_key = 'vessel_type'),
   'catamaran', 'Catamaran', '{"hu":"Katamarán","de":"Katamaran"}', 4),
  ((SELECT id FROM ref_category_parameters WHERE parameter_key = 'vessel_type'),
   'dinghy', 'Dinghy / Small Boat', '{"hu":"Jolly / Kishajó","de":"Jolle / Kleinboot"}', 5);

-- 2.5 Cycling — surface_types opciók
INSERT INTO ref_parameter_options (parameter_id, value, label, label_localized, sort_order) VALUES
  ((SELECT id FROM ref_category_parameters WHERE parameter_key = 'surface_types' AND category_id = (SELECT id FROM categories WHERE name = 'Cycling')),
   'asphalt', 'Asphalt / Paved', '{"hu":"Aszfalt","de":"Asphalt"}', 1),
  ((SELECT id FROM ref_category_parameters WHERE parameter_key = 'surface_types' AND category_id = (SELECT id FROM categories WHERE name = 'Cycling')),
   'gravel', 'Gravel', '{"hu":"Kavics","de":"Schotter"}', 2),
  ((SELECT id FROM ref_category_parameters WHERE parameter_key = 'surface_types' AND category_id = (SELECT id FROM categories WHERE name = 'Cycling')),
   'dirt', 'Dirt / Earth', '{"hu":"Földút","de":"Erdweg"}', 3),
  ((SELECT id FROM ref_category_parameters WHERE parameter_key = 'surface_types' AND category_id = (SELECT id FROM categories WHERE name = 'Cycling')),
   'singletrack', 'Singletrack', '{"hu":"Singletrack","de":"Singletrack"}', 4),
  ((SELECT id FROM ref_category_parameters WHERE parameter_key = 'surface_types' AND category_id = (SELECT id FROM categories WHERE name = 'Cycling')),
   'cobblestone', 'Cobblestone', '{"hu":"Macskaköves","de":"Kopfsteinpflaster"}', 5);

-- 2.6 Cycling — bike_type_required opciók
INSERT INTO ref_parameter_options (parameter_id, value, label, label_localized, sort_order) VALUES
  ((SELECT id FROM ref_category_parameters WHERE parameter_key = 'bike_type_required' AND category_id = (SELECT id FROM categories WHERE name = 'Cycling')),
   'road', 'Road Bike', '{"hu":"Országúti","de":"Rennrad"}', 1),
  ((SELECT id FROM ref_category_parameters WHERE parameter_key = 'bike_type_required' AND category_id = (SELECT id FROM categories WHERE name = 'Cycling')),
   'gravel', 'Gravel Bike', '{"hu":"Gravel","de":"Gravelbike"}', 2),
  ((SELECT id FROM ref_category_parameters WHERE parameter_key = 'bike_type_required' AND category_id = (SELECT id FROM categories WHERE name = 'Cycling')),
   'mtb_hardtail', 'MTB Hardtail', '{"hu":"MTB Hardtail","de":"MTB Hardtail"}', 3),
  ((SELECT id FROM ref_category_parameters WHERE parameter_key = 'bike_type_required' AND category_id = (SELECT id FROM categories WHERE name = 'Cycling')),
   'mtb_full', 'MTB Full Suspension', '{"hu":"MTB Összteleszkóp","de":"MTB Fully"}', 4),
  ((SELECT id FROM ref_category_parameters WHERE parameter_key = 'bike_type_required' AND category_id = (SELECT id FROM categories WHERE name = 'Cycling')),
   'ebike', 'E-Bike', '{"hu":"E-Bike","de":"E-Bike"}', 5),
  ((SELECT id FROM ref_category_parameters WHERE parameter_key = 'bike_type_required' AND category_id = (SELECT id FROM categories WHERE name = 'Cycling')),
   'any', 'Any Bike', '{"hu":"Bármilyen","de":"Beliebig"}', 6);

-- 2.7 Mountain — climbing_type opciók
INSERT INTO ref_parameter_options (parameter_id, value, label, label_localized, sort_order) VALUES
  ((SELECT id FROM ref_category_parameters WHERE parameter_key = 'climbing_type' AND category_id = (SELECT id FROM categories WHERE name = 'Mountain')),
   'sport', 'Sport Climbing', '{"hu":"Sportmászás","de":"Sportklettern"}', 1),
  ((SELECT id FROM ref_category_parameters WHERE parameter_key = 'climbing_type' AND category_id = (SELECT id FROM categories WHERE name = 'Mountain')),
   'trad', 'Traditional Climbing', '{"hu":"Hagyományos mászás","de":"Traditionelles Klettern"}', 2),
  ((SELECT id FROM ref_category_parameters WHERE parameter_key = 'climbing_type' AND category_id = (SELECT id FROM categories WHERE name = 'Mountain')),
   'alpine', 'Alpine Climbing', '{"hu":"Alpesi mászás","de":"Alpinklettern"}', 3),
  ((SELECT id FROM ref_category_parameters WHERE parameter_key = 'climbing_type' AND category_id = (SELECT id FROM categories WHERE name = 'Mountain')),
   'high_altitude', 'High Altitude', '{"hu":"Magaslati","de":"Höhenbergsteigen"}', 4),
  ((SELECT id FROM ref_category_parameters WHERE parameter_key = 'climbing_type' AND category_id = (SELECT id FROM categories WHERE name = 'Mountain')),
   'bouldering', 'Bouldering', '{"hu":"Boulderezés","de":"Bouldern"}', 5),
  ((SELECT id FROM ref_category_parameters WHERE parameter_key = 'climbing_type' AND category_id = (SELECT id FROM categories WHERE name = 'Mountain')),
   'ice', 'Ice Climbing', '{"hu":"Jégmászás","de":"Eisklettern"}', 6);

-- 2.8 Winter Sports — avalanche_rating opciók
INSERT INTO ref_parameter_options (parameter_id, value, label, label_localized, color_hex, sort_order) VALUES
  ((SELECT id FROM ref_category_parameters WHERE parameter_key = 'avalanche_rating' AND category_id = (SELECT id FROM categories WHERE name = 'Winter Sports')),
   '1', '1 — Low', '{"hu":"1 — Alacsony","de":"1 — Gering"}', '#22C55E', 1),
  ((SELECT id FROM ref_category_parameters WHERE parameter_key = 'avalanche_rating' AND category_id = (SELECT id FROM categories WHERE name = 'Winter Sports')),
   '2', '2 — Moderate', '{"hu":"2 — Mérsékelt","de":"2 — Mäßig"}', '#EAB308', 2),
  ((SELECT id FROM ref_category_parameters WHERE parameter_key = 'avalanche_rating' AND category_id = (SELECT id FROM categories WHERE name = 'Winter Sports')),
   '3', '3 — Considerable', '{"hu":"3 — Jelentős","de":"3 — Erheblich"}', '#F97316', 3),
  ((SELECT id FROM ref_category_parameters WHERE parameter_key = 'avalanche_rating' AND category_id = (SELECT id FROM categories WHERE name = 'Winter Sports')),
   '4', '4 — High', '{"hu":"4 — Nagy","de":"4 — Groß"}', '#EF4444', 4),
  ((SELECT id FROM ref_category_parameters WHERE parameter_key = 'avalanche_rating' AND category_id = (SELECT id FROM categories WHERE name = 'Winter Sports')),
   '5', '5 — Very High', '{"hu":"5 — Nagyon nagy","de":"5 — Sehr groß"}', '#DC2626', 5);

-- ============================================================================
-- 3. ref_safety_requirements — Biztonsági követelmények
-- ============================================================================

-- 3.1 Hiking
INSERT INTO ref_safety_requirements (category_id, name, name_localized, requirement_type, min_difficulty, is_mandatory, sort_order) VALUES
  ((SELECT id FROM categories WHERE name = 'Hiking'), 'Hiking boots', '{"hu":"Túrabakancs","de":"Wanderschuhe"}', 'gear', 1, true, 1),
  ((SELECT id FROM categories WHERE name = 'Hiking'), 'First aid kit', '{"hu":"Elsősegélycsomag","de":"Erste-Hilfe-Set"}', 'gear', 1, true, 2),
  ((SELECT id FROM categories WHERE name = 'Hiking'), 'Navigation (map/GPS)', '{"hu":"Navigáció (térkép/GPS)","de":"Navigation (Karte/GPS)"}', 'gear', 2, true, 3),
  ((SELECT id FROM categories WHERE name = 'Hiking'), 'Headlamp', '{"hu":"Fejlámpa","de":"Stirnlampe"}', 'gear', 2, true, 4),
  ((SELECT id FROM categories WHERE name = 'Hiking'), 'Emergency whistle', '{"hu":"Vészsíp","de":"Notfallpfeife"}', 'gear', 1, false, 5),
  ((SELECT id FROM categories WHERE name = 'Hiking'), 'Mountain rescue insurance', '{"hu":"Hegyi mentési biztosítás","de":"Bergrettungsversicherung"}', 'insurance', 3, true, 6);

-- 3.2 Mountain
INSERT INTO ref_safety_requirements (category_id, name, name_localized, requirement_type, min_difficulty, is_mandatory, sort_order) VALUES
  ((SELECT id FROM categories WHERE name = 'Mountain'), 'Climbing helmet', '{"hu":"Mászósisak","de":"Kletterhelm"}', 'gear', 1, true, 1),
  ((SELECT id FROM categories WHERE name = 'Mountain'), 'Harness', '{"hu":"Hevederzet","de":"Klettergurt"}', 'gear', 2, true, 2),
  ((SELECT id FROM categories WHERE name = 'Mountain'), 'Rope (min 50m)', '{"hu":"Kötél (min 50m)","de":"Seil (min 50m)"}', 'gear', 2, true, 3),
  ((SELECT id FROM categories WHERE name = 'Mountain'), 'Crampons', '{"hu":"Hágóvas","de":"Steigeisen"}', 'gear', 3, true, 4),
  ((SELECT id FROM categories WHERE name = 'Mountain'), 'Ice axe', '{"hu":"Jégcsákány","de":"Eispickel"}', 'gear', 3, true, 5),
  ((SELECT id FROM categories WHERE name = 'Mountain'), 'Crevasse rescue knowledge', '{"hu":"Repedésmentési ismeret","de":"Spaltenbergungskenntnisse"}', 'knowledge', 3, true, 6),
  ((SELECT id FROM categories WHERE name = 'Mountain'), 'Avalanche transceiver', '{"hu":"Lavinakereső","de":"LVS-Gerät"}', 'gear', 3, true, 7),
  ((SELECT id FROM categories WHERE name = 'Mountain'), 'Mountain rescue insurance', '{"hu":"Hegyi mentési biztosítás","de":"Bergrettungsversicherung"}', 'insurance', 1, true, 8),
  ((SELECT id FROM categories WHERE name = 'Mountain'), 'High altitude acclimatization', '{"hu":"Magaslati akklimatizáció","de":"Höhenakklimatisation"}', 'physical', 4, true, 9);

-- 3.3 Water Sports — Sailing
INSERT INTO ref_safety_requirements (category_id, sub_discipline_id, name, name_localized, requirement_type, min_difficulty, is_mandatory, sort_order) VALUES
  ((SELECT id FROM categories WHERE name = 'Water Sports'),
   (SELECT id FROM sub_disciplines WHERE name = 'Sailing' AND category_id = (SELECT id FROM categories WHERE name = 'Water Sports')),
   'Life jacket (per person)', '{"hu":"Mentőmellény (személyenként)","de":"Rettungsweste (pro Person)"}', 'gear', 1, true, 1),
  ((SELECT id FROM categories WHERE name = 'Water Sports'),
   (SELECT id FROM sub_disciplines WHERE name = 'Sailing' AND category_id = (SELECT id FROM categories WHERE name = 'Water Sports')),
   'Fire extinguisher', '{"hu":"Tűzoltó készülék","de":"Feuerlöscher"}', 'gear', 1, true, 2),
  ((SELECT id FROM categories WHERE name = 'Water Sports'),
   (SELECT id FROM sub_disciplines WHERE name = 'Sailing' AND category_id = (SELECT id FROM categories WHERE name = 'Water Sports')),
   'Flares (min 3)', '{"hu":"Jelzőrakéta (min 3)","de":"Leuchtmunition (min 3)"}', 'gear', 2, true, 3),
  ((SELECT id FROM categories WHERE name = 'Water Sports'),
   (SELECT id FROM sub_disciplines WHERE name = 'Sailing' AND category_id = (SELECT id FROM categories WHERE name = 'Water Sports')),
   'VHF radio', '{"hu":"VHF rádió","de":"UKW-Funkgerät"}', 'gear', 1, true, 4),
  ((SELECT id FROM categories WHERE name = 'Water Sports'),
   (SELECT id FROM sub_disciplines WHERE name = 'Sailing' AND category_id = (SELECT id FROM categories WHERE name = 'Water Sports')),
   'EPIRB / PLB', '{"hu":"EPIRB / PLB vészjelző","de":"EPIRB / PLB Notsender"}', 'gear', 3, true, 5),
  ((SELECT id FROM categories WHERE name = 'Water Sports'),
   (SELECT id FROM sub_disciplines WHERE name = 'Sailing' AND category_id = (SELECT id FROM categories WHERE name = 'Water Sports')),
   'Boat insurance', '{"hu":"Hajóbiztosítás","de":"Bootsversicherung"}', 'insurance', 1, true, 6),
  ((SELECT id FROM categories WHERE name = 'Water Sports'),
   (SELECT id FROM sub_disciplines WHERE name = 'Sailing' AND category_id = (SELECT id FROM categories WHERE name = 'Water Sports')),
   'Skipper certification', '{"hu":"Hajóvezetői képesítés","de":"Skipperzertifikat"}', 'certification', 2, true, 7);

-- 3.4 Winter Sports
INSERT INTO ref_safety_requirements (category_id, name, name_localized, requirement_type, min_difficulty, is_mandatory, sort_order) VALUES
  ((SELECT id FROM categories WHERE name = 'Winter Sports'), 'Avalanche transceiver', '{"hu":"Lavinakereső","de":"LVS-Gerät"}', 'gear', 2, true, 1),
  ((SELECT id FROM categories WHERE name = 'Winter Sports'), 'Avalanche probe', '{"hu":"Lavinaszonda","de":"Lawinensonde"}', 'gear', 2, true, 2),
  ((SELECT id FROM categories WHERE name = 'Winter Sports'), 'Avalanche shovel', '{"hu":"Lavinaásó","de":"Lawinenschaufel"}', 'gear', 2, true, 3),
  ((SELECT id FROM categories WHERE name = 'Winter Sports'), 'Ski helmet', '{"hu":"Sísisak","de":"Skihelm"}', 'gear', 1, true, 4),
  ((SELECT id FROM categories WHERE name = 'Winter Sports'), 'Avalanche safety training (AVA-1)', '{"hu":"Lavina biztonsági képzés (AVA-1)","de":"Lawinenkurs (Stufe 1)"}', 'knowledge', 2, false, 5),
  ((SELECT id FROM categories WHERE name = 'Winter Sports'), 'Mountain rescue insurance', '{"hu":"Hegyi mentési biztosítás","de":"Bergrettungsversicherung"}', 'insurance', 1, true, 6);

-- 3.5 Cycling
INSERT INTO ref_safety_requirements (category_id, name, name_localized, requirement_type, min_difficulty, is_mandatory, sort_order) VALUES
  ((SELECT id FROM categories WHERE name = 'Cycling'), 'Bicycle helmet', '{"hu":"Kerékpáros sisak","de":"Fahrradhelm"}', 'gear', 1, true, 1),
  ((SELECT id FROM categories WHERE name = 'Cycling'), 'Bike lights (front + rear)', '{"hu":"Kerékpár lámpa (első + hátsó)","de":"Fahrradlichter (vorne + hinten)"}', 'gear', 1, true, 2),
  ((SELECT id FROM categories WHERE name = 'Cycling'), 'Repair kit + spare tube', '{"hu":"Javítókészlet + tartalék belső","de":"Reparaturset + Ersatzschlauch"}', 'gear', 1, true, 3),
  ((SELECT id FROM categories WHERE name = 'Cycling'), 'High-visibility clothing', '{"hu":"Fényvisszaverő ruházat","de":"Warnkleidung"}', 'gear', 1, false, 4);

-- 3.6 Motorsport
INSERT INTO ref_safety_requirements (category_id, name, name_localized, requirement_type, min_difficulty, is_mandatory, sort_order) VALUES
  ((SELECT id FROM categories WHERE name = 'Motorsport'), 'Approved helmet', '{"hu":"Jóváhagyott sisak","de":"Zugelassener Helm"}', 'gear', 1, true, 1),
  ((SELECT id FROM categories WHERE name = 'Motorsport'), 'Body armor / protectors', '{"hu":"Protektor","de":"Protektoren"}', 'gear', 1, true, 2),
  ((SELECT id FROM categories WHERE name = 'Motorsport'), 'Riding boots', '{"hu":"Motoros csizma","de":"Motorradstiefel"}', 'gear', 1, true, 3),
  ((SELECT id FROM categories WHERE name = 'Motorsport'), 'Valid driving license', '{"hu":"Érvényes jogosítvány","de":"Gültiger Führerschein"}', 'certification', 1, true, 4),
  ((SELECT id FROM categories WHERE name = 'Motorsport'), 'Vehicle insurance', '{"hu":"Gépjármű biztosítás","de":"Fahrzeugversicherung"}', 'insurance', 1, true, 5);

COMMIT;

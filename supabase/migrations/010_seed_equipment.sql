-- ============================================================================
-- 010 — Seed Data: Equipment Categories + Equipment Catalog
-- ============================================================================
-- Modul:       M00 Reference Data
-- Sorok:       13 equipment_categories + ~120 equipment items
-- Forrás:      02_Category_Reference_Database_Design.md §3.4-3.5
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. ref_equipment_categories — 13 felszerelés típus csoport
-- ============================================================================

INSERT INTO ref_equipment_categories (name, label, label_localized, icon_name, color_hex, sort_order) VALUES
  ('clothing',       'Clothing',              '{"hu":"Ruházat","en":"Clothing","de":"Kleidung"}',                    'shirt',             '#3B82F6', 1),
  ('footwear',       'Footwear',              '{"hu":"Lábbeli","en":"Footwear","de":"Schuhwerk"}',                   'footprints',        '#8B5CF6', 2),
  ('shelter',        'Shelter & Sleep',        '{"hu":"Szállás és alvás","en":"Shelter & Sleep","de":"Unterkunft & Schlaf"}', 'tent',       '#F97316', 3),
  ('navigation',     'Navigation',            '{"hu":"Navigáció","en":"Navigation","de":"Navigation"}',              'compass',           '#0D9488', 4),
  ('safety',         'Safety & Emergency',     '{"hu":"Biztonság és elsősegély","en":"Safety & Emergency","de":"Sicherheit & Notfall"}', 'shield-alert', '#EF4444', 5),
  ('technical_gear', 'Technical Gear',         '{"hu":"Technikai felszerelés","en":"Technical Gear","de":"Technische Ausrüstung"}', 'wrench', '#6366F1', 6),
  ('food_water',     'Food & Water',           '{"hu":"Étel és víz","en":"Food & Water","de":"Essen & Wasser"}',     'cup-soda',          '#22C55E', 7),
  ('electronics',    'Electronics',            '{"hu":"Elektronika","en":"Electronics","de":"Elektronik"}',           'battery-charging',  '#EAB308', 8),
  ('documents',      'Documents & Money',      '{"hu":"Dokumentumok és pénz","en":"Documents & Money","de":"Dokumente & Geld"}', 'file-text', '#64748B', 9),
  ('vehicle',        'Vehicle & Transport',    '{"hu":"Jármű és közlekedés","en":"Vehicle & Transport","de":"Fahrzeug & Transport"}', 'car', '#78716C', 10),
  ('water_gear',     'Water Gear',             '{"hu":"Vízi felszerelés","en":"Water Gear","de":"Wasserausrüstung"}', 'anchor',            '#0EA5E9', 11),
  ('winter_gear',    'Winter Gear',            '{"hu":"Téli felszerelés","en":"Winter Gear","de":"Winterausrüstung"}','snowflake',         '#06B6D4', 12),
  ('climbing_gear',  'Climbing Gear',          '{"hu":"Mászófelszerelés","en":"Climbing Gear","de":"Kletterausrüstung"}', 'mountain',      '#F97316', 13)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 2. ref_equipment — Master felszerelés katalógus
-- ============================================================================
-- Struktúra: equipment_category → equipment item
-- is_universal = true → minden kategóriában releváns

-- ──────────────────────────────────────────────────
-- 2.1 UNIVERSAL ITEMS (minden kategóriában releváns)
-- ──────────────────────────────────────────────────

INSERT INTO ref_equipment (equipment_category_id, name, name_localized, weight_hint_g, is_rentable, is_universal, sort_order) VALUES
  -- Safety (universal)
  ((SELECT id FROM ref_equipment_categories WHERE name = 'safety'), 'First Aid Kit',
   '{"hu":"Elsősegélycsomag","en":"First Aid Kit","de":"Erste-Hilfe-Set"}', 350, false, true, 1),
  ((SELECT id FROM ref_equipment_categories WHERE name = 'safety'), 'Emergency Blanket',
   '{"hu":"Mentőfólia","en":"Emergency Blanket","de":"Rettungsdecke"}', 60, false, true, 2),
  ((SELECT id FROM ref_equipment_categories WHERE name = 'safety'), 'Whistle',
   '{"hu":"Síp","en":"Whistle","de":"Pfeife"}', 15, false, true, 3),
  ((SELECT id FROM ref_equipment_categories WHERE name = 'safety'), 'Headlamp',
   '{"hu":"Fejlámpa","en":"Headlamp","de":"Stirnlampe"}', 100, false, true, 4),
  -- Clothing (universal)
  ((SELECT id FROM ref_equipment_categories WHERE name = 'clothing'), 'Sunscreen (SPF50)',
   '{"hu":"Napvédő (SPF50)","en":"Sunscreen (SPF50)","de":"Sonnenschutz (SPF50)"}', 100, false, true, 5),
  ((SELECT id FROM ref_equipment_categories WHERE name = 'clothing'), 'Sunglasses',
   '{"hu":"Napszemüveg","en":"Sunglasses","de":"Sonnenbrille"}', 30, false, true, 6),
  ((SELECT id FROM ref_equipment_categories WHERE name = 'clothing'), 'Rain Jacket',
   '{"hu":"Esőkabát","en":"Rain Jacket","de":"Regenjacke"}', 350, false, true, 7),
  -- Food & Water (universal)
  ((SELECT id FROM ref_equipment_categories WHERE name = 'food_water'), 'Water Bottle (1L)',
   '{"hu":"Kulacs (1L)","en":"Water Bottle (1L)","de":"Trinkflasche (1L)"}', 150, false, true, 8),
  -- Documents (universal)
  ((SELECT id FROM ref_equipment_categories WHERE name = 'documents'), 'ID / Passport',
   '{"hu":"Személyi / Útlevél","en":"ID / Passport","de":"Ausweis / Reisepass"}', 30, false, true, 9),
  ((SELECT id FROM ref_equipment_categories WHERE name = 'documents'), 'Insurance Card',
   '{"hu":"Biztosítási kártya","en":"Insurance Card","de":"Versicherungskarte"}', 5, false, true, 10),
  -- Electronics (universal)
  ((SELECT id FROM ref_equipment_categories WHERE name = 'electronics'), 'Mobile Phone + Charger',
   '{"hu":"Mobiltelefon + töltő","en":"Mobile Phone + Charger","de":"Handy + Ladegerät"}', 250, false, true, 11),
  ((SELECT id FROM ref_equipment_categories WHERE name = 'electronics'), 'Power Bank',
   '{"hu":"Powerbank","en":"Power Bank","de":"Powerbank"}', 200, false, true, 12);

-- ──────────────────────────────────────────────────
-- 2.2 HIKING-SPECIFIC EQUIPMENT
-- ──────────────────────────────────────────────────

INSERT INTO ref_equipment (equipment_category_id, name, name_localized, weight_hint_g, is_rentable, is_universal, sort_order) VALUES
  ((SELECT id FROM ref_equipment_categories WHERE name = 'footwear'), 'Hiking Boots',
   '{"hu":"Túrabakancs","en":"Hiking Boots","de":"Wanderschuhe"}', 900, true, false, 1),
  ((SELECT id FROM ref_equipment_categories WHERE name = 'footwear'), 'Trail Running Shoes',
   '{"hu":"Terepfutó cipő","en":"Trail Running Shoes","de":"Trailrunningschuhe"}', 600, false, false, 2),
  ((SELECT id FROM ref_equipment_categories WHERE name = 'technical_gear'), 'Backpack (30-40L)',
   '{"hu":"Hátizsák (30-40L)","en":"Backpack (30-40L)","de":"Rucksack (30-40L)"}', 1200, true, false, 3),
  ((SELECT id FROM ref_equipment_categories WHERE name = 'technical_gear'), 'Backpack (50-70L)',
   '{"hu":"Hátizsák (50-70L)","en":"Backpack (50-70L)","de":"Rucksack (50-70L)"}', 1800, true, false, 4),
  ((SELECT id FROM ref_equipment_categories WHERE name = 'technical_gear'), 'Trekking Poles (pair)',
   '{"hu":"Trekking bot (pár)","en":"Trekking Poles (pair)","de":"Trekkingstöcke (Paar)"}', 500, true, false, 5),
  ((SELECT id FROM ref_equipment_categories WHERE name = 'navigation'), 'Map (printed)',
   '{"hu":"Térkép (nyomtatott)","en":"Map (printed)","de":"Karte (gedruckt)"}', 80, false, false, 6),
  ((SELECT id FROM ref_equipment_categories WHERE name = 'navigation'), 'GPS Device',
   '{"hu":"GPS eszköz","en":"GPS Device","de":"GPS-Gerät"}', 200, true, false, 7),
  ((SELECT id FROM ref_equipment_categories WHERE name = 'shelter'), 'Sleeping Bag (3-season)',
   '{"hu":"Hálózsák (3 évszakos)","en":"Sleeping Bag (3-season)","de":"Schlafsack (3-Jahreszeiten)"}', 1000, true, false, 8),
  ((SELECT id FROM ref_equipment_categories WHERE name = 'shelter'), 'Tent (2-person)',
   '{"hu":"Sátor (2 személyes)","en":"Tent (2-person)","de":"Zelt (2-Personen)"}', 2000, true, false, 9),
  ((SELECT id FROM ref_equipment_categories WHERE name = 'shelter'), 'Sleeping Pad',
   '{"hu":"Matrac","en":"Sleeping Pad","de":"Isomatte"}', 500, true, false, 10),
  ((SELECT id FROM ref_equipment_categories WHERE name = 'food_water'), 'Water Filter / Purifier',
   '{"hu":"Vízszűrő","en":"Water Filter / Purifier","de":"Wasserfilter"}', 200, false, false, 11),
  ((SELECT id FROM ref_equipment_categories WHERE name = 'food_water'), 'Cooking Stove + Fuel',
   '{"hu":"Főzőfej + üzemanyag","en":"Cooking Stove + Fuel","de":"Kocher + Brennstoff"}', 400, true, false, 12);

-- ──────────────────────────────────────────────────
-- 2.3 CLIMBING / MOUNTAIN EQUIPMENT
-- ──────────────────────────────────────────────────

INSERT INTO ref_equipment (equipment_category_id, name, name_localized, weight_hint_g, is_rentable, is_universal, sort_order) VALUES
  ((SELECT id FROM ref_equipment_categories WHERE name = 'climbing_gear'), 'Climbing Helmet',
   '{"hu":"Mászósisak","en":"Climbing Helmet","de":"Kletterhelm"}', 300, true, false, 1),
  ((SELECT id FROM ref_equipment_categories WHERE name = 'climbing_gear'), 'Climbing Harness',
   '{"hu":"Mászóhevederzet","en":"Climbing Harness","de":"Klettergurt"}', 400, true, false, 2),
  ((SELECT id FROM ref_equipment_categories WHERE name = 'climbing_gear'), 'Rope (60m, single)',
   '{"hu":"Kötél (60m, egyes)","en":"Rope (60m, single)","de":"Seil (60m, Einfach)"}', 3800, true, false, 3),
  ((SELECT id FROM ref_equipment_categories WHERE name = 'climbing_gear'), 'Quickdraws (set of 12)',
   '{"hu":"Expressz (12 db)","en":"Quickdraws (set of 12)","de":"Expressen (12 Stück)"}', 1000, true, false, 4),
  ((SELECT id FROM ref_equipment_categories WHERE name = 'climbing_gear'), 'Belay Device',
   '{"hu":"Biztosítóeszköz","en":"Belay Device","de":"Sicherungsgerät"}', 200, true, false, 5),
  ((SELECT id FROM ref_equipment_categories WHERE name = 'climbing_gear'), 'Carabiners (set)',
   '{"hu":"Karabinerek (készlet)","en":"Carabiners (set)","de":"Karabiner (Set)"}', 400, true, false, 6),
  ((SELECT id FROM ref_equipment_categories WHERE name = 'climbing_gear'), 'Crampons',
   '{"hu":"Hágóvas","en":"Crampons","de":"Steigeisen"}', 900, true, false, 7),
  ((SELECT id FROM ref_equipment_categories WHERE name = 'climbing_gear'), 'Ice Axe',
   '{"hu":"Jégcsákány","en":"Ice Axe","de":"Eispickel"}', 500, true, false, 8),
  ((SELECT id FROM ref_equipment_categories WHERE name = 'climbing_gear'), 'Via Ferrata Set',
   '{"hu":"Via Ferrata készlet","en":"Via Ferrata Set","de":"Klettersteigset"}', 550, true, false, 9),
  ((SELECT id FROM ref_equipment_categories WHERE name = 'climbing_gear'), 'Crash Pad (bouldering)',
   '{"hu":"Crash pad (boulderezés)","en":"Crash Pad","de":"Crashpad"}', 6000, true, false, 10),
  ((SELECT id FROM ref_equipment_categories WHERE name = 'footwear'), 'Climbing Shoes',
   '{"hu":"Mászócipő","en":"Climbing Shoes","de":"Kletterschuhe"}', 400, true, false, 11),
  ((SELECT id FROM ref_equipment_categories WHERE name = 'footwear'), 'Mountaineering Boots',
   '{"hu":"Hegymászó bakancs","en":"Mountaineering Boots","de":"Bergstiefel"}', 1400, true, false, 12);

-- ──────────────────────────────────────────────────
-- 2.4 WATER SPORTS EQUIPMENT
-- ──────────────────────────────────────────────────

INSERT INTO ref_equipment (equipment_category_id, name, name_localized, weight_hint_g, is_rentable, is_universal, sort_order) VALUES
  ((SELECT id FROM ref_equipment_categories WHERE name = 'water_gear'), 'Life Jacket / PFD',
   '{"hu":"Mentőmellény","en":"Life Jacket / PFD","de":"Rettungsweste"}', 700, true, false, 1),
  ((SELECT id FROM ref_equipment_categories WHERE name = 'water_gear'), 'Dry Bag (waterproof)',
   '{"hu":"Vízhatlan zsák","en":"Dry Bag","de":"Trockensack"}', 200, false, false, 2),
  ((SELECT id FROM ref_equipment_categories WHERE name = 'water_gear'), 'Wetsuit (3mm)',
   '{"hu":"Neoprénruha (3mm)","en":"Wetsuit (3mm)","de":"Neoprenanzug (3mm)"}', 1500, true, false, 3),
  ((SELECT id FROM ref_equipment_categories WHERE name = 'water_gear'), 'Sailing Gloves',
   '{"hu":"Vitorlás kesztyű","en":"Sailing Gloves","de":"Segelhandschuhe"}', 80, false, false, 4),
  ((SELECT id FROM ref_equipment_categories WHERE name = 'water_gear'), 'Paddle (kayak)',
   '{"hu":"Evező (kajak)","en":"Paddle (kayak)","de":"Paddel (Kajak)"}', 800, true, false, 5),
  ((SELECT id FROM ref_equipment_categories WHERE name = 'water_gear'), 'Spray Skirt (kayak)',
   '{"hu":"Szoknya (kajak)","en":"Spray Skirt","de":"Spritzdecke"}', 500, true, false, 6),
  ((SELECT id FROM ref_equipment_categories WHERE name = 'water_gear'), 'Dive Mask + Snorkel',
   '{"hu":"Búvármaszk + pipa","en":"Dive Mask + Snorkel","de":"Tauchmaske + Schnorchel"}', 350, true, false, 7),
  ((SELECT id FROM ref_equipment_categories WHERE name = 'water_gear'), 'BCD (Diving)',
   '{"hu":"Jacket (búvárkodás)","en":"BCD","de":"Tarierweste"}', 3000, true, false, 8),
  ((SELECT id FROM ref_equipment_categories WHERE name = 'water_gear'), 'Regulator + Octopus',
   '{"hu":"Automata + tartalék","en":"Regulator + Octopus","de":"Regler + Octopus"}', 1500, true, false, 9),
  ((SELECT id FROM ref_equipment_categories WHERE name = 'footwear'), 'Non-slip Boat Shoes',
   '{"hu":"Csúszásmentes hajóscipő","en":"Non-slip Boat Shoes","de":"Rutschfeste Bootsschuhe"}', 600, false, false, 13),
  ((SELECT id FROM ref_equipment_categories WHERE name = 'electronics'), 'VHF Radio (handheld)',
   '{"hu":"VHF rádió (kézi)","en":"VHF Radio (handheld)","de":"UKW-Funkgerät (Hand)"}', 300, true, false, 13),
  ((SELECT id FROM ref_equipment_categories WHERE name = 'safety'), 'EPIRB / PLB',
   '{"hu":"EPIRB / PLB vészjelző","en":"EPIRB / PLB","de":"EPIRB / PLB Notsender"}', 250, true, false, 14),
  ((SELECT id FROM ref_equipment_categories WHERE name = 'safety'), 'Flares (set of 3)',
   '{"hu":"Jelzőrakéta (3 db)","en":"Flares (set of 3)","de":"Leuchtmunition (3er Set)"}', 200, false, false, 15);

-- ──────────────────────────────────────────────────
-- 2.5 WINTER SPORTS EQUIPMENT
-- ──────────────────────────────────────────────────

INSERT INTO ref_equipment (equipment_category_id, name, name_localized, weight_hint_g, is_rentable, is_universal, sort_order) VALUES
  ((SELECT id FROM ref_equipment_categories WHERE name = 'winter_gear'), 'Avalanche Transceiver',
   '{"hu":"Lavinakereső","en":"Avalanche Transceiver","de":"LVS-Gerät"}', 250, true, false, 1),
  ((SELECT id FROM ref_equipment_categories WHERE name = 'winter_gear'), 'Avalanche Probe',
   '{"hu":"Lavinaszonda","en":"Avalanche Probe","de":"Lawinensonde"}', 300, false, false, 2),
  ((SELECT id FROM ref_equipment_categories WHERE name = 'winter_gear'), 'Avalanche Shovel',
   '{"hu":"Lavinaásó","en":"Avalanche Shovel","de":"Lawinenschaufel"}', 500, false, false, 3),
  ((SELECT id FROM ref_equipment_categories WHERE name = 'winter_gear'), 'Ski Touring Skis + Bindings',
   '{"hu":"Sítúra léc + kötés","en":"Ski Touring Skis + Bindings","de":"Tourenski + Bindung"}', 3500, true, false, 4),
  ((SELECT id FROM ref_equipment_categories WHERE name = 'winter_gear'), 'Climbing Skins',
   '{"hu":"Fóka bőr","en":"Climbing Skins","de":"Felle"}', 500, true, false, 5),
  ((SELECT id FROM ref_equipment_categories WHERE name = 'winter_gear'), 'Ski Boots (touring)',
   '{"hu":"Sícipő (túra)","en":"Ski Boots (touring)","de":"Tourenskistiefel"}', 1500, true, false, 6),
  ((SELECT id FROM ref_equipment_categories WHERE name = 'winter_gear'), 'Snowshoes',
   '{"hu":"Hótalp","en":"Snowshoes","de":"Schneeschuhe"}', 1800, true, false, 7),
  ((SELECT id FROM ref_equipment_categories WHERE name = 'safety'), 'Avalanche Airbag Pack',
   '{"hu":"Lavinahátizsák","en":"Avalanche Airbag Pack","de":"Lawinenairbag"}', 2500, true, false, 16),
  ((SELECT id FROM ref_equipment_categories WHERE name = 'clothing'), 'Ski Goggles',
   '{"hu":"Síszemüveg","en":"Ski Goggles","de":"Skibrille"}', 200, false, false, 14),
  ((SELECT id FROM ref_equipment_categories WHERE name = 'safety'), 'Ski Helmet',
   '{"hu":"Sísisak","en":"Ski Helmet","de":"Skihelm"}', 400, true, false, 17);

-- ──────────────────────────────────────────────────
-- 2.6 CYCLING EQUIPMENT
-- ──────────────────────────────────────────────────

INSERT INTO ref_equipment (equipment_category_id, name, name_localized, weight_hint_g, is_rentable, is_universal, sort_order) VALUES
  ((SELECT id FROM ref_equipment_categories WHERE name = 'technical_gear'), 'Bicycle Helmet',
   '{"hu":"Kerékpáros sisak","en":"Bicycle Helmet","de":"Fahrradhelm"}', 300, false, false, 20),
  ((SELECT id FROM ref_equipment_categories WHERE name = 'technical_gear'), 'Bike Repair Kit',
   '{"hu":"Kerékpár szerszámkészlet","en":"Bike Repair Kit","de":"Fahrrad-Reparaturset"}', 500, false, false, 21),
  ((SELECT id FROM ref_equipment_categories WHERE name = 'technical_gear'), 'Spare Inner Tube',
   '{"hu":"Tartalék belső gumi","en":"Spare Inner Tube","de":"Ersatzschlauch"}', 100, false, false, 22),
  ((SELECT id FROM ref_equipment_categories WHERE name = 'technical_gear'), 'Mini Pump',
   '{"hu":"Mini pumpa","en":"Mini Pump","de":"Minipumpe"}', 120, false, false, 23),
  ((SELECT id FROM ref_equipment_categories WHERE name = 'technical_gear'), 'Bike Lock',
   '{"hu":"Kerékpárzár","en":"Bike Lock","de":"Fahrradschloss"}', 500, false, false, 24),
  ((SELECT id FROM ref_equipment_categories WHERE name = 'clothing'), 'Cycling Jersey',
   '{"hu":"Kerékpáros mez","en":"Cycling Jersey","de":"Radtrikot"}', 150, false, false, 15),
  ((SELECT id FROM ref_equipment_categories WHERE name = 'clothing'), 'Padded Cycling Shorts',
   '{"hu":"Bélelt kerékpáros nadrág","en":"Padded Cycling Shorts","de":"Gepolsterte Radhose"}', 200, false, false, 16),
  ((SELECT id FROM ref_equipment_categories WHERE name = 'footwear'), 'Cycling Shoes (clipless)',
   '{"hu":"Kerékpáros cipő (patent)","en":"Cycling Shoes (clipless)","de":"Radschuhe (Klick)"}', 400, false, false, 14),
  ((SELECT id FROM ref_equipment_categories WHERE name = 'electronics'), 'Bike Computer / GPS',
   '{"hu":"Kerékpár computer / GPS","en":"Bike Computer / GPS","de":"Radcomputer / GPS"}', 80, false, false, 14),
  ((SELECT id FROM ref_equipment_categories WHERE name = 'safety'), 'Bike Lights (front + rear)',
   '{"hu":"Kerékpár lámpa (első + hátsó)","en":"Bike Lights (front + rear)","de":"Fahrradlichter (vorne + hinten)"}', 150, false, false, 18);

-- ──────────────────────────────────────────────────
-- 2.7 MOTORSPORT EQUIPMENT
-- ──────────────────────────────────────────────────

INSERT INTO ref_equipment (equipment_category_id, name, name_localized, weight_hint_g, is_rentable, is_universal, sort_order) VALUES
  ((SELECT id FROM ref_equipment_categories WHERE name = 'safety'), 'Motorcycle Helmet (off-road)',
   '{"hu":"Motoros sisak (terep)","en":"Motorcycle Helmet (off-road)","de":"Motorradhelm (Offroad)"}', 1400, true, false, 19),
  ((SELECT id FROM ref_equipment_categories WHERE name = 'safety'), 'Body Armor / Protector',
   '{"hu":"Protektor","en":"Body Armor / Protector","de":"Protektoren"}', 2000, true, false, 20),
  ((SELECT id FROM ref_equipment_categories WHERE name = 'clothing'), 'Riding Boots',
   '{"hu":"Motoros csizma","en":"Riding Boots","de":"Motorradstiefel"}', 2000, false, false, 17),
  ((SELECT id FROM ref_equipment_categories WHERE name = 'clothing'), 'Riding Gloves',
   '{"hu":"Motoros kesztyű","en":"Riding Gloves","de":"Motorradhandschuhe"}', 200, false, false, 18),
  ((SELECT id FROM ref_equipment_categories WHERE name = 'technical_gear'), 'Tool Kit (motorcycle)',
   '{"hu":"Szerszámkészlet (motor)","en":"Tool Kit (motorcycle)","de":"Werkzeugset (Motorrad)"}', 2000, false, false, 25),
  ((SELECT id FROM ref_equipment_categories WHERE name = 'technical_gear'), 'Tire Repair Kit (tubeless)',
   '{"hu":"Gumijavító készlet (tömlő nélküli)","en":"Tire Repair Kit (tubeless)","de":"Reifenreparaturset (tubeless)"}', 300, false, false, 26),
  ((SELECT id FROM ref_equipment_categories WHERE name = 'electronics'), 'Intercom System',
   '{"hu":"Intercom rendszer","en":"Intercom System","de":"Kommunikationssystem"}', 200, true, false, 15),
  ((SELECT id FROM ref_equipment_categories WHERE name = 'vehicle'), 'Recovery Strap',
   '{"hu":"Mentőheveder","en":"Recovery Strap","de":"Bergegurt"}', 2000, false, false, 1),
  ((SELECT id FROM ref_equipment_categories WHERE name = 'vehicle'), 'Jerry Can (fuel)',
   '{"hu":"Kanna (üzemanyag)","en":"Jerry Can (fuel)","de":"Reservekanister"}', 1500, false, false, 2);

COMMIT;

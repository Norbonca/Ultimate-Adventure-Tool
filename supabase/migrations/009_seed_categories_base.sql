-- ============================================================================
-- 009 — Seed Data: sub_disciplines, environments, experience_level_descriptions
-- ============================================================================
-- Modul:       M02 Trip Management (base reference data)
-- Sorok:       ~50 sub_disciplines + ~80 environments + 40 exp_levels = ~170 sor
-- Forrás:      02_Category_Reference_Database_Design.md §11
-- ============================================================================

BEGIN;

-- ============================================================================
-- Helper: category ID lookup by name
-- ============================================================================
-- We use subqueries (SELECT id FROM categories WHERE name = '...')
-- to reference categories by their English system name.

-- ============================================================================
-- 1. SUB_DISCIPLINES — ~50 alkategória
-- ============================================================================

-- 1.1 Hiking (6)
INSERT INTO sub_disciplines (category_id, name, name_localized, description, status, display_order) VALUES
  ((SELECT id FROM categories WHERE name = 'Hiking'), 'Day Hiking',
   '{"hu":"Egynapos túra","en":"Day Hiking","de":"Tageswanderung"}',
   'Single-day hikes on marked or unmarked trails', 'active', 1),
  ((SELECT id FROM categories WHERE name = 'Hiking'), 'Multi-day Trekking',
   '{"hu":"Többnapos túra","en":"Multi-day Trekking","de":"Mehrtagestrekking"}',
   'Multi-day backpacking trips with overnight stays', 'active', 2),
  ((SELECT id FROM categories WHERE name = 'Hiking'), 'Via Ferrata',
   '{"hu":"Via Ferrata","en":"Via Ferrata","de":"Klettersteig"}',
   'Protected climbing routes with steel cables and ladders', 'active', 3),
  ((SELECT id FROM categories WHERE name = 'Hiking'), 'Trail Running',
   '{"hu":"Terepfutás","en":"Trail Running","de":"Trailrunning"}',
   'Running on natural terrain and mountain trails', 'active', 4),
  ((SELECT id FROM categories WHERE name = 'Hiking'), 'Snowshoeing',
   '{"hu":"Hótalp túra","en":"Snowshoeing","de":"Schneeschuhwandern"}',
   'Winter hiking with snowshoes', 'active', 5),
  ((SELECT id FROM categories WHERE name = 'Hiking'), 'Nordic Walking',
   '{"hu":"Nordic Walking","en":"Nordic Walking","de":"Nordic Walking"}',
   'Walking with trekking poles for fitness', 'active', 6)
ON CONFLICT (category_id, name) DO NOTHING;

-- 1.2 Mountain (6)
INSERT INTO sub_disciplines (category_id, name, name_localized, description, status, display_order) VALUES
  ((SELECT id FROM categories WHERE name = 'Mountain'), 'Alpine Climbing',
   '{"hu":"Alpinizmus","en":"Alpine Climbing","de":"Alpinklettern"}',
   'Climbing alpine peaks requiring technical skills', 'active', 1),
  ((SELECT id FROM categories WHERE name = 'Mountain'), 'Rock Climbing',
   '{"hu":"Sziklamászás","en":"Rock Climbing","de":"Felsklettern"}',
   'Sport and trad climbing on natural rock', 'active', 2),
  ((SELECT id FROM categories WHERE name = 'Mountain'), 'Bouldering',
   '{"hu":"Boulderezés","en":"Bouldering","de":"Bouldern"}',
   'Short, powerful climbs without ropes', 'active', 3),
  ((SELECT id FROM categories WHERE name = 'Mountain'), 'Mountaineering',
   '{"hu":"Hegymászás","en":"Mountaineering","de":"Bergsteigen"}',
   'High-altitude mountaineering and peak ascents', 'active', 4),
  ((SELECT id FROM categories WHERE name = 'Mountain'), 'Scrambling',
   '{"hu":"Sziklamászás (könnyű)","en":"Scrambling","de":"Kraxeln"}',
   'Non-technical ridge and rock scrambling', 'active', 5),
  ((SELECT id FROM categories WHERE name = 'Mountain'), 'Ice Climbing',
   '{"hu":"Jégmászás","en":"Ice Climbing","de":"Eisklettern"}',
   'Climbing frozen waterfalls and ice formations', 'active', 6)
ON CONFLICT (category_id, name) DO NOTHING;

-- 1.3 Water Sports (7)
INSERT INTO sub_disciplines (category_id, name, name_localized, description, status, display_order) VALUES
  ((SELECT id FROM categories WHERE name = 'Water Sports'), 'Sailing',
   '{"hu":"Vitorlázás","en":"Sailing","de":"Segeln"}',
   'Sailing on lakes, rivers, and open sea', 'active', 1),
  ((SELECT id FROM categories WHERE name = 'Water Sports'), 'Kayaking',
   '{"hu":"Kajakozás","en":"Kayaking","de":"Kajakfahren"}',
   'Kayaking on rivers, lakes and sea', 'active', 2),
  ((SELECT id FROM categories WHERE name = 'Water Sports'), 'Surfing',
   '{"hu":"Szörfözés","en":"Surfing","de":"Surfen"}',
   'Wave surfing in the ocean', 'active', 3),
  ((SELECT id FROM categories WHERE name = 'Water Sports'), 'Diving',
   '{"hu":"Búvárkodás","en":"Diving","de":"Tauchen"}',
   'Scuba diving and freediving', 'active', 4),
  ((SELECT id FROM categories WHERE name = 'Water Sports'), 'Kitesurfing',
   '{"hu":"Kitesurf","en":"Kitesurfing","de":"Kitesurfen"}',
   'Wind-powered board riding with kite', 'active', 5),
  ((SELECT id FROM categories WHERE name = 'Water Sports'), 'Rafting',
   '{"hu":"Rafting","en":"Rafting","de":"Rafting"}',
   'Whitewater rafting on rivers', 'active', 6),
  ((SELECT id FROM categories WHERE name = 'Water Sports'), 'SUP',
   '{"hu":"SUP","en":"Stand Up Paddleboarding","de":"Stand Up Paddling"}',
   'Stand up paddleboarding', 'active', 7)
ON CONFLICT (category_id, name) DO NOTHING;

-- 1.4 Cycling (6)
INSERT INTO sub_disciplines (category_id, name, name_localized, description, status, display_order) VALUES
  ((SELECT id FROM categories WHERE name = 'Cycling'), 'Road Cycling',
   '{"hu":"Országúti kerékpár","en":"Road Cycling","de":"Rennradfahren"}',
   'Road cycling on paved surfaces', 'active', 1),
  ((SELECT id FROM categories WHERE name = 'Cycling'), 'Gravel / Adventure',
   '{"hu":"Gravel / Kalandkerékpár","en":"Gravel / Adventure","de":"Gravel / Abenteuerrad"}',
   'Mixed terrain cycling on gravel bikes', 'active', 2),
  ((SELECT id FROM categories WHERE name = 'Cycling'), 'Mountain Biking (XC)',
   '{"hu":"Hegyi kerékpár (XC)","en":"Mountain Biking (XC)","de":"Mountainbike (XC)"}',
   'Cross-country mountain biking', 'active', 3),
  ((SELECT id FROM categories WHERE name = 'Cycling'), 'Mountain Biking (Enduro)',
   '{"hu":"Hegyi kerékpár (Enduro)","en":"Mountain Biking (Enduro)","de":"Mountainbike (Enduro)"}',
   'Enduro and downhill mountain biking', 'active', 4),
  ((SELECT id FROM categories WHERE name = 'Cycling'), 'Bikepacking',
   '{"hu":"Bikepacking","en":"Bikepacking","de":"Bikepacking"}',
   'Multi-day cycling with camping gear', 'active', 5),
  ((SELECT id FROM categories WHERE name = 'Cycling'), 'E-Bike Touring',
   '{"hu":"E-bike túrázás","en":"E-Bike Touring","de":"E-Bike Touren"}',
   'Touring with electric-assist bicycles', 'active', 6)
ON CONFLICT (category_id, name) DO NOTHING;

-- 1.5 Running (4)
INSERT INTO sub_disciplines (category_id, name, name_localized, description, status, display_order) VALUES
  ((SELECT id FROM categories WHERE name = 'Running'), 'Trail Running',
   '{"hu":"Terepfutás","en":"Trail Running","de":"Trailrunning"}',
   'Running on natural terrain', 'active', 1),
  ((SELECT id FROM categories WHERE name = 'Running'), 'Ultra Running',
   '{"hu":"Ultrafutás","en":"Ultra Running","de":"Ultralauf"}',
   'Extreme distance running (50km+)', 'active', 2),
  ((SELECT id FROM categories WHERE name = 'Running'), 'Road Running',
   '{"hu":"Közúti futás","en":"Road Running","de":"Straßenlauf"}',
   'Road races and marathon running', 'active', 3),
  ((SELECT id FROM categories WHERE name = 'Running'), 'Obstacle Racing',
   '{"hu":"Akadályfutás","en":"Obstacle Racing","de":"Hindernislauf"}',
   'Obstacle course racing (OCR)', 'active', 4)
ON CONFLICT (category_id, name) DO NOTHING;

-- 1.6 Winter Sports (5)
INSERT INTO sub_disciplines (category_id, name, name_localized, description, status, display_order) VALUES
  ((SELECT id FROM categories WHERE name = 'Winter Sports'), 'Ski Touring',
   '{"hu":"Sítúra","en":"Ski Touring","de":"Skitouren"}',
   'Backcountry skiing with uphill skinning', 'active', 1),
  ((SELECT id FROM categories WHERE name = 'Winter Sports'), 'Freeride Skiing',
   '{"hu":"Freeride síelés","en":"Freeride Skiing","de":"Freeriden"}',
   'Off-piste skiing in ungroomed terrain', 'active', 2),
  ((SELECT id FROM categories WHERE name = 'Winter Sports'), 'Snowshoeing',
   '{"hu":"Hótalp túra","en":"Snowshoeing","de":"Schneeschuhwandern"}',
   'Winter hiking with snowshoes in deep snow', 'active', 3),
  ((SELECT id FROM categories WHERE name = 'Winter Sports'), 'Backcountry Snowboarding',
   '{"hu":"Backcountry snowboard","en":"Backcountry Snowboarding","de":"Backcountry Snowboarden"}',
   'Off-piste snowboarding in backcountry', 'active', 4),
  ((SELECT id FROM categories WHERE name = 'Winter Sports'), 'Cross-Country Skiing',
   '{"hu":"Sífutás","en":"Cross-Country Skiing","de":"Langlauf"}',
   'Nordic/cross-country skiing on groomed tracks', 'active', 5)
ON CONFLICT (category_id, name) DO NOTHING;

-- 1.7 Expedition (3)
INSERT INTO sub_disciplines (category_id, name, name_localized, description, status, display_order) VALUES
  ((SELECT id FROM categories WHERE name = 'Expedition'), 'Wilderness Trekking',
   '{"hu":"Vadon túra","en":"Wilderness Trekking","de":"Wildnistrekking"}',
   'Multi-day trekking in remote wilderness areas', 'active', 1),
  ((SELECT id FROM categories WHERE name = 'Expedition'), 'Polar Expedition',
   '{"hu":"Sarki expedíció","en":"Polar Expedition","de":"Polarexpedition"}',
   'Arctic or Antarctic expeditions', 'active', 2),
  ((SELECT id FROM categories WHERE name = 'Expedition'), 'Desert Crossing',
   '{"hu":"Sivatagi átkelés","en":"Desert Crossing","de":"Wüstendurchquerung"}',
   'Desert traversals and multi-day desert trips', 'active', 3)
ON CONFLICT (category_id, name) DO NOTHING;

-- 1.8 Motorsport (5)
INSERT INTO sub_disciplines (category_id, name, name_localized, description, status, display_order) VALUES
  ((SELECT id FROM categories WHERE name = 'Motorsport'), 'Motorcycle Touring',
   '{"hu":"Motoros túra","en":"Motorcycle Touring","de":"Motorradtouren"}',
   'Long-distance motorcycle touring on roads', 'active', 1),
  ((SELECT id FROM categories WHERE name = 'Motorsport'), 'Enduro',
   '{"hu":"Enduro","en":"Enduro","de":"Enduro"}',
   'Off-road motorcycle enduro riding', 'active', 2),
  ((SELECT id FROM categories WHERE name = 'Motorsport'), 'Off-road 4x4',
   '{"hu":"Terepjáró 4x4","en":"Off-road 4x4","de":"Offroad 4x4"}',
   '4x4 off-road driving and overlanding', 'active', 3),
  ((SELECT id FROM categories WHERE name = 'Motorsport'), 'Rally',
   '{"hu":"Rali","en":"Rally","de":"Rallye"}',
   'Rally driving and navigation events', 'active', 4),
  ((SELECT id FROM categories WHERE name = 'Motorsport'), 'Quad / ATV',
   '{"hu":"Quad / ATV","en":"Quad / ATV","de":"Quad / ATV"}',
   'All-terrain vehicle riding', 'active', 5)
ON CONFLICT (category_id, name) DO NOTHING;

-- ============================================================================
-- 2. ENVIRONMENTS — ~80 tereptípus
-- ============================================================================
-- Environments are linked to sub_disciplines

-- 2.1 Hiking environments
INSERT INTO environments (sub_discipline_id, name, name_localized, sort_order) VALUES
  ((SELECT id FROM sub_disciplines WHERE name = 'Day Hiking' AND category_id = (SELECT id FROM categories WHERE name = 'Hiking')),
   'Forest Trail', '{"hu":"Erdei ösvény","en":"Forest Trail","de":"Waldweg"}', 1),
  ((SELECT id FROM sub_disciplines WHERE name = 'Day Hiking' AND category_id = (SELECT id FROM categories WHERE name = 'Hiking')),
   'Alpine Meadow', '{"hu":"Alpesi rét","en":"Alpine Meadow","de":"Almwiese"}', 2),
  ((SELECT id FROM sub_disciplines WHERE name = 'Day Hiking' AND category_id = (SELECT id FROM categories WHERE name = 'Hiking')),
   'Rocky Terrain', '{"hu":"Sziklás terep","en":"Rocky Terrain","de":"Felsgelände"}', 3),
  ((SELECT id FROM sub_disciplines WHERE name = 'Day Hiking' AND category_id = (SELECT id FROM categories WHERE name = 'Hiking')),
   'Coastal Path', '{"hu":"Tengerparti ösvény","en":"Coastal Path","de":"Küstenpfad"}', 4),
  ((SELECT id FROM sub_disciplines WHERE name = 'Day Hiking' AND category_id = (SELECT id FROM categories WHERE name = 'Hiking')),
   'River Valley', '{"hu":"Folyóvölgy","en":"River Valley","de":"Flusstal"}', 5),

  ((SELECT id FROM sub_disciplines WHERE name = 'Multi-day Trekking' AND category_id = (SELECT id FROM categories WHERE name = 'Hiking')),
   'High Mountain', '{"hu":"Magashegység","en":"High Mountain","de":"Hochgebirge"}', 1),
  ((SELECT id FROM sub_disciplines WHERE name = 'Multi-day Trekking' AND category_id = (SELECT id FROM categories WHERE name = 'Hiking')),
   'Remote Wilderness', '{"hu":"Távoli vadon","en":"Remote Wilderness","de":"Abgelegene Wildnis"}', 2),
  ((SELECT id FROM sub_disciplines WHERE name = 'Multi-day Trekking' AND category_id = (SELECT id FROM categories WHERE name = 'Hiking')),
   'Hut-to-Hut Route', '{"hu":"Menedékház túra","en":"Hut-to-Hut Route","de":"Hüttentour"}', 3),
  ((SELECT id FROM sub_disciplines WHERE name = 'Multi-day Trekking' AND category_id = (SELECT id FROM categories WHERE name = 'Hiking')),
   'Desert Trail', '{"hu":"Sivatagi ösvény","en":"Desert Trail","de":"Wüstenpfad"}', 4),

  ((SELECT id FROM sub_disciplines WHERE name = 'Via Ferrata' AND category_id = (SELECT id FROM categories WHERE name = 'Hiking')),
   'Limestone Cliff', '{"hu":"Mészkőszirt","en":"Limestone Cliff","de":"Kalksteinfels"}', 1),
  ((SELECT id FROM sub_disciplines WHERE name = 'Via Ferrata' AND category_id = (SELECT id FROM categories WHERE name = 'Hiking')),
   'Dolomite Rock', '{"hu":"Dolomit szikla","en":"Dolomite Rock","de":"Dolomitfels"}', 2),
  ((SELECT id FROM sub_disciplines WHERE name = 'Via Ferrata' AND category_id = (SELECT id FROM categories WHERE name = 'Hiking')),
   'Gorge / Canyon', '{"hu":"Szurdok / Kanyon","en":"Gorge / Canyon","de":"Schlucht / Klamm"}', 3);

-- 2.2 Mountain environments
INSERT INTO environments (sub_discipline_id, name, name_localized, sort_order) VALUES
  ((SELECT id FROM sub_disciplines WHERE name = 'Alpine Climbing' AND category_id = (SELECT id FROM categories WHERE name = 'Mountain')),
   'Granite Face', '{"hu":"Gránit fal","en":"Granite Face","de":"Granitwand"}', 1),
  ((SELECT id FROM sub_disciplines WHERE name = 'Alpine Climbing' AND category_id = (SELECT id FROM categories WHERE name = 'Mountain')),
   'Mixed Terrain (Rock + Ice)', '{"hu":"Vegyes terep (szikla + jég)","en":"Mixed Terrain (Rock + Ice)","de":"Mischgelände"}', 2),
  ((SELECT id FROM sub_disciplines WHERE name = 'Alpine Climbing' AND category_id = (SELECT id FROM categories WHERE name = 'Mountain')),
   'Snow & Glacier', '{"hu":"Hó és gleccser","en":"Snow & Glacier","de":"Schnee und Gletscher"}', 3),

  ((SELECT id FROM sub_disciplines WHERE name = 'Rock Climbing' AND category_id = (SELECT id FROM categories WHERE name = 'Mountain')),
   'Sport Crag', '{"hu":"Sportmászó fal","en":"Sport Crag","de":"Sportkletterfels"}', 1),
  ((SELECT id FROM sub_disciplines WHERE name = 'Rock Climbing' AND category_id = (SELECT id FROM categories WHERE name = 'Mountain')),
   'Multi-pitch Wall', '{"hu":"Többkötélhossz fal","en":"Multi-pitch Wall","de":"Mehrseillänge"}', 2),
  ((SELECT id FROM sub_disciplines WHERE name = 'Rock Climbing' AND category_id = (SELECT id FROM categories WHERE name = 'Mountain')),
   'Sandstone Tower', '{"hu":"Homokkő torony","en":"Sandstone Tower","de":"Sandsteinturm"}', 3),

  ((SELECT id FROM sub_disciplines WHERE name = 'Bouldering' AND category_id = (SELECT id FROM categories WHERE name = 'Mountain')),
   'Forest Boulder', '{"hu":"Erdei boulder","en":"Forest Boulder","de":"Waldboulder"}', 1),
  ((SELECT id FROM sub_disciplines WHERE name = 'Bouldering' AND category_id = (SELECT id FROM categories WHERE name = 'Mountain')),
   'Riverside Boulder', '{"hu":"Folyóparti boulder","en":"Riverside Boulder","de":"Flussboulder"}', 2);

-- 2.3 Water Sports environments
INSERT INTO environments (sub_discipline_id, name, name_localized, sort_order) VALUES
  ((SELECT id FROM sub_disciplines WHERE name = 'Sailing' AND category_id = (SELECT id FROM categories WHERE name = 'Water Sports')),
   'Open Sea', '{"hu":"Nyílt tenger","en":"Open Sea","de":"Offenes Meer"}', 1),
  ((SELECT id FROM sub_disciplines WHERE name = 'Sailing' AND category_id = (SELECT id FROM categories WHERE name = 'Water Sports')),
   'Coastal Waters', '{"hu":"Parti vizek","en":"Coastal Waters","de":"Küstengewässer"}', 2),
  ((SELECT id FROM sub_disciplines WHERE name = 'Sailing' AND category_id = (SELECT id FROM categories WHERE name = 'Water Sports')),
   'Lake', '{"hu":"Tó","en":"Lake","de":"See"}', 3),
  ((SELECT id FROM sub_disciplines WHERE name = 'Sailing' AND category_id = (SELECT id FROM categories WHERE name = 'Water Sports')),
   'Island Archipelago', '{"hu":"Szigetvilág","en":"Island Archipelago","de":"Inselarchipel"}', 4),

  ((SELECT id FROM sub_disciplines WHERE name = 'Kayaking' AND category_id = (SELECT id FROM categories WHERE name = 'Water Sports')),
   'Whitewater River', '{"hu":"Vadvízi folyó","en":"Whitewater River","de":"Wildwasserfluss"}', 1),
  ((SELECT id FROM sub_disciplines WHERE name = 'Kayaking' AND category_id = (SELECT id FROM categories WHERE name = 'Water Sports')),
   'Flatwater Lake', '{"hu":"Állóvízi tó","en":"Flatwater Lake","de":"Flachwassersee"}', 2),
  ((SELECT id FROM sub_disciplines WHERE name = 'Kayaking' AND category_id = (SELECT id FROM categories WHERE name = 'Water Sports')),
   'Sea Kayaking Coast', '{"hu":"Tengeri kajak part","en":"Sea Kayaking Coast","de":"Seekajakküste"}', 3),

  ((SELECT id FROM sub_disciplines WHERE name = 'Diving' AND category_id = (SELECT id FROM categories WHERE name = 'Water Sports')),
   'Coral Reef', '{"hu":"Korallzátony","en":"Coral Reef","de":"Korallenriff"}', 1),
  ((SELECT id FROM sub_disciplines WHERE name = 'Diving' AND category_id = (SELECT id FROM categories WHERE name = 'Water Sports')),
   'Wreck Dive', '{"hu":"Roncsmerülés","en":"Wreck Dive","de":"Wracktauchen"}', 2),
  ((SELECT id FROM sub_disciplines WHERE name = 'Diving' AND category_id = (SELECT id FROM categories WHERE name = 'Water Sports')),
   'Cave / Cenote', '{"hu":"Barlang / Cenote","en":"Cave / Cenote","de":"Höhle / Cenote"}', 3),
  ((SELECT id FROM sub_disciplines WHERE name = 'Diving' AND category_id = (SELECT id FROM categories WHERE name = 'Water Sports')),
   'Lake Dive', '{"hu":"Tavi merülés","en":"Lake Dive","de":"Seetauchen"}', 4);

-- 2.4 Cycling environments
INSERT INTO environments (sub_discipline_id, name, name_localized, sort_order) VALUES
  ((SELECT id FROM sub_disciplines WHERE name = 'Road Cycling' AND category_id = (SELECT id FROM categories WHERE name = 'Cycling')),
   'Mountain Pass', '{"hu":"Hegyi hágó","en":"Mountain Pass","de":"Bergpass"}', 1),
  ((SELECT id FROM sub_disciplines WHERE name = 'Road Cycling' AND category_id = (SELECT id FROM categories WHERE name = 'Cycling')),
   'Coastal Road', '{"hu":"Tengerparti út","en":"Coastal Road","de":"Küstenstraße"}', 2),
  ((SELECT id FROM sub_disciplines WHERE name = 'Road Cycling' AND category_id = (SELECT id FROM categories WHERE name = 'Cycling')),
   'Flat Countryside', '{"hu":"Sík vidék","en":"Flat Countryside","de":"Flachland"}', 3),

  ((SELECT id FROM sub_disciplines WHERE name = 'Mountain Biking (XC)' AND category_id = (SELECT id FROM categories WHERE name = 'Cycling')),
   'Singletrack Forest', '{"hu":"Erdei singletrack","en":"Singletrack Forest","de":"Singletrack Wald"}', 1),
  ((SELECT id FROM sub_disciplines WHERE name = 'Mountain Biking (XC)' AND category_id = (SELECT id FROM categories WHERE name = 'Cycling')),
   'Alpine Singletrack', '{"hu":"Alpesi singletrack","en":"Alpine Singletrack","de":"Alpiner Singletrack"}', 2),

  ((SELECT id FROM sub_disciplines WHERE name = 'Mountain Biking (Enduro)' AND category_id = (SELECT id FROM categories WHERE name = 'Cycling')),
   'Bike Park', '{"hu":"Bike Park","en":"Bike Park","de":"Bikepark"}', 1),
  ((SELECT id FROM sub_disciplines WHERE name = 'Mountain Biking (Enduro)' AND category_id = (SELECT id FROM categories WHERE name = 'Cycling')),
   'Natural Enduro Trail', '{"hu":"Természetes enduro pálya","en":"Natural Enduro Trail","de":"Natürlicher Enduro Trail"}', 2);

-- 2.5 Winter Sports environments
INSERT INTO environments (sub_discipline_id, name, name_localized, sort_order) VALUES
  ((SELECT id FROM sub_disciplines WHERE name = 'Ski Touring' AND category_id = (SELECT id FROM categories WHERE name = 'Winter Sports')),
   'Open Slope', '{"hu":"Nyílt hegyoldal","en":"Open Slope","de":"Offener Hang"}', 1),
  ((SELECT id FROM sub_disciplines WHERE name = 'Ski Touring' AND category_id = (SELECT id FROM categories WHERE name = 'Winter Sports')),
   'Forest Glade', '{"hu":"Erdei tisztás","en":"Forest Glade","de":"Waldlichtung"}', 2),
  ((SELECT id FROM sub_disciplines WHERE name = 'Ski Touring' AND category_id = (SELECT id FROM categories WHERE name = 'Winter Sports')),
   'Glacier', '{"hu":"Gleccser","en":"Glacier","de":"Gletscher"}', 3),
  ((SELECT id FROM sub_disciplines WHERE name = 'Ski Touring' AND category_id = (SELECT id FROM categories WHERE name = 'Winter Sports')),
   'Couloir', '{"hu":"Couloir / Vályú","en":"Couloir","de":"Couloir / Rinne"}', 4),

  ((SELECT id FROM sub_disciplines WHERE name = 'Freeride Skiing' AND category_id = (SELECT id FROM categories WHERE name = 'Winter Sports')),
   'Powder Bowl', '{"hu":"Porfeltöltés","en":"Powder Bowl","de":"Pulverschüssel"}', 1),
  ((SELECT id FROM sub_disciplines WHERE name = 'Freeride Skiing' AND category_id = (SELECT id FROM categories WHERE name = 'Winter Sports')),
   'Steep Chute', '{"hu":"Meredek csatorna","en":"Steep Chute","de":"Steile Rinne"}', 2);

-- ============================================================================
-- 3. EXPERIENCE_LEVEL_DESCRIPTIONS — 8 kategória × 5 szint = 40 sor
-- ============================================================================

-- 3.1 Hiking
INSERT INTO experience_level_descriptions (category_id, level, label, description, description_localized) VALUES
  ((SELECT id FROM categories WHERE name = 'Hiking'), 1, 'Beginner',
   'Comfortable on well-marked trails up to 10km. Can handle gentle elevation changes.',
   '{"hu":"Jelölt ösvényeken 10 km-ig kényelmesen mozog. Enyhe szintkülönbségeket kezel."}'),
  ((SELECT id FROM categories WHERE name = 'Hiking'), 2, 'Intermediate',
   'Handles 15-25km days with 500-1000m elevation gain. Comfortable with basic navigation.',
   '{"hu":"15-25 km-es napokat 500-1000 m szintkülönbséggel teljesít. Alapszintű navigáció."}'),
  ((SELECT id FROM categories WHERE name = 'Hiking'), 3, 'Advanced',
   'Multi-day treks, 25-35km days, 1000-1500m elevation. Via Ferrata K1-K3. Off-trail navigation.',
   '{"hu":"Többnapos túrák, 25-35 km/nap, 1000-1500 m szint. Via Ferrata K1-K3. Terepen navigál."}'),
  ((SELECT id FROM categories WHERE name = 'Hiking'), 4, 'Expert',
   'Alpine T4-T5 terrain, via ferrata K4-K5, 35km+ days, extreme weather conditions, technical self-rescue.',
   '{"hu":"T4-T5 alpesi terep, K4-K5 via ferrata, 35+ km/nap, szélsőséges időjárás, technikai önmentés."}'),
  ((SELECT id FROM categories WHERE name = 'Hiking'), 5, 'Elite',
   'T6 alpine hiking, K6 via ferrata, expedition-level multi-week treks, winter alpine conditions.',
   '{"hu":"T6 alpesi túra, K6 via ferrata, expedíciós többhetes túrák, téli alpesi viszonyok."}')
ON CONFLICT (category_id, level) DO NOTHING;

-- 3.2 Mountain
INSERT INTO experience_level_descriptions (category_id, level, label, description, description_localized) VALUES
  ((SELECT id FROM categories WHERE name = 'Mountain'), 1, 'Beginner',
   'Indoor climbing experience. Comfortable with UIAA I-II. Basic belay skills.',
   '{"hu":"Terem mászó tapasztalat. UIAA I-II. Alapszintű biztosítás."}'),
  ((SELECT id FROM categories WHERE name = 'Mountain'), 2, 'Intermediate',
   'UIAA III-IV outdoor. Multi-pitch experience. Basic alpine skills. Abseil confident.',
   '{"hu":"UIAA III-IV szabadban. Többkötélhossz tapasztalat. Alapszintű alpesi készségek."}'),
  ((SELECT id FROM categories WHERE name = 'Mountain'), 3, 'Advanced',
   'UIAA V-VI. AD-D alpine grade. Glacier travel. Crevasse rescue training. Self-sufficient.',
   '{"hu":"UIAA V-VI. AD-D alpesi fok. Gleccserjárás. Repedésmentési képzés. Önellátó."}'),
  ((SELECT id FROM categories WHERE name = 'Mountain'), 4, 'Expert',
   'UIAA VII+. TD-ED alpine. High altitude (5000m+). Winter alpine. Expedition experience.',
   '{"hu":"UIAA VII+. TD-ED alpesi. Magaslati (5000m+). Téli alpesi. Expedíciós tapasztalat."}'),
  ((SELECT id FROM categories WHERE name = 'Mountain'), 5, 'Elite',
   'UIAA VIII+. 8000m+ peaks. First ascents. Professional mountain guide level.',
   '{"hu":"UIAA VIII+. 8000m+ csúcsok. Első megmászások. Profi hegyi vezető szint."}')
ON CONFLICT (category_id, level) DO NOTHING;

-- 3.3 Water Sports
INSERT INTO experience_level_descriptions (category_id, level, label, description, description_localized) VALUES
  ((SELECT id FROM categories WHERE name = 'Water Sports'), 1, 'Beginner',
   'Basic swimming ability. Flatwater kayaking/SUP. Supervised sailing. Pool diving.',
   '{"hu":"Alapszintű úszás. Állóvízi kajakozás/SUP. Felügyelt vitorlázás. Medencei búvárkodás."}'),
  ((SELECT id FROM categories WHERE name = 'Water Sports'), 2, 'Intermediate',
   'WW II kayaking. Day Skipper sailing. Open Water Diver. Can handle moderate conditions.',
   '{"hu":"WW II kajakozás. Day Skipper vitorlázás. OWD búvárkodás. Mérsékelt körülmények."}'),
  ((SELECT id FROM categories WHERE name = 'Water Sports'), 3, 'Advanced',
   'WW III-IV kayaking. Coastal Skipper. Advanced diver. Night sailing. BF5-6 conditions.',
   '{"hu":"WW III-IV kajakozás. Coastal Skipper. Haladó búvár. Éjszakai vitorlázás. BF5-6."}'),
  ((SELECT id FROM categories WHERE name = 'Water Sports'), 4, 'Expert',
   'WW V. Yachtmaster. Divemaster. Solo ocean crossings. Storm management.',
   '{"hu":"WW V. Yachtmaster. Divemaster. Egyedüli óceán-átkelés. Viharkezelés."}'),
  ((SELECT id FROM categories WHERE name = 'Water Sports'), 5, 'Elite',
   'WW VI. Yachtmaster Ocean. Instructor level. Extreme conditions specialist.',
   '{"hu":"WW VI. Yachtmaster Ocean. Oktatói szint. Extrém körülmények specialista."}')
ON CONFLICT (category_id, level) DO NOTHING;

-- 3.4 Cycling
INSERT INTO experience_level_descriptions (category_id, level, label, description, description_localized) VALUES
  ((SELECT id FROM categories WHERE name = 'Cycling'), 1, 'Beginner',
   'Comfortable riding 30-50km on flat terrain. Basic bike handling.',
   '{"hu":"30-50 km sík terepen kényelmesen tekert. Alapszintű kerékpár kezelés."}'),
  ((SELECT id FROM categories WHERE name = 'Cycling'), 2, 'Intermediate',
   '50-100km rides. 500-1000m climbing. Basic group riding skills. Light off-road.',
   '{"hu":"50-100 km túrák. 500-1000 m emelkedő. Alapszintű csoportos tekerés. Könnyű terep."}'),
  ((SELECT id FROM categories WHERE name = 'Cycling'), 3, 'Advanced',
   '100-150km+ rides. 1500m+ climbing. Technical MTB S1-S2. Multi-day bikepacking.',
   '{"hu":"100-150+ km túrák. 1500+ m emelkedő. Technikai MTB S1-S2. Többnapos bikepacking."}'),
  ((SELECT id FROM categories WHERE name = 'Cycling'), 4, 'Expert',
   '200km+ days. Mountain passes. MTB S3-S4 singletrack. Self-supported multi-week tours.',
   '{"hu":"200+ km/nap. Hegyi hágók. MTB S3-S4 singletrack. Önellátó többhetes túrák."}'),
  ((SELECT id FROM categories WHERE name = 'Cycling'), 5, 'Elite',
   'Ultra-endurance (300km+). MTB S5. Professional-level performance. Extreme conditions.',
   '{"hu":"Ultra-állóképesség (300+ km). MTB S5. Profi szintű teljesítmény. Extrém körülmények."}')
ON CONFLICT (category_id, level) DO NOTHING;

-- 3.5 Running
INSERT INTO experience_level_descriptions (category_id, level, label, description, description_localized) VALUES
  ((SELECT id FROM categories WHERE name = 'Running'), 1, 'Beginner',
   'Comfortable running 5-10km. Smooth terrain preferred. 6-7 min/km pace.',
   '{"hu":"5-10 km kényelmes futás. Sima terep. 6-7 perc/km tempó."}'),
  ((SELECT id FROM categories WHERE name = 'Running'), 2, 'Intermediate',
   '10-21km distances. Trail running on easy terrain. 500m elevation gain manageable.',
   '{"hu":"10-21 km táv. Terepfutás könnyű terepen. 500 m szintkülönbség kezelhető."}'),
  ((SELECT id FROM categories WHERE name = 'Running'), 3, 'Advanced',
   'Half to full marathon. Trail 21-50km. 1000m+ elevation. Technical terrain confident.',
   '{"hu":"Félmaraton-maraton. Terep 21-50 km. 1000+ m szint. Technikai terepen magabiztos."}'),
  ((SELECT id FROM categories WHERE name = 'Running'), 4, 'Expert',
   'Ultra distances 50-100km. 2000m+ elevation. Mountain ultra experience. Night running.',
   '{"hu":"Ultra távok 50-100 km. 2000+ m szint. Hegyi ultra tapasztalat. Éjszakai futás."}'),
  ((SELECT id FROM categories WHERE name = 'Running'), 5, 'Elite',
   '100km+ ultra. Multi-day stage races. 100-mile finisher. UTMB-level events.',
   '{"hu":"100+ km ultra. Többnapos etapversenyek. 100 mérföldes befutó. UTMB-szintű versenyek."}')
ON CONFLICT (category_id, level) DO NOTHING;

-- 3.6 Winter Sports
INSERT INTO experience_level_descriptions (category_id, level, label, description, description_localized) VALUES
  ((SELECT id FROM categories WHERE name = 'Winter Sports'), 1, 'Beginner',
   'Can ski/snowboard on blue runs. Basic avalanche awareness. Snowshoeing on marked trails.',
   '{"hu":"Kék pályán síel/snowboardozik. Alapszintű lavinaismeret. Hótalp jelölt ösvényen."}'),
  ((SELECT id FROM categories WHERE name = 'Winter Sports'), 2, 'Intermediate',
   'Red runs confident. Basic ski touring (S1-S2). AVA-1 trained. Off-piste in good conditions.',
   '{"hu":"Piros pálya magabiztos. Alap sítúra (S1-S2). AVA-1 képzés. Off-piste jó viszonyok közt."}'),
  ((SELECT id FROM categories WHERE name = 'Winter Sports'), 3, 'Advanced',
   'Black runs and steep terrain. Ski touring S3. AVA-2. Moderate avalanche terrain management.',
   '{"hu":"Fekete pálya és meredek terep. Sítúra S3. AVA-2. Mérsékelt lavinaterep kezelés."}'),
  ((SELECT id FROM categories WHERE name = 'Winter Sports'), 4, 'Expert',
   'Extreme terrain. Ski touring S4-S5. Couloir skiing. Complex avalanche assessment.',
   '{"hu":"Extrém terep. Sítúra S4-S5. Couloir síelés. Komplex lavinaértékelés."}'),
  ((SELECT id FROM categories WHERE name = 'Winter Sports'), 5, 'Elite',
   'First descents. Himalayan ski mountaineering. Professional avalanche forecaster level.',
   '{"hu":"Első leereszkedések. Himalájai sí-hegymászás. Profi lavinaelőrejelző szint."}')
ON CONFLICT (category_id, level) DO NOTHING;

-- 3.7 Expedition
INSERT INTO experience_level_descriptions (category_id, level, label, description, description_localized) VALUES
  ((SELECT id FROM categories WHERE name = 'Expedition'), 1, 'Beginner',
   'Multi-day camping experience. Comfortable with basic outdoor skills. Guided expeditions.',
   '{"hu":"Többnapos kempingezés. Alapszintű szabadtéri készségek. Vezetett expedíciók."}'),
  ((SELECT id FROM categories WHERE name = 'Expedition'), 2, 'Intermediate',
   '1-2 week wilderness trips. Basic survival skills. Navigation confident. Self-sufficient.',
   '{"hu":"1-2 hetes vadon túrák. Alap túlélési készségek. Navigáció. Önellátó."}'),
  ((SELECT id FROM categories WHERE name = 'Expedition'), 3, 'Advanced',
   'Multi-week remote expeditions. Emergency management. Extreme weather coping. Team leadership.',
   '{"hu":"Többhetes távoli expedíciók. Vészhelyzetkezelés. Extrém időjárás. Csapatvezetés."}'),
  ((SELECT id FROM categories WHERE name = 'Expedition'), 4, 'Expert',
   'Polar/desert/jungle expeditions. High altitude experience. Complex logistics management.',
   '{"hu":"Sarki/sivatagi/dzsungel expedíciók. Magaslati tapasztalat. Komplex logisztika."}'),
  ((SELECT id FROM categories WHERE name = 'Expedition'), 5, 'Elite',
   'First explorations. Extreme environment specialist. Multi-month unsupported journeys.',
   '{"hu":"Első feltárások. Extrém környezet specialista. Többhónapos segítség nélküli utak."}')
ON CONFLICT (category_id, level) DO NOTHING;

-- 3.8 Motorsport
INSERT INTO experience_level_descriptions (category_id, level, label, description, description_localized) VALUES
  ((SELECT id FROM categories WHERE name = 'Motorsport'), 1, 'Beginner',
   'Valid driving/motorcycle license. Road touring experience. Paved roads only.',
   '{"hu":"Érvényes jogosítvány. Közúti túra tapasztalat. Csak aszfalt."}'),
  ((SELECT id FROM categories WHERE name = 'Motorsport'), 2, 'Intermediate',
   'Off-road basics. Easy gravel roads. Group riding skills. Basic bike maintenance.',
   '{"hu":"Terep alapok. Könnyű kavicsos utak. Csoportos motorozás. Alap karbantartás."}'),
  ((SELECT id FROM categories WHERE name = 'Motorsport'), 3, 'Advanced',
   'Technical off-road. Enduro trails. Multi-day rallies. Vehicle recovery skills.',
   '{"hu":"Technikai terep. Enduro ösvények. Többnapos ralik. Járműmentési készségek."}'),
  ((SELECT id FROM categories WHERE name = 'Motorsport'), 4, 'Expert',
   'Extreme off-road. Competition enduro. Rally navigation. Remote area expeditions.',
   '{"hu":"Extrém terep. Verseny enduro. Rali navigáció. Távoli területi expedíciók."}'),
  ((SELECT id FROM categories WHERE name = 'Motorsport'), 5, 'Elite',
   'Dakar-level rally. Extreme expedition riding. Professional off-road instructor.',
   '{"hu":"Dakar-szintű rali. Extrém expedíciós motorozás. Profi terep oktató."}')
ON CONFLICT (category_id, level) DO NOTHING;

COMMIT;

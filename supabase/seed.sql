-- ============================================================================
-- SEED DATA — Lokális fejlesztéshez
-- ============================================================================
-- Ez a fájl automatikusan lefut minden `supabase db reset` után.
-- SOHA NE FUTTASD PRODUCTION-ÖN!
-- ============================================================================

-- ============================================================================
-- 1. TESZT USEREK (auth.users + profiles + privacy)
-- ============================================================================
-- A handle_new_user() trigger automatikusan létrehozza a profiles + privacy rekordokat.
-- Ezért közvetlenül az auth.users táblába szúrunk be.

-- Teszt user 1: Norbert (admin/organizer)
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, recovery_token,
  email_change_token_new, email_change
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'a1111111-1111-1111-1111-111111111111',
  'authenticated', 'authenticated',
  'norbert@test.local',
  crypt('test1234', gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Juráncsik Norbert","first_name":"Norbert","last_name":"Juráncsik"}',
  NOW(), NOW(), '', '', '', ''
);

INSERT INTO auth.identities (
  id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
) VALUES (
  'a1111111-1111-1111-1111-111111111111',
  'a1111111-1111-1111-1111-111111111111',
  jsonb_build_object('sub', 'a1111111-1111-1111-1111-111111111111', 'email', 'norbert@test.local'),
  'email',
  'a1111111-1111-1111-1111-111111111111',
  NOW(), NOW(), NOW()
);

-- Teszt user 2: Anna (organizer)
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, recovery_token,
  email_change_token_new, email_change
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'b2222222-2222-2222-2222-222222222222',
  'authenticated', 'authenticated',
  'anna@test.local',
  crypt('test1234', gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Kovács Anna","first_name":"Anna","last_name":"Kovács"}',
  NOW(), NOW(), '', '', '', ''
);

INSERT INTO auth.identities (
  id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
) VALUES (
  'b2222222-2222-2222-2222-222222222222',
  'b2222222-2222-2222-2222-222222222222',
  jsonb_build_object('sub', 'b2222222-2222-2222-2222-222222222222', 'email', 'anna@test.local'),
  'email',
  'b2222222-2222-2222-2222-222222222222',
  NOW(), NOW(), NOW()
);

-- Teszt user 3: Péter (résztvevő)
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, recovery_token,
  email_change_token_new, email_change
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'c3333333-3333-3333-3333-333333333333',
  'authenticated', 'authenticated',
  'peter@test.local',
  crypt('test1234', gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Nagy Péter","first_name":"Péter","last_name":"Nagy"}',
  NOW(), NOW(), '', '', '', ''
);

INSERT INTO auth.identities (
  id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
) VALUES (
  'c3333333-3333-3333-3333-333333333333',
  'c3333333-3333-3333-3333-333333333333',
  jsonb_build_object('sub', 'c3333333-3333-3333-3333-333333333333', 'email', 'peter@test.local'),
  'email',
  'c3333333-3333-3333-3333-333333333333',
  NOW(), NOW(), NOW()
);

-- ============================================================================
-- 2. PROFIL KIEGÉSZÍTÉSEK (ami a trigger nem állít be)
-- ============================================================================

-- Norbert: verified organizer
UPDATE profiles SET
  verified_organizer = true,
  subscription_tier = 'pro',
  bio = 'Kalandtúra szervező és lelkes hegymászó. 10+ éve szervezek túrákat a Kárpát-medencében.',
  location_city = 'Budapest',
  country_code = 'HU',
  reputation_points = 250,
  reputation_level = 3
WHERE id = 'a1111111-1111-1111-1111-111111111111';

-- Anna: aktív szervező
UPDATE profiles SET
  bio = 'Vitorlás instruktor és vízi sport rajongó. Minden nyáron az Adrián.',
  location_city = 'Győr',
  country_code = 'HU',
  reputation_points = 180,
  reputation_level = 2
WHERE id = 'b2222222-2222-2222-2222-222222222222';

-- Péter: résztvevő
UPDATE profiles SET
  bio = 'Kezdő túrázó, szeretem a természetet. Nyitott vagyok új kalandokra!',
  location_city = 'Debrecen',
  country_code = 'HU',
  reputation_points = 40,
  reputation_level = 1
WHERE id = 'c3333333-3333-3333-3333-333333333333';

-- ============================================================================
-- 3. TESZT TRIPEK (6 db, különböző kategóriák, published)
-- ============================================================================

-- Trip 1: Hiking — Kéktúra hétvége
INSERT INTO trips (
  id, organizer_id, category_id, sub_discipline_id,
  title, slug, short_description, description,
  start_date, end_date,
  location_country, location_region, location_city,
  max_participants, min_participants, current_participants,
  difficulty, price_amount, price_currency, is_cost_sharing,
  visibility, status, published_at,
  category_details
) VALUES (
  'dd111111-1111-1111-1111-111111111111',
  'a1111111-1111-1111-1111-111111111111',
  (SELECT id FROM categories WHERE name = 'Hiking'),
  (SELECT id FROM sub_disciplines WHERE name = 'Multi-day Trekking' LIMIT 1),
  'Kéktúra hétvége — Mátra szakasz',
  'kektura-hetvege-matra',
  'Két napos túra a Kéktúra Mátra szakaszán, Kékestetővel.',
  'Gyere velünk a Kéktúra egyik legszebb szakaszára! Szombaton Mátraházáról indulunk a Kékestetőre, majd tovább Galyatetőig. Vasárnap Galyatetőről Sirokig megyünk, csodálatos kilátásokkal. Szállás a Galyatető turistaházban. Jó kondíció szükséges, napi 15-20 km.',
  (CURRENT_DATE + INTERVAL '14 days')::DATE,
  (CURRENT_DATE + INTERVAL '15 days')::DATE,
  'HU', 'Heves', 'Mátraháza',
  12, 4, 3,
  3, 15000, 'HUF', true,
  'public', 'published', NOW() - INTERVAL '2 days',
  '{"elevation_gain": 1200, "total_distance": 35, "trail_type": "marked"}'
);

-- Trip 2: Water Sports — Split vitorlás túra (ÉLES OLDALRÓL MÁSOLVA)
INSERT INTO trips (
  id, organizer_id, category_id, sub_discipline_id,
  title, slug, short_description, description,
  start_date, end_date,
  location_country, location_region, location_city,
  max_participants, min_participants, current_participants,
  difficulty, price_amount, price_currency, is_cost_sharing,
  visibility, status, published_at,
  category_details
) VALUES (
  'dd222222-2222-2222-2222-222222222222',
  'a1111111-1111-1111-1111-111111111111',
  (SELECT id FROM categories WHERE name = 'Water Sports'),
  NULL,
  'Split vitorlás túra',
  'split-vitorlas-tura',
  'Egy hetes laza túra a Split régióban',
  'Egy kényelmes hét vitorlázással, strandolással, városnézéssel, remek éttermekkel. Splitből indulunk és a környező szigeteket járjuk be. Nincs szükség vitorlás tapasztalatra, a kapitány mindent megmutat!',
  '2026-06-13',
  '2026-06-20',
  'HR', 'Split', 'Split',
  8, 4, 0,
  1, NULL, 'EUR', true,
  'public', 'published', NOW() - INTERVAL '5 days',
  '{"boat_type": "sailboat", "crew_experience_needed": false}'
);

-- Trip 3: Cycling — Dunakanyar gravel
INSERT INTO trips (
  id, organizer_id, category_id, sub_discipline_id,
  title, slug, short_description, description,
  start_date, end_date,
  location_country, location_region, location_city,
  max_participants, min_participants, current_participants,
  difficulty, price_amount, price_currency, is_cost_sharing,
  visibility, status, published_at,
  category_details
) VALUES (
  'dd333333-3333-3333-3333-333333333333',
  'a1111111-1111-1111-1111-111111111111',
  (SELECT id FROM categories WHERE name = 'Cycling'),
  NULL,
  'Dunakanyar Gravel — Visegrád kör',
  'dunakanyar-gravel-visegrad',
  'Egynapos gravel túra a Dunakanyarban, festői tájakkal.',
  'Budapestről vonattal Nagymarosra, onnan kompon Visegrádra, majd gravel utakon Esztergomig. Visszaút vonattal. Összesen 65 km, változatos terep: erdei utak, makadám, kis aszfalt. Gravel vagy MTB bike szükséges. Tempó: közepes, fotó megállókkal.',
  (CURRENT_DATE + INTERVAL '7 days')::DATE,
  (CURRENT_DATE + INTERVAL '7 days')::DATE,
  'HU', 'Pest', 'Visegrád',
  15, 3, 6,
  2, NULL, 'HUF', true,
  'public', 'published', NOW() - INTERVAL '1 day',
  '{"total_distance": 65, "elevation_gain": 800, "bike_type": "gravel"}'
);

-- Trip 4: Winter Sports — Zillertal freeride
INSERT INTO trips (
  id, organizer_id, category_id, sub_discipline_id,
  title, slug, short_description, description,
  start_date, end_date,
  location_country, location_region, location_city,
  max_participants, min_participants, current_participants,
  difficulty, price_amount, price_currency, is_cost_sharing,
  visibility, status, published_at,
  category_details
) VALUES (
  'dd444444-4444-4444-4444-444444444444',
  'a1111111-1111-1111-1111-111111111111',
  (SELECT id FROM categories WHERE name = 'Winter Sports'),
  NULL,
  'Zillertal Freeride hét',
  'zillertal-freeride-het',
  'Freeride síelés az Alpokban, tapasztalt síelőknek.',
  'Öt nap freeride síelés a Zillertal Arénában. Helyi hegyi vezető kísér minket a legjobb off-piste vonalakra. Lavinaveszély oktatás az első napon. Szállás penzióban, félpanzió. Lavinakészlet (ABS hátizsák, szonda, lapát) kötelező — kölcsönözhető helyben.',
  (CURRENT_DATE + INTERVAL '300 days')::DATE,
  (CURRENT_DATE + INTERVAL '305 days')::DATE,
  'AT', 'Tirol', 'Mayrhofen',
  6, 3, 1,
  4, 890, 'EUR', false,
  'public', 'published', NOW() - INTERVAL '3 days',
  '{"snow_type": "powder", "avalanche_training": true}'
);

-- Trip 5: Mountaineering — Karpát expedíció
INSERT INTO trips (
  id, organizer_id, category_id, sub_discipline_id,
  title, slug, short_description, description,
  start_date, end_date,
  location_country, location_region, location_city,
  max_participants, min_participants, current_participants,
  difficulty, price_amount, price_currency, is_cost_sharing,
  visibility, status, published_at,
  category_details
) VALUES (
  'dd555555-5555-5555-5555-555555555555',
  'b2222222-2222-2222-2222-222222222222',
  (SELECT id FROM categories WHERE name = 'Mountain'),
  NULL,
  'Fogarasi-havasok csúcstúra',
  'fogarasi-havasok-csuctura',
  'Háromnapos magashegyi túra a Fogarasi-havasokban, Moldoveanu csúccsal.',
  'Románia legmagasabb csúcsára, a Moldoveanu-ra (2544m) mászunk fel a klasszikus gerincúton. Három nap, két éjszaka menedékházban. Előzetes magashegyi tapasztalat ajánlott. A túra vezetője UIAGM hegyi vezető.',
  (CURRENT_DATE + INTERVAL '60 days')::DATE,
  (CURRENT_DATE + INTERVAL '62 days')::DATE,
  'RO', 'Argeș', 'Curtea de Argeș',
  8, 3, 4,
  4, 180, 'EUR', false,
  'public', 'published', NOW() - INTERVAL '7 days',
  '{"max_altitude": 2544, "technical_grade": "PD"}'
);

-- Trip 6: Running — Velebit Ultra
INSERT INTO trips (
  id, organizer_id, category_id, sub_discipline_id,
  title, slug, short_description, description,
  start_date, end_date,
  location_country, location_region, location_city,
  max_participants, min_participants, current_participants,
  difficulty, price_amount, price_currency, is_cost_sharing,
  visibility, status, published_at,
  category_details
) VALUES (
  'dd666666-6666-6666-6666-666666666666',
  'a1111111-1111-1111-1111-111111111111',
  (SELECT id FROM categories WHERE name = 'Running'),
  NULL,
  'Velebit Ultra Trail — 100K',
  'velebit-ultra-trail-100k',
  'Ultramaraton a horvát Velebit hegységben. Csak tapasztalt futóknak!',
  '100 km-es terepfutó verseny a Velebit Nemzeti Parkban. 5000 méter szintemelkedés, 30 órás időlimit. Frissítő pontok 10 km-enként. Kötelező felszerelés lista a regisztrációnál. Előzetes ultra tapasztalat (min. 50K befejezés) szükséges.',
  (CURRENT_DATE + INTERVAL '90 days')::DATE,
  (CURRENT_DATE + INTERVAL '91 days')::DATE,
  'HR', 'Lika-Senj', 'Gospić',
  50, 10, 22,
  5, 120, 'EUR', false,
  'public', 'published', NOW() - INTERVAL '14 days',
  '{"distance_km": 100, "elevation_gain": 5000, "time_limit_hours": 30}'
);

-- ============================================================================
-- 4. TESZT RÉSZTVEVŐK
-- ============================================================================

-- Péter jelentkezett a Kéktúrára és a Gravel túrára
INSERT INTO trip_participants (trip_id, user_id, status, applied_at, approved_at) VALUES
  ('dd111111-1111-1111-1111-111111111111', 'c3333333-3333-3333-3333-333333333333', 'approved', NOW(), NOW()),
  ('dd333333-3333-3333-3333-333333333333', 'c3333333-3333-3333-3333-333333333333', 'approved', NOW(), NOW());

-- Anna résztvevő a Gravel túrán
INSERT INTO trip_participants (trip_id, user_id, status, applied_at, approved_at) VALUES
  ('dd333333-3333-3333-3333-333333333333', 'b2222222-2222-2222-2222-222222222222', 'approved', NOW(), NOW());

-- ============================================================================
-- TESZT FIÓKOK ÖSSZEFOGLALÓ
-- ============================================================================
-- Email                  | Jelszó    | Név               | Szerep
-- norbert@test.local     | test1234  | Juráncsik Norbert | Pro organizer
-- anna@test.local        | test1234  | Kovács Anna       | Organizer
-- peter@test.local       | test1234  | Nagy Péter        | Résztvevő
-- ============================================================================

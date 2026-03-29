-- ============================================================================
-- 011 — Seed Data: Grading Systems + Grading Levels + Certifications
-- ============================================================================
-- Modul:       M00 Reference Data
-- Sorok:       ~15 grading_systems + ~60 grading_levels + ~35 certifications
-- Forrás:      02_Category_Reference_Database_Design.md §3.7-3.9 + §11
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. ref_grading_systems — Nehézségi skálák per sport
-- ============================================================================

-- Hiking
INSERT INTO ref_grading_systems (category_id, sub_discipline_id, name, name_localized, abbreviation, description, is_primary, region, sort_order) VALUES
  ((SELECT id FROM categories WHERE name = 'Hiking'), NULL,
   'SAC Hiking Scale', '{"hu":"SAC Túra Skála","en":"SAC Hiking Scale","de":"SAC-Wanderskala"}',
   'SAC', 'Swiss Alpine Club hiking difficulty scale (T1-T6)', true, 'Europe', 1),
  ((SELECT id FROM categories WHERE name = 'Hiking'),
   (SELECT id FROM sub_disciplines WHERE name = 'Via Ferrata' AND category_id = (SELECT id FROM categories WHERE name = 'Hiking')),
   'Via Ferrata Scale', '{"hu":"Via Ferrata Skála","en":"Via Ferrata Scale","de":"Klettersteigskala"}',
   'K', 'Klettersteig difficulty scale (K1-K6)', false, 'Europe', 2)
ON CONFLICT (category_id, name) DO NOTHING;

-- Mountain
INSERT INTO ref_grading_systems (category_id, sub_discipline_id, name, name_localized, abbreviation, description, is_primary, region, sort_order) VALUES
  ((SELECT id FROM categories WHERE name = 'Mountain'), NULL,
   'UIAA Scale', '{"hu":"UIAA Skála","en":"UIAA Scale","de":"UIAA-Skala"}',
   'UIAA', 'International climbing difficulty scale (I-XII)', true, 'International', 1),
  ((SELECT id FROM categories WHERE name = 'Mountain'), NULL,
   'French Alpine Grade', '{"hu":"Francia alpesi fok","en":"French Alpine Grade","de":"Französische Alpingrad"}',
   'FR', 'French alpine grading system (F-ED)', false, 'Europe', 2),
  ((SELECT id FROM categories WHERE name = 'Mountain'),
   (SELECT id FROM sub_disciplines WHERE name = 'Ice Climbing' AND category_id = (SELECT id FROM categories WHERE name = 'Mountain')),
   'Water Ice Scale', '{"hu":"Vízjég Skála","en":"Water Ice Scale","de":"Wasser-Eis-Skala"}',
   'WI', 'Water ice climbing grades (WI1-WI7)', false, 'International', 3),
  ((SELECT id FROM categories WHERE name = 'Mountain'),
   (SELECT id FROM sub_disciplines WHERE name = 'Bouldering' AND category_id = (SELECT id FROM categories WHERE name = 'Mountain')),
   'Font Scale', '{"hu":"Font Skála","en":"Font Scale","de":"Font-Skala"}',
   'Font', 'Fontainebleau bouldering grades (4-8C+)', false, 'International', 4)
ON CONFLICT (category_id, name) DO NOTHING;

-- Water Sports
INSERT INTO ref_grading_systems (category_id, sub_discipline_id, name, name_localized, abbreviation, description, is_primary, region, sort_order) VALUES
  ((SELECT id FROM categories WHERE name = 'Water Sports'),
   (SELECT id FROM sub_disciplines WHERE name = 'Kayaking' AND category_id = (SELECT id FROM categories WHERE name = 'Water Sports')),
   'Whitewater Scale', '{"hu":"Vadvíz Skála","en":"Whitewater Scale","de":"Wildwasserskala"}',
   'WW', 'International whitewater difficulty scale (WW I-VI)', true, 'International', 1),
  ((SELECT id FROM categories WHERE name = 'Water Sports'),
   (SELECT id FROM sub_disciplines WHERE name = 'Sailing' AND category_id = (SELECT id FROM categories WHERE name = 'Water Sports')),
   'Beaufort Scale', '{"hu":"Beaufort Skála","en":"Beaufort Scale","de":"Beaufort-Skala"}',
   'BF', 'Wind force scale for sailing conditions (BF0-BF12)', false, 'International', 2)
ON CONFLICT (category_id, name) DO NOTHING;

-- Cycling
INSERT INTO ref_grading_systems (category_id, sub_discipline_id, name, name_localized, abbreviation, description, is_primary, region, sort_order) VALUES
  ((SELECT id FROM categories WHERE name = 'Cycling'),
   (SELECT id FROM sub_disciplines WHERE name = 'Mountain Biking (XC)' AND category_id = (SELECT id FROM categories WHERE name = 'Cycling')),
   'Singletrack Scale', '{"hu":"Singletrack Skála","en":"Singletrack Scale","de":"Singletrailskala"}',
   'S', 'Mountain bike singletrack difficulty (S0-S5)', true, 'Europe', 1)
ON CONFLICT (category_id, name) DO NOTHING;

-- Winter Sports
INSERT INTO ref_grading_systems (category_id, sub_discipline_id, name, name_localized, abbreviation, description, is_primary, region, sort_order) VALUES
  ((SELECT id FROM categories WHERE name = 'Winter Sports'),
   (SELECT id FROM sub_disciplines WHERE name = 'Ski Touring' AND category_id = (SELECT id FROM categories WHERE name = 'Winter Sports')),
   'Ski Touring Scale', '{"hu":"Sítúra Skála","en":"Ski Touring Scale","de":"Skitourenskala"}',
   'ST', 'Ski mountaineering difficulty (S1-S6)', true, 'Europe', 1),
  ((SELECT id FROM categories WHERE name = 'Winter Sports'), NULL,
   'European Avalanche Scale', '{"hu":"Európai Lavina Skála","en":"European Avalanche Scale","de":"Europäische Lawinengefahrenskala"}',
   'AVA', 'Avalanche danger levels (1-5)', false, 'Europe', 2)
ON CONFLICT (category_id, name) DO NOTHING;

-- Running
INSERT INTO ref_grading_systems (category_id, sub_discipline_id, name, name_localized, abbreviation, description, is_primary, region, sort_order) VALUES
  ((SELECT id FROM categories WHERE name = 'Running'), NULL,
   'ITRA Effort Points', '{"hu":"ITRA Erőfeszítés Pont","en":"ITRA Effort Points","de":"ITRA-Leistungspunkte"}',
   'ITRA', 'International Trail Running Association effort scale', true, 'International', 1)
ON CONFLICT (category_id, name) DO NOTHING;

-- ============================================================================
-- 2. ref_grading_levels — Fokozatok per grading rendszer
-- ============================================================================

-- 2.1 SAC Hiking Scale (T1-T6)
INSERT INTO ref_grading_levels (grading_system_id, grade_value, grade_label, grade_label_localized, difficulty_min, difficulty_max, color_hex, sort_order) VALUES
  ((SELECT id FROM ref_grading_systems WHERE abbreviation = 'SAC'), 'T1', 'Hiking (Wandern)',
   '{"hu":"Túrázás","de":"Wandern"}', 1, 1, '#22C55E', 1),
  ((SELECT id FROM ref_grading_systems WHERE abbreviation = 'SAC'), 'T2', 'Mountain Hiking (Bergwandern)',
   '{"hu":"Hegyi túra","de":"Bergwandern"}', 1, 2, '#22C55E', 2),
  ((SELECT id FROM ref_grading_systems WHERE abbreviation = 'SAC'), 'T3', 'Demanding Mountain Hiking',
   '{"hu":"Igényes hegyi túra","de":"Anspruchsvolles Bergwandern"}', 2, 3, '#EAB308', 3),
  ((SELECT id FROM ref_grading_systems WHERE abbreviation = 'SAC'), 'T4', 'Alpine Hiking',
   '{"hu":"Alpesi túra","de":"Alpinwandern"}', 3, 4, '#F97316', 4),
  ((SELECT id FROM ref_grading_systems WHERE abbreviation = 'SAC'), 'T5', 'Demanding Alpine Hiking',
   '{"hu":"Igényes alpesi túra","de":"Anspruchsvolles Alpinwandern"}', 4, 4, '#EF4444', 5),
  ((SELECT id FROM ref_grading_systems WHERE abbreviation = 'SAC'), 'T6', 'Difficult Alpine Hiking',
   '{"hu":"Nehéz alpesi túra","de":"Schwieriges Alpinwandern"}', 4, 5, '#DC2626', 6);

-- 2.2 Via Ferrata Scale (K1-K6)
INSERT INTO ref_grading_levels (grading_system_id, grade_value, grade_label, grade_label_localized, difficulty_min, difficulty_max, color_hex, sort_order) VALUES
  ((SELECT id FROM ref_grading_systems WHERE abbreviation = 'K'), 'K1', 'Easy',
   '{"hu":"Könnyű","de":"Leicht"}', 1, 1, '#22C55E', 1),
  ((SELECT id FROM ref_grading_systems WHERE abbreviation = 'K'), 'K2', 'Moderate',
   '{"hu":"Közepes","de":"Mäßig schwierig"}', 2, 2, '#84CC16', 2),
  ((SELECT id FROM ref_grading_systems WHERE abbreviation = 'K'), 'K3', 'Fairly Difficult',
   '{"hu":"Mérsékelten nehéz","de":"Ziemlich schwierig"}', 2, 3, '#EAB308', 3),
  ((SELECT id FROM ref_grading_systems WHERE abbreviation = 'K'), 'K4', 'Difficult',
   '{"hu":"Nehéz","de":"Schwierig"}', 3, 4, '#F97316', 4),
  ((SELECT id FROM ref_grading_systems WHERE abbreviation = 'K'), 'K5', 'Very Difficult',
   '{"hu":"Nagyon nehéz","de":"Sehr schwierig"}', 4, 5, '#EF4444', 5),
  ((SELECT id FROM ref_grading_systems WHERE abbreviation = 'K'), 'K6', 'Extremely Difficult',
   '{"hu":"Rendkívül nehéz","de":"Extrem schwierig"}', 5, 5, '#DC2626', 6);

-- 2.3 UIAA Scale (I-VII+)
INSERT INTO ref_grading_levels (grading_system_id, grade_value, grade_label, grade_label_localized, difficulty_min, difficulty_max, color_hex, sort_order) VALUES
  ((SELECT id FROM ref_grading_systems WHERE abbreviation = 'UIAA' AND category_id = (SELECT id FROM categories WHERE name = 'Mountain')), 'I', 'Easy (Leicht)',
   '{"hu":"Könnyű","de":"Leicht"}', 1, 1, '#22C55E', 1),
  ((SELECT id FROM ref_grading_systems WHERE abbreviation = 'UIAA' AND category_id = (SELECT id FROM categories WHERE name = 'Mountain')), 'II', 'Moderate (Mäßig schwierig)',
   '{"hu":"Közepes","de":"Mäßig schwierig"}', 1, 2, '#22C55E', 2),
  ((SELECT id FROM ref_grading_systems WHERE abbreviation = 'UIAA' AND category_id = (SELECT id FROM categories WHERE name = 'Mountain')), 'III', 'Somewhat Difficult',
   '{"hu":"Mérsékelten nehéz","de":"Ziemlich schwierig"}', 2, 2, '#EAB308', 3),
  ((SELECT id FROM ref_grading_systems WHERE abbreviation = 'UIAA' AND category_id = (SELECT id FROM categories WHERE name = 'Mountain')), 'IV', 'Difficult (Schwierig)',
   '{"hu":"Nehéz","de":"Schwierig"}', 3, 3, '#F97316', 4),
  ((SELECT id FROM ref_grading_systems WHERE abbreviation = 'UIAA' AND category_id = (SELECT id FROM categories WHERE name = 'Mountain')), 'V', 'Very Difficult',
   '{"hu":"Nagyon nehéz","de":"Sehr schwierig"}', 3, 4, '#F97316', 5),
  ((SELECT id FROM ref_grading_systems WHERE abbreviation = 'UIAA' AND category_id = (SELECT id FROM categories WHERE name = 'Mountain')), 'VI', 'Extremely Difficult',
   '{"hu":"Rendkívül nehéz","de":"Extrem schwierig"}', 4, 5, '#EF4444', 6),
  ((SELECT id FROM ref_grading_systems WHERE abbreviation = 'UIAA' AND category_id = (SELECT id FROM categories WHERE name = 'Mountain')), 'VII+', 'Elite (Überextrem)',
   '{"hu":"Elit","de":"Überextrem"}', 5, 5, '#DC2626', 7);

-- 2.4 French Alpine Grade (F-ED)
INSERT INTO ref_grading_levels (grading_system_id, grade_value, grade_label, grade_label_localized, difficulty_min, difficulty_max, color_hex, sort_order) VALUES
  ((SELECT id FROM ref_grading_systems WHERE abbreviation = 'FR'), 'F', 'Facile (Easy)',
   '{"hu":"Könnyű","de":"Leicht"}', 1, 1, '#22C55E', 1),
  ((SELECT id FROM ref_grading_systems WHERE abbreviation = 'FR'), 'PD', 'Peu Difficile',
   '{"hu":"Nem nagyon nehéz","de":"Wenig schwierig"}', 2, 2, '#84CC16', 2),
  ((SELECT id FROM ref_grading_systems WHERE abbreviation = 'FR'), 'AD', 'Assez Difficile',
   '{"hu":"Eléggé nehéz","de":"Ziemlich schwierig"}', 3, 3, '#EAB308', 3),
  ((SELECT id FROM ref_grading_systems WHERE abbreviation = 'FR'), 'D', 'Difficile (Hard)',
   '{"hu":"Nehéz","de":"Schwierig"}', 3, 4, '#F97316', 4),
  ((SELECT id FROM ref_grading_systems WHERE abbreviation = 'FR'), 'TD', 'Très Difficile',
   '{"hu":"Nagyon nehéz","de":"Sehr schwierig"}', 4, 5, '#EF4444', 5),
  ((SELECT id FROM ref_grading_systems WHERE abbreviation = 'FR'), 'ED', 'Extrêmement Difficile',
   '{"hu":"Rendkívül nehéz","de":"Extrem schwierig"}', 5, 5, '#DC2626', 6);

-- 2.5 Whitewater Scale (WW I-VI)
INSERT INTO ref_grading_levels (grading_system_id, grade_value, grade_label, grade_label_localized, difficulty_min, difficulty_max, color_hex, sort_order) VALUES
  ((SELECT id FROM ref_grading_systems WHERE abbreviation = 'WW'), 'WW I', 'Easy — gentle flow',
   '{"hu":"Könnyű — enyhe áramlás","de":"Leicht — sanfte Strömung"}', 1, 1, '#22C55E', 1),
  ((SELECT id FROM ref_grading_systems WHERE abbreviation = 'WW'), 'WW II', 'Novice — wide channels, some rapids',
   '{"hu":"Kezdő — széles medrek, némi sellő","de":"Anfänger — breite Kanäle, einige Stromschnellen"}', 1, 2, '#84CC16', 2),
  ((SELECT id FROM ref_grading_systems WHERE abbreviation = 'WW'), 'WW III', 'Intermediate — irregular waves, strong eddies',
   '{"hu":"Haladó — szabálytalan hullámok, erős örvények","de":"Fortgeschritten — unregelmäßige Wellen"}', 2, 3, '#EAB308', 3),
  ((SELECT id FROM ref_grading_systems WHERE abbreviation = 'WW'), 'WW IV', 'Advanced — powerful, continuous rapids',
   '{"hu":"Tapasztalt — erős, folyamatos sellők","de":"Erfahren — kraftvolle, kontinuierliche Stromschnellen"}', 3, 4, '#F97316', 4),
  ((SELECT id FROM ref_grading_systems WHERE abbreviation = 'WW'), 'WW V', 'Expert — violent rapids',
   '{"hu":"Szakértő — heves sellők","de":"Experte — heftige Stromschnellen"}', 4, 5, '#EF4444', 5),
  ((SELECT id FROM ref_grading_systems WHERE abbreviation = 'WW'), 'WW VI', 'Extreme — nearly impossible',
   '{"hu":"Extrém — szinte lehetetlen","de":"Extrem — fast unmöglich"}', 5, 5, '#DC2626', 6);

-- 2.6 Singletrack Scale (S0-S5)
INSERT INTO ref_grading_levels (grading_system_id, grade_value, grade_label, grade_label_localized, difficulty_min, difficulty_max, color_hex, sort_order) VALUES
  ((SELECT id FROM ref_grading_systems WHERE abbreviation = 'S'), 'S0', 'Easy — solid ground, wide',
   '{"hu":"Könnyű — szilárd talaj, széles","de":"Leicht — fester Boden, breit"}', 1, 1, '#22C55E', 1),
  ((SELECT id FROM ref_grading_systems WHERE abbreviation = 'S'), 'S1', 'Moderate — small obstacles',
   '{"hu":"Közepes — kis akadályok","de":"Mäßig — kleine Hindernisse"}', 1, 2, '#84CC16', 2),
  ((SELECT id FROM ref_grading_systems WHERE abbreviation = 'S'), 'S2', 'Difficult — roots, rocks, steps',
   '{"hu":"Nehéz — gyökerek, sziklák, lépcsők","de":"Schwierig — Wurzeln, Felsen, Stufen"}', 2, 3, '#EAB308', 3),
  ((SELECT id FROM ref_grading_systems WHERE abbreviation = 'S'), 'S3', 'Very Difficult — large obstacles, steep',
   '{"hu":"Nagyon nehéz — nagy akadályok, meredek","de":"Sehr schwierig — große Hindernisse"}', 3, 4, '#F97316', 4),
  ((SELECT id FROM ref_grading_systems WHERE abbreviation = 'S'), 'S4', 'Extreme — exposed, technical sections',
   '{"hu":"Extrém — kitett, technikai szakaszok","de":"Extrem — exponiert, technische Passagen"}', 4, 5, '#EF4444', 5),
  ((SELECT id FROM ref_grading_systems WHERE abbreviation = 'S'), 'S5', 'Extreme+ — only for experts',
   '{"hu":"Extrém+ — csak szakértőknek","de":"Extrem+ — nur für Experten"}', 5, 5, '#DC2626', 6);

-- 2.7 Ski Touring Scale (S1-S6)
INSERT INTO ref_grading_levels (grading_system_id, grade_value, grade_label, grade_label_localized, difficulty_min, difficulty_max, color_hex, sort_order) VALUES
  ((SELECT id FROM ref_grading_systems WHERE abbreviation = 'ST'), 'S1', 'Easy — gentle slopes (<30°)',
   '{"hu":"Könnyű — enyhe lejtők (<30°)","de":"Leicht — sanfte Hänge (<30°)"}', 1, 1, '#22C55E', 1),
  ((SELECT id FROM ref_grading_systems WHERE abbreviation = 'ST'), 'S2', 'Moderate — slopes up to 35°',
   '{"hu":"Közepes — lejtők 35°-ig","de":"Mäßig — Hänge bis 35°"}', 1, 2, '#84CC16', 2),
  ((SELECT id FROM ref_grading_systems WHERE abbreviation = 'ST'), 'S3', 'Difficult — slopes up to 40°',
   '{"hu":"Nehéz — lejtők 40°-ig","de":"Schwierig — Hänge bis 40°"}', 2, 3, '#EAB308', 3),
  ((SELECT id FROM ref_grading_systems WHERE abbreviation = 'ST'), 'S4', 'Very Difficult — slopes up to 45°, couloirs',
   '{"hu":"Nagyon nehéz — lejtők 45°-ig, couloirok","de":"Sehr schwierig — Hänge bis 45°, Couloirs"}', 3, 4, '#F97316', 4),
  ((SELECT id FROM ref_grading_systems WHERE abbreviation = 'ST'), 'S5', 'Extreme — 45°+, exposed terrain',
   '{"hu":"Extrém — 45°+, kitett terep","de":"Extrem — 45°+, exponiertes Gelände"}', 4, 5, '#EF4444', 5);

-- 2.8 European Avalanche Scale (1-5)
INSERT INTO ref_grading_levels (grading_system_id, grade_value, grade_label, grade_label_localized, difficulty_min, difficulty_max, color_hex, sort_order) VALUES
  ((SELECT id FROM ref_grading_systems WHERE abbreviation = 'AVA'), '1', 'Low — generally stable snowpack',
   '{"hu":"Alacsony — általában stabil hótakaró","de":"Gering — allgemein stabile Schneedecke"}', 1, 1, '#22C55E', 1),
  ((SELECT id FROM ref_grading_systems WHERE abbreviation = 'AVA'), '2', 'Moderate — on some steep slopes',
   '{"hu":"Mérsékelt — egyes meredek lejtőkön","de":"Mäßig — an einigen Steilhängen"}', 1, 2, '#EAB308', 2),
  ((SELECT id FROM ref_grading_systems WHERE abbreviation = 'AVA'), '3', 'Considerable — on many steep slopes',
   '{"hu":"Jelentős — sok meredek lejtőn","de":"Erheblich — an vielen Steilhängen"}', 2, 3, '#F97316', 3),
  ((SELECT id FROM ref_grading_systems WHERE abbreviation = 'AVA'), '4', 'High — most steep slopes',
   '{"hu":"Nagy — a legtöbb meredek lejtőn","de":"Groß — an den meisten Steilhängen"}', 4, 4, '#EF4444', 4),
  ((SELECT id FROM ref_grading_systems WHERE abbreviation = 'AVA'), '5', 'Very High — widespread instability',
   '{"hu":"Nagyon nagy — kiterjedt instabilitás","de":"Sehr groß — weit verbreitete Instabilität"}', 5, 5, '#DC2626', 5);

-- ============================================================================
-- 3. ref_certifications — Képesítések / Jogosítványok
-- ============================================================================

-- 3.1 Water Sports — Sailing
INSERT INTO ref_certifications (category_id, sub_discipline_id, name, name_localized, abbreviation, issuing_bodies, level, level_label, required_from_difficulty, is_organizer_required, is_participant_required, sort_order) VALUES
  ((SELECT id FROM categories WHERE name = 'Water Sports'),
   (SELECT id FROM sub_disciplines WHERE name = 'Sailing' AND category_id = (SELECT id FROM categories WHERE name = 'Water Sports')),
   'Day Skipper (Theory)', '{"hu":"Day Skipper (elmélet)","en":"Day Skipper (Theory)","de":"Day Skipper (Theorie)"}',
   'RYA DS', '["RYA"]', 1, 'Basic', NULL, false, false, 1),
  ((SELECT id FROM categories WHERE name = 'Water Sports'),
   (SELECT id FROM sub_disciplines WHERE name = 'Sailing' AND category_id = (SELECT id FROM categories WHERE name = 'Water Sports')),
   'Day Skipper (Practical)', '{"hu":"Day Skipper (gyakorlat)","en":"Day Skipper (Practical)","de":"Day Skipper (Praxis)"}',
   'RYA DS', '["RYA"]', 2, 'Intermediate', 2, true, false, 2),
  ((SELECT id FROM categories WHERE name = 'Water Sports'),
   (SELECT id FROM sub_disciplines WHERE name = 'Sailing' AND category_id = (SELECT id FROM categories WHERE name = 'Water Sports')),
   'Coastal Skipper', '{"hu":"Coastal Skipper","en":"Coastal Skipper","de":"Coastal Skipper"}',
   'RYA CS', '["RYA"]', 3, 'Advanced', 3, true, false, 3),
  ((SELECT id FROM categories WHERE name = 'Water Sports'),
   (SELECT id FROM sub_disciplines WHERE name = 'Sailing' AND category_id = (SELECT id FROM categories WHERE name = 'Water Sports')),
   'Yachtmaster Offshore', '{"hu":"Yachtmaster Offshore","en":"Yachtmaster Offshore","de":"Yachtmaster Offshore"}',
   'RYA YM', '["RYA"]', 4, 'Professional', 4, true, false, 4),
  ((SELECT id FROM categories WHERE name = 'Water Sports'),
   (SELECT id FROM sub_disciplines WHERE name = 'Sailing' AND category_id = (SELECT id FROM categories WHERE name = 'Water Sports')),
   'ICC (International Certificate of Competence)', '{"hu":"ICC (Nemzetközi Hajóvezetői Igazolvány)"}',
   'ICC', '["RYA","IYT"]', 2, 'Intermediate', 2, true, false, 5),
  ((SELECT id FROM categories WHERE name = 'Water Sports'), NULL,
   'VHF Radio Licence (SRC)', '{"hu":"VHF Rádió engedély (SRC)","en":"VHF Radio Licence (SRC)","de":"UKW-Funkzeugnis (SRC)"}',
   'SRC', '["Ofcom","NMHH","BNetzA"]', 1, 'Basic', NULL, true, false, 6);

-- 3.2 Water Sports — Diving
INSERT INTO ref_certifications (category_id, sub_discipline_id, name, name_localized, abbreviation, issuing_bodies, level, level_label, required_from_difficulty, is_organizer_required, is_participant_required, sort_order) VALUES
  ((SELECT id FROM categories WHERE name = 'Water Sports'),
   (SELECT id FROM sub_disciplines WHERE name = 'Diving' AND category_id = (SELECT id FROM categories WHERE name = 'Water Sports')),
   'Open Water Diver', '{"hu":"Open Water Diver","en":"Open Water Diver","de":"Open Water Diver"}',
   'OWD', '["PADI","SSI","CMAS"]', 1, 'Basic', 1, false, true, 10),
  ((SELECT id FROM categories WHERE name = 'Water Sports'),
   (SELECT id FROM sub_disciplines WHERE name = 'Diving' AND category_id = (SELECT id FROM categories WHERE name = 'Water Sports')),
   'Advanced Open Water', '{"hu":"Advanced Open Water","en":"Advanced Open Water","de":"Advanced Open Water"}',
   'AOWD', '["PADI","SSI","CMAS"]', 2, 'Intermediate', 2, false, true, 11),
  ((SELECT id FROM categories WHERE name = 'Water Sports'),
   (SELECT id FROM sub_disciplines WHERE name = 'Diving' AND category_id = (SELECT id FROM categories WHERE name = 'Water Sports')),
   'Rescue Diver', '{"hu":"Rescue Diver","en":"Rescue Diver","de":"Rescue Diver"}',
   'RD', '["PADI","SSI"]', 3, 'Advanced', 3, true, false, 12),
  ((SELECT id FROM categories WHERE name = 'Water Sports'),
   (SELECT id FROM sub_disciplines WHERE name = 'Diving' AND category_id = (SELECT id FROM categories WHERE name = 'Water Sports')),
   'Divemaster', '{"hu":"Divemaster","en":"Divemaster","de":"Divemaster"}',
   'DM', '["PADI","SSI","CMAS"]', 4, 'Professional', 4, true, false, 13);

-- 3.3 Mountain
INSERT INTO ref_certifications (category_id, sub_discipline_id, name, name_localized, abbreviation, issuing_bodies, level, level_label, required_from_difficulty, is_organizer_required, is_participant_required, sort_order) VALUES
  ((SELECT id FROM categories WHERE name = 'Mountain'), NULL,
   'Basic Alpine Skills Course', '{"hu":"Alap alpesi tanfolyam","en":"Basic Alpine Skills Course","de":"Alpinkurs Grundstufe"}',
   NULL, '["Alpine Clubs"]', 1, 'Basic', NULL, false, false, 1),
  ((SELECT id FROM categories WHERE name = 'Mountain'), NULL,
   'Crevasse Rescue Training', '{"hu":"Repedésmentési képzés","en":"Crevasse Rescue Training","de":"Spaltenbergung"}',
   NULL, '["Alpine Clubs","UIAGM"]', 2, 'Intermediate', 3, true, false, 2),
  ((SELECT id FROM categories WHERE name = 'Mountain'), NULL,
   'Mountain Guide (IFMGA)', '{"hu":"Hegyi vezető (IFMGA)","en":"Mountain Guide (IFMGA)","de":"Bergführer (IVBV)"}',
   'IFMGA', '["UIAGM","IFMGA"]', 4, 'Professional', 4, true, false, 3),
  ((SELECT id FROM categories WHERE name = 'Mountain'), NULL,
   'Avalanche Safety Level 1', '{"hu":"Lavina biztonsági tanfolyam 1","en":"Avalanche Safety Level 1","de":"Lawinenkurs Stufe 1"}',
   'AVA-1', '["Alpine Clubs","CAA","AIARE"]', 1, 'Basic', NULL, false, false, 4),
  ((SELECT id FROM categories WHERE name = 'Mountain'), NULL,
   'Avalanche Safety Level 2', '{"hu":"Lavina biztonsági tanfolyam 2","en":"Avalanche Safety Level 2","de":"Lawinenkurs Stufe 2"}',
   'AVA-2', '["Alpine Clubs","CAA","AIARE"]', 2, 'Intermediate', 3, true, false, 5);

-- 3.4 Hiking
INSERT INTO ref_certifications (category_id, sub_discipline_id, name, name_localized, abbreviation, issuing_bodies, level, level_label, required_from_difficulty, is_organizer_required, is_participant_required, sort_order) VALUES
  ((SELECT id FROM categories WHERE name = 'Hiking'), NULL,
   'Wilderness First Aid', '{"hu":"Vadon elsősegélynyújtás","en":"Wilderness First Aid","de":"Wildnis-Erste-Hilfe"}',
   'WFA', '["Red Cross","NOLS","WMA"]', 2, 'Intermediate', NULL, false, false, 1),
  ((SELECT id FROM categories WHERE name = 'Hiking'), NULL,
   'Alpine Navigation Course', '{"hu":"Alpesi navigációs tanfolyam","en":"Alpine Navigation Course","de":"Alpine Navigationskurs"}',
   NULL, '["Alpine Clubs"]', 1, 'Basic', NULL, false, false, 2),
  ((SELECT id FROM categories WHERE name = 'Hiking'), NULL,
   'Mountain Leader', '{"hu":"Hegyi túravezető","en":"Mountain Leader","de":"Wanderführer"}',
   'ML', '["BMC","Austrian Alpine Club"]', 3, 'Advanced', NULL, true, false, 3);

-- 3.5 Motorsport
INSERT INTO ref_certifications (category_id, sub_discipline_id, name, name_localized, abbreviation, issuing_bodies, level, level_label, required_from_difficulty, is_organizer_required, is_participant_required, sort_order) VALUES
  ((SELECT id FROM categories WHERE name = 'Motorsport'), NULL,
   'Motorcycle License (A)', '{"hu":"Motorkerékpár jogosítvány (A)","en":"Motorcycle License (A)","de":"Motorradführerschein (A)"}',
   'A', NULL, 1, 'Basic', 1, false, true, 1),
  ((SELECT id FROM categories WHERE name = 'Motorsport'),
   (SELECT id FROM sub_disciplines WHERE name = 'Enduro' AND category_id = (SELECT id FROM categories WHERE name = 'Motorsport')),
   'Off-road Training Certificate', '{"hu":"Terep vezetési tanúsítvány","en":"Off-road Training Certificate","de":"Offroad-Trainingszertifikat"}',
   NULL, NULL, 2, 'Intermediate', NULL, false, false, 2),
  ((SELECT id FROM categories WHERE name = 'Motorsport'),
   (SELECT id FROM sub_disciplines WHERE name = 'Rally' AND category_id = (SELECT id FROM categories WHERE name = 'Motorsport')),
   'Rally Navigator License', '{"hu":"Rali navigátor engedély","en":"Rally Navigator License","de":"Rallye-Navigator-Lizenz"}',
   NULL, NULL, 3, 'Advanced', 3, false, false, 3);

-- 3.6 Winter Sports
INSERT INTO ref_certifications (category_id, sub_discipline_id, name, name_localized, abbreviation, issuing_bodies, level, level_label, required_from_difficulty, is_organizer_required, is_participant_required, sort_order) VALUES
  ((SELECT id FROM categories WHERE name = 'Winter Sports'), NULL,
   'Avalanche Safety Level 1', '{"hu":"Lavina tanfolyam 1. szint","en":"Avalanche Safety Level 1","de":"Lawinenkurs Stufe 1"}',
   'AVA-1', '["Alpine Clubs","CAA","AIARE"]', 1, 'Basic', 2, false, false, 1),
  ((SELECT id FROM categories WHERE name = 'Winter Sports'), NULL,
   'Avalanche Safety Level 2', '{"hu":"Lavina tanfolyam 2. szint","en":"Avalanche Safety Level 2","de":"Lawinenkurs Stufe 2"}',
   'AVA-2', '["Alpine Clubs","CAA","AIARE"]', 2, 'Intermediate', 3, true, false, 2),
  ((SELECT id FROM categories WHERE name = 'Winter Sports'),
   (SELECT id FROM sub_disciplines WHERE name = 'Ski Touring' AND category_id = (SELECT id FROM categories WHERE name = 'Winter Sports')),
   'Ski Touring Guide', '{"hu":"Sítúra vezető","en":"Ski Touring Guide","de":"Skitourenführer"}',
   NULL, '["Alpine Clubs","UIAGM"]', 3, 'Advanced', 4, true, false, 3);

COMMIT;

-- ============================================================
-- Migration 016: Storage Buckets + ref_cover_images
-- ============================================================
-- Supabase Storage bucket a trip cover képekhez
-- + ref_cover_images referencia tábla előre feltöltött stock képekkel
-- ============================================================

-- 1. Storage buckets létrehozása
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('trip-covers', 'trip-covers', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('trip-gallery', 'trip-gallery', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- 2. Storage RLS policies
-- ============================================================

-- trip-covers: mindenki olvashat, auth user feltölthet
DO $$ BEGIN
  DROP POLICY IF EXISTS "trip_covers_select" ON storage.objects;
  CREATE POLICY "trip_covers_select" ON storage.objects
    FOR SELECT USING (bucket_id = 'trip-covers');
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "trip_covers_insert" ON storage.objects;
  CREATE POLICY "trip_covers_insert" ON storage.objects
    FOR INSERT WITH CHECK (
      bucket_id = 'trip-covers'
      AND auth.role() = 'authenticated'
    );
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "trip_covers_update" ON storage.objects;
  CREATE POLICY "trip_covers_update" ON storage.objects
    FOR UPDATE USING (
      bucket_id = 'trip-covers'
      AND auth.role() = 'authenticated'
    );
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "trip_covers_delete" ON storage.objects;
  CREATE POLICY "trip_covers_delete" ON storage.objects
    FOR DELETE USING (
      bucket_id = 'trip-covers'
      AND auth.role() = 'authenticated'
    );
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- trip-gallery: ugyanaz mint trip-covers
DO $$ BEGIN
  DROP POLICY IF EXISTS "trip_gallery_select" ON storage.objects;
  CREATE POLICY "trip_gallery_select" ON storage.objects
    FOR SELECT USING (bucket_id = 'trip-gallery');
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "trip_gallery_insert" ON storage.objects;
  CREATE POLICY "trip_gallery_insert" ON storage.objects
    FOR INSERT WITH CHECK (
      bucket_id = 'trip-gallery'
      AND auth.role() = 'authenticated'
    );
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- avatars: user saját path-ra tölthet fel
DO $$ BEGIN
  DROP POLICY IF EXISTS "avatars_select" ON storage.objects;
  CREATE POLICY "avatars_select" ON storage.objects
    FOR SELECT USING (bucket_id = 'avatars');
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "avatars_insert" ON storage.objects;
  CREATE POLICY "avatars_insert" ON storage.objects
    FOR INSERT WITH CHECK (
      bucket_id = 'avatars'
      AND auth.role() = 'authenticated'
    );
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- 3. ref_cover_images tábla
-- ============================================================

CREATE TABLE IF NOT EXISTS ref_cover_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Kategória kötés (nullable = univerzális kép)
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  sub_discipline_id UUID REFERENCES sub_disciplines(id) ON DELETE SET NULL,

  -- Kép adatok
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  alt_text TEXT NOT NULL DEFAULT '',
  alt_text_localized JSONB DEFAULT '{}',

  -- Forrás
  source TEXT NOT NULL DEFAULT 'stock' CHECK (source IN ('stock', 'unsplash', 'pexels', 'ai', 'uploaded', 'system')),
  source_id TEXT,  -- pl. Unsplash photo ID
  photographer TEXT,
  photographer_url TEXT,
  license TEXT DEFAULT 'free',

  -- Keresés / szűrés
  tags TEXT[] DEFAULT '{}',
  color_dominant TEXT,  -- hex szín a kép domináns színe
  orientation TEXT DEFAULT 'landscape' CHECK (orientation IN ('landscape', 'portrait', 'square')),

  -- Megjelenítés
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  usage_count INTEGER DEFAULT 0,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE ref_cover_images IS 'Előre feltöltött stock/AI képek amit a user kiválaszthat cover image-ként';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ref_cover_images_category ON ref_cover_images(category_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_ref_cover_images_source ON ref_cover_images(source);
CREATE INDEX IF NOT EXISTS idx_ref_cover_images_featured ON ref_cover_images(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_ref_cover_images_tags ON ref_cover_images USING GIN(tags);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_ref_cover_images_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_ref_cover_images_updated_at ON ref_cover_images;
CREATE TRIGGER trigger_ref_cover_images_updated_at
  BEFORE UPDATE ON ref_cover_images
  FOR EACH ROW EXECUTE FUNCTION update_ref_cover_images_updated_at();

-- RLS
ALTER TABLE ref_cover_images ENABLE ROW LEVEL SECURITY;

-- Mindenki olvashat
DROP POLICY IF EXISTS "ref_cover_images_select" ON ref_cover_images;
CREATE POLICY "ref_cover_images_select" ON ref_cover_images
  FOR SELECT USING (true);

-- Csak admin írhat (service role)
DROP POLICY IF EXISTS "ref_cover_images_admin" ON ref_cover_images;
CREATE POLICY "ref_cover_images_admin" ON ref_cover_images
  FOR ALL USING (auth.role() = 'service_role');

-- 4. Seed data: Unsplash stock képek kategóriánként
-- ============================================================
-- Használjuk az Unsplash Source URL-eket (ingyenes, nem kell API key)
-- Format: https://images.unsplash.com/photo-{ID}?w=1200&h=600&fit=crop&auto=format&q=80

INSERT INTO ref_cover_images (category_id, url, thumbnail_url, alt_text, alt_text_localized, source, source_id, photographer, tags, is_featured, sort_order)
SELECT
  c.id,
  img.url,
  img.thumbnail_url,
  img.alt_text,
  img.alt_text_localized::jsonb,
  'unsplash',
  img.source_id,
  img.photographer,
  img.tags::text[],
  img.is_featured,
  img.sort_order
FROM categories c
CROSS JOIN LATERAL (
  VALUES
    -- ===================== HIKING =====================
    ('Hiking', 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=1200&h=600&fit=crop&auto=format&q=80', 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=400&h=200&fit=crop&auto=format&q=60', 'Hikers on mountain trail at sunrise', '{"hu":"Túrázók hegyi ösvényen napkeltekor","en":"Hikers on mountain trail at sunrise"}', 'photo-1551632811-561732d1e306', 'Toomas Tartes', '{hiking,mountain,trail,sunrise}', true, 1),
    ('Hiking', 'https://images.unsplash.com/photo-1501555088652-021faa106b9b?w=1200&h=600&fit=crop&auto=format&q=80', 'https://images.unsplash.com/photo-1501555088652-021faa106b9b?w=400&h=200&fit=crop&auto=format&q=60', 'Group hiking in green mountains', '{"hu":"Csoportos túra zöld hegyekben","en":"Group hiking in green mountains"}', 'photo-1501555088652-021faa106b9b', 'Danka Peter', '{hiking,group,mountains,green}', false, 2),
    ('Hiking', 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&h=600&fit=crop&auto=format&q=80', 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400&h=200&fit=crop&auto=format&q=60', 'Dramatic mountain peak landscape', '{"hu":"Drámai hegycsúcs tájkép","en":"Dramatic mountain peak landscape"}', 'photo-1464822759023-fed622ff2c3b', 'Kalen Emsley', '{hiking,mountain,peak,landscape}', false, 3),
    ('Hiking', 'https://images.unsplash.com/photo-1445363692815-ebcd599f7621?w=1200&h=600&fit=crop&auto=format&q=80', 'https://images.unsplash.com/photo-1445363692815-ebcd599f7621?w=400&h=200&fit=crop&auto=format&q=60', 'Forest trail with autumn colors', '{"hu":"Erdei ösvény őszi színekben","en":"Forest trail with autumn colors"}', 'photo-1445363692815-ebcd599f7621', 'John Towner', '{hiking,forest,trail,autumn}', false, 4),

    -- ===================== MOUNTAIN =====================
    ('Mountain', 'https://images.unsplash.com/photo-1522163182402-834f871fd851?w=1200&h=600&fit=crop&auto=format&q=80', 'https://images.unsplash.com/photo-1522163182402-834f871fd851?w=400&h=200&fit=crop&auto=format&q=60', 'Climber on rocky mountain face', '{"hu":"Mászó sziklás hegyoldalon","en":"Climber on rocky mountain face"}', 'photo-1522163182402-834f871fd851', 'Faye Cornish', '{mountain,climbing,rock,adventure}', true, 1),
    ('Mountain', 'https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5?w=1200&h=600&fit=crop&auto=format&q=80', 'https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5?w=400&h=200&fit=crop&auto=format&q=60', 'Snow-capped mountain range panorama', '{"hu":"Havas hegycsúcsok panorámája","en":"Snow-capped mountain range panorama"}', 'photo-1483728642387-6c3bdd6c93e5', 'Samuel Ferrara', '{mountain,snow,panorama,peaks}', false, 2),
    ('Mountain', 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=1200&h=600&fit=crop&auto=format&q=80', 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=400&h=200&fit=crop&auto=format&q=60', 'Camping tent at mountain base', '{"hu":"Sátor a hegy lábánál","en":"Camping tent at mountain base"}', 'photo-1504280390367-361c6d9f38f4', 'Scott Goodwill', '{mountain,camping,tent,base}', false, 3),

    -- ===================== WATER SPORTS =====================
    ('Water Sports', 'https://images.unsplash.com/photo-1504681869696-d977211a5f4c?w=1200&h=600&fit=crop&auto=format&q=80', 'https://images.unsplash.com/photo-1504681869696-d977211a5f4c?w=400&h=200&fit=crop&auto=format&q=60', 'Sailing boat on blue ocean', '{"hu":"Vitorlás hajó a kék óceánon","en":"Sailing boat on blue ocean"}', 'photo-1504681869696-d977211a5f4c', 'Bobby Burch', '{sailing,boat,ocean,blue}', true, 1),
    ('Water Sports', 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1200&h=600&fit=crop&auto=format&q=80', 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&h=200&fit=crop&auto=format&q=60', 'Kayaking on crystal clear water', '{"hu":"Kajakozás kristálytiszta vízben","en":"Kayaking on crystal clear water"}', 'photo-1544551763-46a013bb70d5', 'Jen Theodore', '{kayaking,water,clear,adventure}', false, 2),
    ('Water Sports', 'https://images.unsplash.com/photo-1530053969600-caed2596d242?w=1200&h=600&fit=crop&auto=format&q=80', 'https://images.unsplash.com/photo-1530053969600-caed2596d242?w=400&h=200&fit=crop&auto=format&q=60', 'Surfer riding ocean wave', '{"hu":"Szörfös az óceán hullámain","en":"Surfer riding ocean wave"}', 'photo-1530053969600-caed2596d242', 'Jeremy Bishop', '{surfing,wave,ocean,sport}', false, 3),

    -- ===================== CYCLING =====================
    ('Cycling', 'https://images.unsplash.com/photo-1541625602330-2277a4c46182?w=1200&h=600&fit=crop&auto=format&q=80', 'https://images.unsplash.com/photo-1541625602330-2277a4c46182?w=400&h=200&fit=crop&auto=format&q=60', 'Cyclist on mountain road at sunset', '{"hu":"Kerékpáros hegyi úton naplementekor","en":"Cyclist on mountain road at sunset"}', 'photo-1541625602330-2277a4c46182', 'Markus Spiske', '{cycling,road,sunset,mountain}', true, 1),
    ('Cycling', 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=1200&h=600&fit=crop&auto=format&q=80', 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=400&h=200&fit=crop&auto=format&q=60', 'Group cycling on country road', '{"hu":"Csoportos kerékpározás vidéki úton","en":"Group cycling on country road"}', 'photo-1517649763962-0c623066013b', 'Markus Spiske', '{cycling,group,road,country}', false, 2),
    ('Cycling', 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=1200&h=600&fit=crop&auto=format&q=80', 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=200&fit=crop&auto=format&q=60', 'Mountain bike on forest trail', '{"hu":"Mountain bike erdei ösvényen","en":"Mountain bike on forest trail"}', 'photo-1558618666-fcd25c85f82e', 'Tim Foster', '{mtb,mountain,bike,forest,trail}', false, 3),

    -- ===================== MOTORSPORT =====================
    ('Motorsport', 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=1200&h=600&fit=crop&auto=format&q=80', 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=400&h=200&fit=crop&auto=format&q=60', 'Motorcycle on desert road', '{"hu":"Motorkerékpár sivatagi úton","en":"Motorcycle on desert road"}', 'photo-1568772585407-9361f9bf3a87', 'Harley-Davidson', '{motorsport,motorcycle,desert,road}', true, 1),
    ('Motorsport', 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=1200&h=600&fit=crop&auto=format&q=80', 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=400&h=200&fit=crop&auto=format&q=60', 'Off-road vehicle in muddy terrain', '{"hu":"Terepjáró sáros terepen","en":"Off-road vehicle in muddy terrain"}', 'photo-1558981806-ec527fa84c39', 'Alex Duffy', '{motorsport,offroad,mud,4x4}', false, 2),

    -- ===================== RUNNING =====================
    ('Running', 'https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?w=1200&h=600&fit=crop&auto=format&q=80', 'https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?w=400&h=200&fit=crop&auto=format&q=60', 'Trail runner in mountain landscape', '{"hu":"Terepfutó hegyi tájban","en":"Trail runner in mountain landscape"}', 'photo-1452626038306-9aae5e071dd3', 'Brian Metzler', '{running,trail,mountain,sport}', true, 1),
    ('Running', 'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=1200&h=600&fit=crop&auto=format&q=80', 'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=400&h=200&fit=crop&auto=format&q=60', 'Group running at sunrise', '{"hu":"Csoportos futás napkeltekor","en":"Group running at sunrise"}', 'photo-1571008887538-b36bb32f4571', 'Fitsum Admasu', '{running,group,sunrise,fitness}', false, 2),

    -- ===================== WINTER SPORTS =====================
    ('Winter Sports', 'https://images.unsplash.com/photo-1551524559-8af4e6624178?w=1200&h=600&fit=crop&auto=format&q=80', 'https://images.unsplash.com/photo-1551524559-8af4e6624178?w=400&h=200&fit=crop&auto=format&q=60', 'Skier on fresh powder slope', '{"hu":"Síelő friss hóban","en":"Skier on fresh powder slope"}', 'photo-1551524559-8af4e6624178', 'Maarten Duineveld', '{skiing,powder,snow,winter}', true, 1),
    ('Winter Sports', 'https://images.unsplash.com/photo-1565992441121-4367c2967103?w=1200&h=600&fit=crop&auto=format&q=80', 'https://images.unsplash.com/photo-1565992441121-4367c2967103?w=400&h=200&fit=crop&auto=format&q=60', 'Snowboarder jumping over slope', '{"hu":"Snowboardos ugrás a lejtőn","en":"Snowboarder jumping over slope"}', 'photo-1565992441121-4367c2967103', 'Visit Almaty', '{snowboard,jump,winter,sport}', false, 2),
    ('Winter Sports', 'https://images.unsplash.com/photo-1491002052546-bf38f186af56?w=1200&h=600&fit=crop&auto=format&q=80', 'https://images.unsplash.com/photo-1491002052546-bf38f186af56?w=400&h=200&fit=crop&auto=format&q=60', 'Alpine ski resort panorama', '{"hu":"Alpesi síközpont panoráma","en":"Alpine ski resort panorama"}', 'photo-1491002052546-bf38f186af56', 'Simon Fitall', '{skiing,resort,alps,panorama}', false, 3),

    -- ===================== EXPEDITION =====================
    ('Expedition', 'https://images.unsplash.com/photo-1533587851505-d119e13fa0d7?w=1200&h=600&fit=crop&auto=format&q=80', 'https://images.unsplash.com/photo-1533587851505-d119e13fa0d7?w=400&h=200&fit=crop&auto=format&q=60', 'Backpacker in wilderness landscape', '{"hu":"Hátizsákos túrázó a vadonban","en":"Backpacker in wilderness landscape"}', 'photo-1533587851505-d119e13fa0d7', 'Dino Reichmuth', '{expedition,backpacking,wilderness,nature}', true, 1),
    ('Expedition', 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200&h=600&fit=crop&auto=format&q=80', 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&h=200&fit=crop&auto=format&q=60', 'Vast wilderness valley from above', '{"hu":"Hatalmas vadon völgy felülről","en":"Vast wilderness valley from above"}', 'photo-1469474968028-56623f02e42e', 'David Marcu', '{expedition,valley,wilderness,aerial}', false, 2)
) AS img(category_name, url, thumbnail_url, alt_text, alt_text_localized, source_id, photographer, tags, is_featured, sort_order)
WHERE c.name = img.category_name
ON CONFLICT DO NOTHING;

-- 5. Univerzális cover képek (kategória nélkül, mindenhez használható)
-- ============================================================

INSERT INTO ref_cover_images (category_id, url, thumbnail_url, alt_text, alt_text_localized, source, source_id, photographer, tags, is_featured, sort_order)
VALUES
  (NULL, 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=600&fit=crop&auto=format&q=80', 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=200&fit=crop&auto=format&q=60', 'Mountain panorama above clouds', '{"hu":"Hegyi panoráma a felhők felett","en":"Mountain panorama above clouds"}', 'unsplash', 'photo-1506905925346-21bda4d32df4', 'Samuel Ferrara', '{universal,mountain,panorama,clouds}', true, 1),
  (NULL, 'https://images.unsplash.com/photo-1490730141103-6cac27aaab94?w=1200&h=600&fit=crop&auto=format&q=80', 'https://images.unsplash.com/photo-1490730141103-6cac27aaab94?w=400&h=200&fit=crop&auto=format&q=60', 'Person standing on cliff at sunset', '{"hu":"Ember a sziklaperemen naplementekor","en":"Person standing on cliff at sunset"}', 'unsplash', 'photo-1490730141103-6cac27aaab94', 'Mohamed Nohassi', '{universal,cliff,sunset,adventure}', true, 2),
  (NULL, 'https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=1200&h=600&fit=crop&auto=format&q=80', 'https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=400&h=200&fit=crop&auto=format&q=60', 'Waterfall in lush forest', '{"hu":"Vízesés zöld erdőben","en":"Waterfall in lush forest"}', 'unsplash', 'photo-1433086966358-54859d0ed716', 'Luca Bravo', '{universal,waterfall,forest,nature}', false, 3),
  (NULL, 'https://images.unsplash.com/photo-1500534623283-312aade485b7?w=1200&h=600&fit=crop&auto=format&q=80', 'https://images.unsplash.com/photo-1500534623283-312aade485b7?w=400&h=200&fit=crop&auto=format&q=60', 'Campfire under starry night sky', '{"hu":"Tábortűz csillagos ég alatt","en":"Campfire under starry night sky"}', 'unsplash', 'photo-1500534623283-312aade485b7', 'Sven Scheuermeier', '{universal,campfire,stars,night}', false, 4)
ON CONFLICT DO NOTHING;

-- ============================================================
-- VERIFIKÁCIÓ
-- ============================================================
-- SELECT count(*) FROM ref_cover_images;  -- Expected: ~26
-- SELECT source, count(*) FROM ref_cover_images GROUP BY source;
-- SELECT c.name, count(r.id) FROM categories c LEFT JOIN ref_cover_images r ON r.category_id = c.id GROUP BY c.name;
-- SELECT * FROM storage.buckets WHERE id IN ('trip-covers', 'trip-gallery', 'avatars');

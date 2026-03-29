-- ============================================
-- Migration 017: Image System Enhancements
-- - cover_image_source enum + column on trips
-- - avatar_source enum + column on profiles
-- - ref_avatar_images table + seed
-- ============================================

-- 1. Create enum types (idempotent)
DO $$ BEGIN
  CREATE TYPE cover_image_source_t AS ENUM ('system', 'user_upload');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE avatar_source_t AS ENUM ('system', 'user_upload', 'oauth');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Add cover_image_source to trips
ALTER TABLE trips ADD COLUMN IF NOT EXISTS cover_image_source cover_image_source_t NOT NULL DEFAULT 'system';

-- 3. Add avatar_source to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_source avatar_source_t NOT NULL DEFAULT 'system';

-- 4. Backfill existing data
-- Trips: URLs containing /storage/ pattern are user uploads
UPDATE trips
SET cover_image_source = 'user_upload'
WHERE cover_image_url IS NOT NULL
  AND cover_image_url LIKE '%/storage/%'
  AND cover_image_source = 'system';

-- Profiles: OAuth avatar URLs (Google, Facebook, etc.)
UPDATE profiles
SET avatar_source = 'oauth'
WHERE avatar_url IS NOT NULL
  AND (
    avatar_url LIKE '%googleusercontent.com%'
    OR avatar_url LIKE '%fbcdn.net%'
    OR avatar_url LIKE '%facebook.com%'
    OR avatar_url LIKE '%graph.facebook.com%'
  )
  AND avatar_source = 'system';

-- Profiles: User-uploaded avatars (Supabase storage)
UPDATE profiles
SET avatar_source = 'user_upload'
WHERE avatar_url IS NOT NULL
  AND avatar_url LIKE '%/storage/%avatars/%'
  AND avatar_source = 'system';

-- 5. Create ref_avatar_images table
CREATE TABLE IF NOT EXISTS ref_avatar_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL DEFAULT 'icon' CHECK (type IN ('icon', 'nature', 'abstract')),
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  alt_text TEXT NOT NULL DEFAULT '',
  alt_text_localized JSONB DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ref_avatar_images_type ON ref_avatar_images(type) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_ref_avatar_images_active ON ref_avatar_images(is_active, sort_order);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_ref_avatar_images_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ref_avatar_images_updated ON ref_avatar_images;
CREATE TRIGGER trg_ref_avatar_images_updated
  BEFORE UPDATE ON ref_avatar_images
  FOR EACH ROW
  EXECUTE FUNCTION update_ref_avatar_images_updated_at();

-- RLS
ALTER TABLE ref_avatar_images ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "ref_avatar_images_public_read"
    ON ref_avatar_images FOR SELECT
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "ref_avatar_images_service_write"
    ON ref_avatar_images FOR ALL
    USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 6. Seed system avatars
-- Icon type: adventure activity silhouettes (using Lucide icon concept URLs)
INSERT INTO ref_avatar_images (type, url, alt_text, alt_text_localized, tags, sort_order) VALUES
  ('icon', 'https://api.dicebear.com/9.x/shapes/svg?seed=hiker&backgroundColor=d1fae5&shape1Color=059669', 'Hiker', '{"hu":"Túrázó","en":"Hiker"}', ARRAY['hiking','outdoor'], 1),
  ('icon', 'https://api.dicebear.com/9.x/shapes/svg?seed=climber&backgroundColor=fed7aa&shape1Color=f97316', 'Climber', '{"hu":"Hegymászó","en":"Climber"}', ARRAY['mountain','climbing'], 2),
  ('icon', 'https://api.dicebear.com/9.x/shapes/svg?seed=kayaker&backgroundColor=cffafe&shape1Color=06b6d4', 'Kayaker', '{"hu":"Kajakos","en":"Kayaker"}', ARRAY['water','kayak'], 3),
  ('icon', 'https://api.dicebear.com/9.x/shapes/svg?seed=cyclist&backgroundColor=fef3c7&shape1Color=d97706', 'Cyclist', '{"hu":"Kerékpáros","en":"Cyclist"}', ARRAY['cycling','bike'], 4),
  ('icon', 'https://api.dicebear.com/9.x/shapes/svg?seed=runner&backgroundColor=ffe4e6&shape1Color=dc2626', 'Runner', '{"hu":"Futó","en":"Runner"}', ARRAY['running','trail'], 5),
  ('icon', 'https://api.dicebear.com/9.x/shapes/svg?seed=skier&backgroundColor=ede9fe&shape1Color=8b5cf6', 'Skier', '{"hu":"Síelő","en":"Skier"}', ARRAY['winter','ski'], 6),
  ('icon', 'https://api.dicebear.com/9.x/shapes/svg?seed=explorer&backgroundColor=dbeafe&shape1Color=3b82f6', 'Explorer', '{"hu":"Felfedező","en":"Explorer"}', ARRAY['expedition','explore'], 7),
  ('icon', 'https://api.dicebear.com/9.x/shapes/svg?seed=driver&backgroundColor=fee2e2&shape1Color=b91c1c', 'Driver', '{"hu":"Pilóta","en":"Driver"}', ARRAY['motorsport','rally'], 8)
ON CONFLICT DO NOTHING;

-- Nature type: landscape close-up circles
INSERT INTO ref_avatar_images (type, url, alt_text, alt_text_localized, tags, sort_order) VALUES
  ('nature', 'https://api.dicebear.com/9.x/shapes/svg?seed=mountain-peak&backgroundColor=bbf7d0&shape1Color=166534', 'Mountain Peak', '{"hu":"Hegycsúcs","en":"Mountain Peak"}', ARRAY['mountain','peak'], 1),
  ('nature', 'https://api.dicebear.com/9.x/shapes/svg?seed=ocean-wave&backgroundColor=a5f3fc&shape1Color=0891b2', 'Ocean Wave', '{"hu":"Óceán hullám","en":"Ocean Wave"}', ARRAY['ocean','wave'], 2),
  ('nature', 'https://api.dicebear.com/9.x/shapes/svg?seed=forest-trail&backgroundColor=d9f99d&shape1Color=65a30d', 'Forest Trail', '{"hu":"Erdei ösvény","en":"Forest Trail"}', ARRAY['forest','trail'], 3),
  ('nature', 'https://api.dicebear.com/9.x/shapes/svg?seed=sunset-glow&backgroundColor=fed7aa&shape1Color=ea580c', 'Sunset Glow', '{"hu":"Naplemente","en":"Sunset Glow"}', ARRAY['sunset','sky'], 4)
ON CONFLICT DO NOTHING;

-- Abstract type: geometric adventure patterns
INSERT INTO ref_avatar_images (type, url, alt_text, alt_text_localized, tags, sort_order) VALUES
  ('abstract', 'https://api.dicebear.com/9.x/shapes/svg?seed=geo-teal&backgroundColor=ccfbf1&shape1Color=0d9488', 'Teal Pattern', '{"hu":"Türkiz minta","en":"Teal Pattern"}', ARRAY['abstract','teal'], 1),
  ('abstract', 'https://api.dicebear.com/9.x/shapes/svg?seed=geo-coral&backgroundColor=ffe4e6&shape1Color=f43f5e', 'Coral Pattern', '{"hu":"Korall minta","en":"Coral Pattern"}', ARRAY['abstract','coral'], 2),
  ('abstract', 'https://api.dicebear.com/9.x/shapes/svg?seed=geo-navy&backgroundColor=e0e7ff&shape1Color=4f46e5', 'Navy Pattern', '{"hu":"Sötétkék minta","en":"Navy Pattern"}', ARRAY['abstract','navy'], 3),
  ('abstract', 'https://api.dicebear.com/9.x/shapes/svg?seed=geo-amber&backgroundColor=fef3c7&shape1Color=d97706', 'Amber Pattern', '{"hu":"Borostyán minta","en":"Amber Pattern"}', ARRAY['abstract','amber'], 4)
ON CONFLICT DO NOTHING;

-- 7. Verification
-- SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name = 'trips' AND column_name = 'cover_image_source';
-- SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'avatar_source';
-- SELECT count(*), type FROM ref_avatar_images GROUP BY type;

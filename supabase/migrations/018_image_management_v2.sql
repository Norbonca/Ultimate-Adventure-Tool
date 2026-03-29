-- ============================================================
-- Migration 018: Image Management v2
-- ============================================================
-- 1. user_images tábla (személyes képgaléria)
-- 2. trips.card_image_url + card_image_source oszlopok
-- 3. user-images storage bucket
-- ============================================================

-- 1. user_images tábla
-- ============================================================

CREATE TABLE IF NOT EXISTS user_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Kép adatok
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  original_filename TEXT NOT NULL DEFAULT '',
  file_size INTEGER NOT NULL DEFAULT 0,
  width INTEGER,
  height INTEGER,
  mime_type TEXT NOT NULL DEFAULT 'image/jpeg',

  -- Szervezés
  tags TEXT[] DEFAULT '{}',
  alt_text TEXT DEFAULT '',

  -- Audit
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

COMMENT ON TABLE user_images IS 'Felhasználók személyes képgalériája — egyszer feltöltött képek többször használhatók (cover, kártya, galéria, avatar)';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_images_user_id ON user_images(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_user_images_created ON user_images(created_at DESC) WHERE deleted_at IS NULL;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_user_images_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_user_images_updated_at ON user_images;
CREATE TRIGGER trigger_user_images_updated_at
  BEFORE UPDATE ON user_images
  FOR EACH ROW EXECUTE FUNCTION update_user_images_updated_at();

-- RLS
ALTER TABLE user_images ENABLE ROW LEVEL SECURITY;

-- User csak a sajátját látja
DROP POLICY IF EXISTS "user_images_select_own" ON user_images;
CREATE POLICY "user_images_select_own" ON user_images
  FOR SELECT USING (auth.uid() = user_id);

-- User csak sajátot szúrhat be
DROP POLICY IF EXISTS "user_images_insert_own" ON user_images;
CREATE POLICY "user_images_insert_own" ON user_images
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User csak sajátot frissíthet
DROP POLICY IF EXISTS "user_images_update_own" ON user_images;
CREATE POLICY "user_images_update_own" ON user_images
  FOR UPDATE USING (auth.uid() = user_id);

-- User csak sajátot törölhet
DROP POLICY IF EXISTS "user_images_delete_own" ON user_images;
CREATE POLICY "user_images_delete_own" ON user_images
  FOR DELETE USING (auth.uid() = user_id);

-- 2. trips tábla bővítés — card_image_url + card_image_source
-- ============================================================

-- Reuse existing cover_image_source_t enum
ALTER TABLE trips ADD COLUMN IF NOT EXISTS card_image_url TEXT;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS card_image_source cover_image_source_t NOT NULL DEFAULT 'system';

COMMENT ON COLUMN trips.card_image_url IS 'Discover kártya kép URL — KÜLÖN a cover_image_url-tól. Ha NULL → fallback cover_image_url-ra.';
COMMENT ON COLUMN trips.card_image_source IS 'Kártya kép forrása: system (rendszerkép) vagy user_upload (saját feltöltés)';

-- 3. user-images storage bucket
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('user-images', 'user-images', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
ON CONFLICT (id) DO NOTHING;

-- Storage RLS — user-images
DO $$ BEGIN
  DROP POLICY IF EXISTS "user_images_storage_select" ON storage.objects;
  CREATE POLICY "user_images_storage_select" ON storage.objects
    FOR SELECT USING (bucket_id = 'user-images');
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "user_images_storage_insert" ON storage.objects;
  CREATE POLICY "user_images_storage_insert" ON storage.objects
    FOR INSERT WITH CHECK (
      bucket_id = 'user-images'
      AND auth.role() = 'authenticated'
    );
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "user_images_storage_update" ON storage.objects;
  CREATE POLICY "user_images_storage_update" ON storage.objects
    FOR UPDATE USING (
      bucket_id = 'user-images'
      AND auth.role() = 'authenticated'
    );
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "user_images_storage_delete" ON storage.objects;
  CREATE POLICY "user_images_storage_delete" ON storage.objects
    FOR DELETE USING (
      bucket_id = 'user-images'
      AND auth.role() = 'authenticated'
    );
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ============================================================
-- VERIFIKÁCIÓ
-- ============================================================
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'user_images';
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'trips' AND column_name LIKE 'card_%';
-- SELECT * FROM storage.buckets WHERE id = 'user-images';

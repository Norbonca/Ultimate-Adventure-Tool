-- ============================================================================
-- 015: Fix handle_new_user() trigger — UPSERT pattern
-- ============================================================================
-- Probléma: Az eredeti trigger sima INSERT-et használt, ami elbukik ha:
--   1. A profiles sor már létezik (backfill, újrapróbált regisztráció)
--   2. A user_privacy_settings sor már létezik
-- Megoldás: INSERT ... ON CONFLICT DO UPDATE (UPSERT)
-- NINCS EXCEPTION blokk — ha hiba van, azonnal lássuk!
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Profiles UPSERT — ha már létezik (backfill/retry), update-eljük
  INSERT INTO public.profiles (
    id,
    email,
    display_name,
    slug,
    first_name,
    last_name,
    avatar_url,
    phone
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      CASE WHEN NEW.email IS NOT NULL THEN split_part(NEW.email, '@', 1) ELSE 'User' END
    ),
    generate_unique_slug(
      COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        CASE WHEN NEW.email IS NOT NULL THEN split_part(NEW.email, '@', 1) ELSE 'user-' || left(NEW.id::TEXT, 8) END
      )
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'first_name',
      split_part(COALESCE(NEW.raw_user_meta_data->>'full_name', ''), ' ', 1),
      ''
    ),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.phone
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = COALESCE(NULLIF(profiles.display_name, ''), EXCLUDED.display_name),
    avatar_url = COALESCE(profiles.avatar_url, EXCLUDED.avatar_url),
    phone = COALESCE(profiles.phone, EXCLUDED.phone),
    updated_at = NOW();

  -- Privacy settings UPSERT
  INSERT INTO public.user_privacy_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

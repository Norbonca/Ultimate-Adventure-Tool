-- ============================================================================
-- 020: REPAIR handle_new_user() — re-apply 015 fix
-- ============================================================================
-- A 015 migration fel lett jelölve mint alkalmazott, de a production DB-ben
-- a régi (001-es) verzió maradt. Ez a migration újra alkalmazza a javítást.
--
-- Probléma: "Database error saving new user" hiba regisztrációkor, mert:
--   1. Hiányzik SET search_path = public → generate_unique_slug() nem található
--   2. Nincs ON CONFLICT (UPSERT) → retry/backfill ütközés
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
    public.generate_unique_slug(
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- generate_unique_slug is also missing SET search_path — fix it too
CREATE OR REPLACE FUNCTION public.generate_unique_slug(base_name TEXT)
RETURNS TEXT AS $$
DECLARE
  v_slug TEXT;
  v_slug_exists BOOLEAN;
  v_counter INTEGER := 0;
BEGIN
  v_slug := lower(trim(base_name));
  v_slug := translate(v_slug, 'áéíóöőúüűÁÉÍÓÖŐÚÜŰ', 'aeiooouuuaeiooouuu');
  v_slug := regexp_replace(v_slug, '[^a-z0-9]+', '-', 'g');
  v_slug := regexp_replace(v_slug, '^-|-$', '', 'g');
  v_slug := left(v_slug, 50);

  IF v_slug = '' OR v_slug IS NULL THEN
    v_slug := 'user';
  END IF;

  LOOP
    IF v_counter = 0 THEN
      SELECT EXISTS(SELECT 1 FROM public.profiles WHERE public.profiles.slug = v_slug) INTO v_slug_exists;
    ELSE
      SELECT EXISTS(SELECT 1 FROM public.profiles WHERE public.profiles.slug = v_slug || '-' || v_counter::TEXT) INTO v_slug_exists;
    END IF;

    IF NOT v_slug_exists THEN
      IF v_counter > 0 THEN
        v_slug := v_slug || '-' || v_counter::TEXT;
      END IF;
      RETURN v_slug;
    END IF;

    v_counter := v_counter + 1;
  END LOOP;
END;
$$ LANGUAGE plpgsql SET search_path = public;

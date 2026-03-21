-- Backfill: Create profiles for existing auth.users who registered before the trigger was created
INSERT INTO public.profiles (id, email, display_name, slug, first_name, last_name, avatar_url, phone)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', CASE WHEN au.email IS NOT NULL THEN split_part(au.email, '@', 1) ELSE 'User' END),
  generate_unique_slug(COALESCE(au.raw_user_meta_data->>'full_name', CASE WHEN au.email IS NOT NULL THEN split_part(au.email, '@', 1) ELSE 'user-' || left(au.id::TEXT, 8) END)),
  COALESCE(au.raw_user_meta_data->>'first_name', split_part(COALESCE(au.raw_user_meta_data->>'full_name', ''), ' ', 1), ''),
  COALESCE(au.raw_user_meta_data->>'last_name', ''),
  au.raw_user_meta_data->>'avatar_url',
  au.phone
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Create privacy settings for users who don't have them
INSERT INTO public.user_privacy_settings (user_id)
SELECT p.id FROM public.profiles p
LEFT JOIN public.user_privacy_settings ups ON ups.user_id = p.id
WHERE ups.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- 058 — Storage: írás csak a saját mappába (SEC-014, a 2026-10-31-i versenytárs-gap terv L-2 lelete)
-- Hiba: a trip-covers, avatars, user-images és trip-gallery bucket INSERT/UPDATE/DELETE szabálya
-- (016, 018) csak azt nézte, hogy a hívó be van-e jelentkezve. Bármely felhasználó felülírhatta
-- vagy törölhette más borítóképét, illetve bárhová írhatott a bucketben.
-- Javítás: az útvonal első mappája a feltöltő azonosítója kell legyen ({auth.uid()}/…). A kliens
-- 2026-10-31 óta aláírt feltöltési URL-lel tölt fel (lib/storage/image-upload.ts) erre az útvonalra.
-- A trip-gallery bucketnek még nincs írója (a túragaléria saját szabályt kap a galéria-migrációban),
-- ezért oda most senki nem írhat. A SELECT (publikus olvasás) változatlan.
-- Éles állapot az alkalmazás előtt (2026-10-31): trip-covers 48 fájl, mind a rendszer samples/
-- mappájában (owner nélkül, service role tette fel) — felhasználó ezeket ezután nem módosíthatja;
-- avatars 1 fájl a tulajdonosa mappájában; user-images és trip-gallery üres.

-- trip-covers -----------------------------------------------------------------
DROP POLICY IF EXISTS "trip_covers_insert" ON storage.objects;
DROP POLICY IF EXISTS "trip_covers_update" ON storage.objects;
DROP POLICY IF EXISTS "trip_covers_delete" ON storage.objects;

CREATE POLICY "trip_covers_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'trip-covers' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
CREATE POLICY "trip_covers_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING      (bucket_id = 'trip-covers' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text)
  WITH CHECK (bucket_id = 'trip-covers' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
CREATE POLICY "trip_covers_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'trip-covers' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);

-- avatars ---------------------------------------------------------------------
DROP POLICY IF EXISTS "avatars_insert" ON storage.objects;

CREATE POLICY "avatars_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
CREATE POLICY "avatars_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING      (bucket_id = 'avatars' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text)
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
CREATE POLICY "avatars_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);

-- user-images -----------------------------------------------------------------
DROP POLICY IF EXISTS "user_images_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "user_images_storage_update" ON storage.objects;
DROP POLICY IF EXISTS "user_images_storage_delete" ON storage.objects;

CREATE POLICY "user_images_storage_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'user-images' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
CREATE POLICY "user_images_storage_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING      (bucket_id = 'user-images' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text)
  WITH CHECK (bucket_id = 'user-images' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
CREATE POLICY "user_images_storage_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'user-images' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);

-- trip-gallery ----------------------------------------------------------------
DROP POLICY IF EXISTS "trip_gallery_insert" ON storage.objects;

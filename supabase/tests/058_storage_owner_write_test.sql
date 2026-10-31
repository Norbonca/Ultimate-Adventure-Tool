-- Tranzakciós füstteszt a 058-as migrációhoz (storage: írás csak a saját mappába).
-- Futtatás: psql -v ON_ERROR_STOP=1 -f <fájl> (a végén ROLLBACK).
BEGIN;
DO $$
DECLARE
  a uuid := gen_random_uuid(); b uuid := gen_random_uuid();
  n int;
BEGIN
  INSERT INTO auth.users (id, email, aud, role) VALUES
    (a, a || '@t.local', 'authenticated', 'authenticated'),
    (b, b || '@t.local', 'authenticated', 'authenticated');

  -- B saját borítója (szolgáltatói szerepben létrehozva, mintha B töltötte volna fel)
  INSERT INTO storage.objects (bucket_id, name, owner_id) VALUES ('trip-covers', b || '/b-cover.jpg', b::text);

  PERFORM set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;

  -- A a saját mappájába írhat (borító, avatar, saját képtár)
  INSERT INTO storage.objects (bucket_id, name, owner_id) VALUES ('trip-covers', a || '/a-cover.jpg', a::text);
  INSERT INTO storage.objects (bucket_id, name, owner_id) VALUES ('avatars', a || '/a-avatar.png', a::text);
  INSERT INTO storage.objects (bucket_id, name, owner_id) VALUES ('user-images', a || '/a-img.webp', a::text);

  -- A nem írhat B mappájába
  BEGIN
    INSERT INTO storage.objects (bucket_id, name, owner_id) VALUES ('trip-covers', b || '/evil.jpg', a::text);
    RAISE EXCEPTION 'FAIL: A wrote into B folder';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  -- A nem írhat a bucket gyökerébe vagy a rendszer samples/ mappájába
  BEGIN
    INSERT INTO storage.objects (bucket_id, name, owner_id) VALUES ('trip-covers', 'samples/evil.jpg', a::text);
    RAISE EXCEPTION 'FAIL: A wrote into samples/';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  -- A nem írhat a trip-gallery bucketbe (még nincs írója)
  BEGIN
    INSERT INTO storage.objects (bucket_id, name, owner_id) VALUES ('trip-gallery', a || '/g.jpg', a::text);
    RAISE EXCEPTION 'FAIL: A wrote into trip-gallery';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  -- A nem módosíthatja B borítóját (a szabály elrejti a sort: 0 érintett sor)
  UPDATE storage.objects SET name = b || '/renamed.jpg' WHERE bucket_id = 'trip-covers' AND name = b || '/b-cover.jpg';
  GET DIAGNOSTICS n = ROW_COUNT;
  ASSERT n = 0, 'FAIL: A updated B cover (' || n || ' rows)';

  -- A a saját fájlját nem viheti át B mappájába (WITH CHECK)
  BEGIN
    UPDATE storage.objects SET name = b || '/stolen.jpg' WHERE bucket_id = 'trip-covers' AND name = a || '/a-cover.jpg';
    RAISE EXCEPTION 'FAIL: A moved own file into B folder';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  -- Olvasás változatlanul publikus
  SELECT count(*) INTO n FROM storage.objects WHERE bucket_id = 'trip-covers' AND name = b || '/b-cover.jpg';
  ASSERT n = 1, 'FAIL: public read of trip-covers broken';

  RAISE NOTICE '058 storage owner policies: PASS';
END $$;
ROLLBACK;

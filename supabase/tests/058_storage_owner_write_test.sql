-- Tranzakciós füstteszt a 058-as migrációhoz (storage: írás és listázás csak a saját mappában).
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

  -- B fájljai (szolgáltatói szerepben létrehozva, mintha B töltötte volna fel)
  INSERT INTO storage.objects (bucket_id, name, owner_id) VALUES
    ('trip-covers', b || '/b-cover.jpg', b::text),
    ('avatars', b || '/b-avatar.png', b::text);

  -- Névtelen látogató: nem listáz, nem ír
  PERFORM set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  SET LOCAL ROLE anon;
  SELECT count(*) INTO n FROM storage.objects WHERE bucket_id IN ('trip-covers', 'avatars', 'user-images', 'trip-gallery');
  ASSERT n = 0, 'FAIL: anon can list objects (' || n || ')';
  BEGIN
    INSERT INTO storage.objects (bucket_id, name) VALUES ('trip-covers', 'anon/x.jpg');
    RAISE EXCEPTION 'FAIL: anon inserted';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RESET ROLE;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;

  -- A a saját mappájába írhat (borító, avatar, saját képtár)
  INSERT INTO storage.objects (bucket_id, name, owner_id) VALUES ('trip-covers', a || '/a-cover.jpg', a::text);
  INSERT INTO storage.objects (bucket_id, name, owner_id) VALUES ('avatars', a || '/a-avatar.png', a::text);
  INSERT INTO storage.objects (bucket_id, name, owner_id) VALUES ('user-images', a || '/a-img.webp', a::text);

  -- A csak a saját fájljait látja
  SELECT count(*) INTO n FROM storage.objects WHERE bucket_id IN ('trip-covers', 'avatars', 'user-images');
  ASSERT n = 3, 'FAIL: A sees ' || n || ' objects instead of its own 3';

  -- A nem írhat B mappájába — egyik bucketben sem
  BEGIN
    INSERT INTO storage.objects (bucket_id, name, owner_id) VALUES ('trip-covers', b || '/evil.jpg', a::text);
    RAISE EXCEPTION 'FAIL: A wrote into B trip-covers folder';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    INSERT INTO storage.objects (bucket_id, name, owner_id) VALUES ('avatars', b || '/evil.png', a::text);
    RAISE EXCEPTION 'FAIL: A wrote into B avatars folder';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    INSERT INTO storage.objects (bucket_id, name, owner_id) VALUES ('user-images', b || '/evil.webp', a::text);
    RAISE EXCEPTION 'FAIL: A wrote into B user-images folder';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  -- A nem írhat a bucket gyökerébe vagy a rendszer samples/ mappájába
  BEGIN
    INSERT INTO storage.objects (bucket_id, name, owner_id) VALUES ('trip-covers', 'samples/evil.jpg', a::text);
    RAISE EXCEPTION 'FAIL: A wrote into samples/';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    INSERT INTO storage.objects (bucket_id, name, owner_id) VALUES ('trip-covers', 'root.jpg', a::text);
    RAISE EXCEPTION 'FAIL: A wrote into the bucket root';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  -- A nem írhat a trip-gallery bucketbe (még nincs írója)
  BEGIN
    INSERT INTO storage.objects (bucket_id, name, owner_id) VALUES ('trip-gallery', a || '/g.jpg', a::text);
    RAISE EXCEPTION 'FAIL: A wrote into trip-gallery';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  -- A „..” nem támadási felület: a kulcs szó szerinti, B „<b>/x.jpg” kulcsa nem jön létre
  INSERT INTO storage.objects (bucket_id, name, owner_id) VALUES ('trip-covers', a || '/../' || b || '/x.jpg', a::text);
  RESET ROLE;
  SELECT count(*) INTO n FROM storage.objects WHERE bucket_id = 'trip-covers' AND name = b || '/x.jpg';
  ASSERT n = 0, 'FAIL: ".." created a key in B folder';
  SET LOCAL ROLE authenticated;

  -- A nem módosíthatja és nem törölheti B borítóját (a szabály elrejti a sort: 0 érintett sor)
  UPDATE storage.objects SET name = b || '/renamed.jpg' WHERE bucket_id = 'trip-covers' AND name = b || '/b-cover.jpg';
  GET DIAGNOSTICS n = ROW_COUNT;
  ASSERT n = 0, 'FAIL: A updated B cover (' || n || ' rows)';
  BEGIN
    DELETE FROM storage.objects WHERE bucket_id = 'trip-covers' AND name = b || '/b-cover.jpg';
    GET DIAGNOSTICS n = ROW_COUNT;
    ASSERT n = 0, 'FAIL: A deleted B cover (' || n || ' rows)';
  EXCEPTION WHEN OTHERS THEN
    -- a storage.protect_delete() trigger minden közvetlen SQL DELETE-et tilt („Direct deletion …”) —
    -- ez is elfogadható (a Storage API-n át a DELETE-szabály dönt); minden más hiba bukás
    IF SQLERRM NOT LIKE 'Direct deletion%' THEN RAISE; END IF;
  END;

  -- A a saját fájlját nem viheti át B mappájába (WITH CHECK)
  BEGIN
    UPDATE storage.objects SET name = b || '/stolen.jpg' WHERE bucket_id = 'trip-covers' AND name = a || '/a-cover.jpg';
    RAISE EXCEPTION 'FAIL: A moved own file into B folder';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  RESET ROLE;
  SELECT count(*) INTO n FROM storage.objects WHERE bucket_id = 'trip-covers' AND name = b || '/b-cover.jpg';
  ASSERT n = 1, 'FAIL: B cover is gone';

  RAISE NOTICE '058 storage owner policies: PASS';
END $$;
ROLLBACK;

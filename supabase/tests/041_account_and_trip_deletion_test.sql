-- Tranzakciós füstteszt a 041-es migrációhoz. Futtatás: psql -v ON_ERROR_STOP=1 -f <fájl> (a végén ROLLBACK).
BEGIN;
DO $$
DECLARE
  org uuid := gen_random_uuid(); guest uuid := gen_random_uuid(); banned uuid := gen_random_uuid();
  cat uuid := (SELECT id FROM public.categories LIMIT 1);
  draft uuid; lonely uuid; busy uuid; res jsonb;
BEGIN
  INSERT INTO auth.users (id, email, aud, role) VALUES
    (org, org || '@t.local', 'authenticated', 'authenticated'),
    (guest, guest || '@t.local', 'authenticated', 'authenticated'),
    (banned, banned || '@t.local', 'authenticated', 'authenticated');
  INSERT INTO public.profiles (id, display_name, slug, first_name, email)
  SELECT u, 'T ' || u, 't-' || u, 'T', u || '@t.local' FROM unnest(ARRAY[org, guest, banned]) u
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.trips (organizer_id, title, slug, description, difficulty, location_country, max_participants, status, visibility, category_id, start_date, end_date, cover_image_url)
  VALUES (org, 'Draft', 'd-' || org, 'x', 2, 'HU', 8, 'draft', 'private', cat, '2027-01-01', '2027-01-02', NULL) RETURNING id INTO draft;
  INSERT INTO public.trips (organizer_id, title, slug, description, difficulty, location_country, max_participants, status, visibility, category_id, start_date, end_date, cover_image_url)
  VALUES (org, 'Lonely', 'l-' || org, 'x', 2, 'HU', 8, 'published', 'public', cat, '2027-01-01', '2027-01-02', 'https://e.x/c.jpg') RETURNING id INTO lonely;
  INSERT INTO public.trips (organizer_id, title, slug, description, difficulty, location_country, max_participants, status, visibility, category_id, start_date, end_date, cover_image_url, require_approval)
  VALUES (org, 'Busy', 'b-' || org, 'x', 2, 'HU', 8, 'published', 'public', cat, '2027-01-01', '2027-01-02', 'https://e.x/c.jpg', false) RETURNING id INTO busy;
  INSERT INTO public.trip_participants (trip_id, user_id, status) VALUES (busy, guest, 'approved');

  PERFORM set_config('request.jwt.claims', json_build_object('sub', org, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;

  -- A szervező nem törölheti a fiókját, amíg két publikált túrája van.
  res := public.request_account_deletion();
  ASSERT res->>'status' = 'blocked' AND jsonb_array_length(res->'trips') = 2, 'blocked: ' || res;

  res := public.delete_or_cancel_trip(draft);
  ASSERT res->>'result' = 'deleted', 'draft: ' || res;
  ASSERT NOT EXISTS (SELECT 1 FROM public.trips WHERE id = draft), 'draft still exists';

  res := public.delete_or_cancel_trip(lonely);
  ASSERT res->>'result' = 'soft_deleted', 'lonely: ' || res;
  ASSERT (SELECT count(*) FROM public.my_deleted_trips()) = 1, 'my_deleted_trips';

  BEGIN
    res := public.delete_or_cancel_trip(busy);
    ASSERT false, 'busy without reason must fail';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  res := public.delete_or_cancel_trip(busy, 'weather', 'Vihar');
  ASSERT res->>'result' = 'cancelled' AND (res->>'applicants')::int = 1, 'busy: ' || res;

  res := public.restore_trip(lonely);
  ASSERT res->>'result' = 'restored', 'restore trip: ' || res;

  -- Self-unban tilalom: a felhasználó nem írhatja a deleted_at mezőt.
  BEGIN
    UPDATE public.profiles SET deleted_at = now() WHERE id = org;
    ASSERT false, 'deleted_at must be read-only';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  -- A vendég: jelentkezése lemondva, látja a lemondott túrát; fiókja törölhető és visszaállítható.
  PERFORM set_config('request.jwt.claims', json_build_object('sub', guest, 'role', 'authenticated')::text, true);
  ASSERT (SELECT status::text FROM public.trips WHERE id = busy) = 'cancelled', 'participant sees cancelled trip';
  res := public.request_account_deletion();
  ASSERT res->>'status' = 'scheduled', 'guest delete: ' || res;
  ASSERT (SELECT pending_deletion FROM public.account_deletion_status()), 'pending';
  res := public.restore_account();
  ASSERT res->>'status' = 'restored', 'restore account: ' || res;

  -- Tiltott fiók nem állíthatja vissza magát.
  RESET ROLE;
  UPDATE public.profiles SET deleted_at = now() WHERE id = banned;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', banned, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  ASSERT (SELECT suspended FROM public.account_deletion_status()), 'suspended';
  BEGIN
    res := public.restore_account();
    ASSERT false, 'banned restore must fail';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  -- Lejárat: service_role anonimizál.
  RESET ROLE;
  UPDATE public.profiles SET deleted_at = now(), deletion_requested_at = now() - interval '31 days',
    deletion_scheduled_for = now() - interval '1 day' WHERE id = guest;
  res := public.purge_expired_deletions();
  ASSERT (res->>'anonymized_profiles')::int >= 1, 'purge: ' || res;
  ASSERT (SELECT email FROM public.profiles WHERE id = guest) IS NULL, 'anonymized email';
  ASSERT (SELECT email FROM auth.users WHERE id = guest) LIKE 'deleted-%', 'auth email';
  RAISE NOTICE '041 smoke test PASS';
END $$;
ROLLBACK;

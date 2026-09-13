-- Run against an isolated database with migration 031 applied. All fixtures rollback.
\set ON_ERROR_STOP on
BEGIN;
INSERT INTO public.profiles(id, display_name, slug, email) VALUES
('00000000-0000-4000-8000-000000000001','Owner','audit-owner','owner@audit.local'),
('00000000-0000-4000-8000-000000000002','Applicant','audit-applicant','applicant@audit.local'),
('00000000-0000-4000-8000-000000000003','Other','audit-other','other@audit.local');
INSERT INTO public.categories(id,name,icon_name,color_hex,display_order) VALUES
('00000000-0000-4000-8000-000000000010','audit','footprints','#000000',999);
INSERT INTO public.trips(id,organizer_id,category_id,title,slug,description,difficulty,start_date,end_date,location_country,max_participants,min_participants,status,visibility,require_approval,cover_image_url) VALUES
('00000000-0000-4000-8000-000000000020','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000010','Audit trip','audit-trip','Test',1,'2027-01-01','2027-01-02','HU',2,2,'published','public',true,'https://example.com/cover.jpg');
SET LOCAL ROLE anon;
DO $$ BEGIN
  PERFORM display_name FROM public.profiles;
  BEGIN PERFORM email FROM public.profiles; RAISE EXCEPTION 'FAIL: public email readable';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000002","role":"authenticated","email":"applicant@audit.local"}',true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF public.get_my_profile()->>'email' IS DISTINCT FROM 'applicant@audit.local' THEN RAISE EXCEPTION 'FAIL own profile'; END IF;
  BEGIN UPDATE public.profiles SET verified_organizer=true WHERE id=auth.uid();
    RAISE EXCEPTION 'FAIL trust escalation'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN UPDATE public.profiles SET subscription_tier='pro' WHERE id=auth.uid();
    RAISE EXCEPTION 'FAIL billing escalation'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN INSERT INTO public.profiles(id,display_name,slug,email,verified_organizer)
    VALUES (auth.uid(),'Injected','injected','applicant@audit.local',true);
    RAISE EXCEPTION 'FAIL insert escalation'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  UPDATE public.profiles SET display_name='Edited' WHERE id=auth.uid();
  INSERT INTO public.trip_participants(trip_id,user_id,status) VALUES
    ('00000000-0000-4000-8000-000000000020',auth.uid(),'pending');
  BEGIN UPDATE public.trip_participants SET status='approved' WHERE user_id=auth.uid();
    RAISE EXCEPTION 'FAIL self approval'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  UPDATE public.trip_participants SET status='cancelled' WHERE user_id=auth.uid();
  UPDATE public.trip_participants SET status='pending' WHERE user_id=auth.uid();
  PERFORM public.replace_my_interests(ARRAY['00000000-0000-4000-8000-000000000010']::uuid[]);
  BEGIN PERFORM public.replace_my_interests(ARRAY['00000000-0000-4000-8000-000000000099']::uuid[]);
    RAISE EXCEPTION 'FAIL invalid category accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
  IF (SELECT count(*) FROM public.user_adventure_interests WHERE user_id=auth.uid()) <> 1 THEN
    RAISE EXCEPTION 'FAIL interest rollback'; END IF;
END $$;
RESET ROLE;
-- Organizer may approve; counter increases exactly once.
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated","email":"owner@audit.local"}',true);
SET LOCAL ROLE authenticated;
UPDATE public.trip_participants SET status='approved' WHERE trip_id='00000000-0000-4000-8000-000000000020';
RESET ROLE;
DO $$ BEGIN
  IF (SELECT current_participants FROM public.trips WHERE id='00000000-0000-4000-8000-000000000020') <> 1 THEN
    RAISE EXCEPTION 'FAIL participant count'; END IF;
END $$;
-- Direct approved INSERT must also be rejected, not just UPDATE.
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000003","role":"authenticated","email":"other@audit.local"}',true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  BEGIN INSERT INTO public.trip_participants(trip_id,user_id,status) VALUES
    ('00000000-0000-4000-8000-000000000020',auth.uid(),'approved');
    RAISE EXCEPTION 'FAIL approved insert'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
ROLLBACK;
\echo 'PASS: profile privacy, protected fields, application transitions, counters, atomic interests'

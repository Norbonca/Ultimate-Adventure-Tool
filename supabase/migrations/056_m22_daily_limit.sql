-- F06: enforce the caller's daily limit, including simultaneous submissions.
-- No backfill: this changes admission of future rows, not stored state.
BEGIN;
CREATE OR REPLACE FUNCTION public.trip_idea_daily_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE n integer; lim integer;
BEGIN
  -- current_user is the function owner in a SECURITY DEFINER function.
  IF coalesce(auth.role(), '') NOT IN ('anon', 'authenticated') THEN RETURN NEW; END IF;
  IF auth.uid() IS NULL OR NEW.owner_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'idea_owner_required' USING ERRCODE = '42501';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(NEW.owner_id::text, 22));
  SELECT coalesce((value)::text::integer, 3) INTO lim
    FROM public.system_settings WHERE key = 'trip_idea_daily_create_limit';
  SELECT count(*) INTO n FROM public.trip_ideas
    WHERE owner_id = NEW.owner_id AND created_at >= now() - interval '24 hours';
  IF n >= coalesce(lim, 3) THEN
    RAISE EXCEPTION 'daily_limit' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
COMMIT;

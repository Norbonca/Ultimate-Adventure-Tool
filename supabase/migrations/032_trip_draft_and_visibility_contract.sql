-- Match the existing wizard contract: drafts can be incomplete, discovery opt-in persists.
BEGIN;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS show_on_landing boolean NOT NULL DEFAULT true;
ALTER TABLE public.trips ALTER COLUMN category_id DROP NOT NULL;
ALTER TABLE public.trips ALTER COLUMN start_date DROP NOT NULL;
ALTER TABLE public.trips ALTER COLUMN end_date DROP NOT NULL;
COMMENT ON COLUMN public.trips.show_on_landing IS 'Organizer opt-in for public discovery listing.';

CREATE OR REPLACE FUNCTION public.guard_trip_publication()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF NEW.status::text IN ('published','registration_open') THEN
    IF NEW.category_id IS NULL OR length(trim(NEW.title)) < 3
      OR NEW.start_date IS NULL OR NEW.end_date IS NULL OR NEW.end_date < NEW.start_date
      OR NEW.cover_image_url IS NULL OR NEW.cover_image_url = '' THEN
      RAISE EXCEPTION 'publication_required_fields' USING ERRCODE = '23514';
    END IF;
    IF TG_OP = 'UPDATE' AND OLD.published_at IS NOT NULL THEN
      NEW.published_at := OLD.published_at;
    ELSE
      NEW.published_at := COALESCE(NEW.published_at, now());
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guard_trip_publication ON public.trips;
-- Counter-only updates must also work for legacy publications with incomplete metadata.
CREATE TRIGGER guard_trip_publication BEFORE INSERT OR UPDATE OF status, title, category_id,
 start_date, end_date, cover_image_url, published_at ON public.trips
FOR EACH ROW EXECUTE FUNCTION public.guard_trip_publication();
COMMIT;

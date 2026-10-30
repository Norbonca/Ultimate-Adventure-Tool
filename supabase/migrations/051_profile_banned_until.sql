-- Migration 051: a felhasználói tiltás időtartama érvényesül (profiles.banned_until)
--
-- Hiba (hubnote „lappangó hiba”, 2026-08-29): az admin 1 nap / 7 nap / 30 nap / végleges tiltást választ,
-- de a kód csak a deleted_at-et írta — a tiltás mindig véglegesként viselkedett. Norbert (2026-10-30): javítani.
--
-- 1. profiles.banned_until: a határozott idejű tiltás vége (NULL = végleges, vagy nincs tiltás).
-- 2. guard_profile_system_fields: a banned_until is rendszermező (kliens nem írhatja).
-- 3. account_deletion_status(): a lejárt tiltás már nem számít felfüggesztésnek (azonnali hatás, a
--    takarítás előtt is).
-- 4. lift_expired_bans(): a lejárt tiltások feloldása (deleted_at és banned_until NULL), csak service_role;
--    pg_cron óránként (:23).
-- Idempotens. Az M121 migrációja 052-től.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banned_until timestamptz;
COMMENT ON COLUMN public.profiles.banned_until IS
  'Admin tiltás vége (deleted_at + deletion_requested_at IS NULL mellett). NULL = végleges tiltás vagy nincs tiltás. A lift_expired_bans() oldja fel.';
CREATE INDEX IF NOT EXISTS idx_profiles_banned_until ON public.profiles (banned_until) WHERE banned_until IS NOT NULL;

CREATE OR REPLACE FUNCTION public.guard_profile_system_fields()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated') THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.subscription_tier::text <> 'free'
        OR NEW.subscription_expires_at IS NOT NULL OR NEW.stripe_customer_id IS NOT NULL
        OR NEW.reputation_points <> 0 OR NEW.reputation_level <> 1
        OR NEW.verified_organizer OR NEW.email_verified OR NEW.two_fa_enabled
        OR NEW.deleted_at IS NOT NULL OR NEW.deletion_requested_at IS NOT NULL
        OR NEW.deletion_scheduled_for IS NOT NULL OR NEW.banned_until IS NOT NULL THEN
        RAISE EXCEPTION 'profile_system_fields_read_only' USING ERRCODE = '42501';
      END IF;
    ELSIF ROW(NEW.subscription_tier, NEW.subscription_expires_at, NEW.stripe_customer_id,
        NEW.reputation_points, NEW.reputation_level, NEW.verified_organizer,
        NEW.email_verified, NEW.two_fa_enabled,
        NEW.deleted_at, NEW.deletion_requested_at, NEW.deletion_scheduled_for, NEW.banned_until)
      IS DISTINCT FROM ROW(OLD.subscription_tier, OLD.subscription_expires_at, OLD.stripe_customer_id,
        OLD.reputation_points, OLD.reputation_level, OLD.verified_organizer,
        OLD.email_verified, OLD.two_fa_enabled,
        OLD.deleted_at, OLD.deletion_requested_at, OLD.deletion_scheduled_for, OLD.banned_until) THEN
      RAISE EXCEPTION 'profile_system_fields_read_only' USING ERRCODE = '42501';
    END IF;
    IF NEW.email IS DISTINCT FROM (auth.jwt()->>'email') THEN
      RAISE EXCEPTION 'profile_email_must_match_auth' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.account_deletion_status()
RETURNS TABLE (pending_deletion boolean, deletion_scheduled_for timestamptz, suspended boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT p.deleted_at IS NOT NULL AND p.deletion_requested_at IS NOT NULL,
         p.deletion_scheduled_for,
         p.deleted_at IS NOT NULL AND p.deletion_requested_at IS NULL
           AND (p.banned_until IS NULL OR p.banned_until > now())
  FROM public.profiles p
  WHERE p.id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.lift_expired_bans()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  n integer;
BEGIN
  UPDATE public.profiles
  SET deleted_at = NULL, banned_until = NULL
  WHERE banned_until IS NOT NULL AND banned_until <= now()
    AND deletion_requested_at IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;
REVOKE ALL ON FUNCTION public.lift_expired_bans() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lift_expired_bans() TO service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'lift-expired-bans') THEN
      PERFORM cron.unschedule('lift-expired-bans');
    END IF;
    PERFORM cron.schedule('lift-expired-bans', '23 * * * *', 'SELECT public.lift_expired_bans()');
  END IF;
END;
$$;

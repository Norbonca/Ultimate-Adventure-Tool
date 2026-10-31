-- Migration 052: M22 Trip Ideas (Ötletbörze) — V1 séma
-- Spec: modules/22_Trip_Ideas/01_Funkcionalis_Specifikacio.md (9. fejezet logikai modell, 7. üzleti szabályok,
-- 8. életciklus, 17. döntések — Norbert, 2026-10-31). Terv: design/D22_Trip_Ideas.pen.
--
-- Táblák: trip_ideas, trip_idea_destinations (országkódok text[]), trip_idea_members, trip_idea_organizer_offers,
-- trip_idea_trips, trip_idea_reports (M05 content_reports még nincs — ideiglenes saját tábla).
-- Számlálók triggerrel (member_count, party_size_total), állapot-újraszámítás (8.1), lejárat (pg_cron naponta),
-- RLS a BR-M22-006 láthatósági táblája szerint. system_settings kulcsok (BR-M22-002, NyK-03).
-- Idempotens. Az M121 migrációja 053-tól.

-- ── Enumok ─────────────────────────────────────────────────────────────────────
DO $$ BEGIN CREATE TYPE public.trip_idea_status_t AS ENUM ('open','organizing','converted','expired','closed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.trip_idea_moderation_t AS ENUM ('none','under_review','removed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.trip_idea_intent_t AS ENUM ('seeking_organizer','seeking_companions','will_organize'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.trip_idea_visibility_t AS ENUM ('public','followers_only','link_only'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.trip_idea_closed_reason_t AS ENUM ('realized','no_longer_relevant','other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.trip_idea_member_status_t AS ENUM ('active','left'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.trip_idea_offer_status_t AS ENUM ('active','withdrawn'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── trip_ideas ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.trip_ideas (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id            uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  slug                text NOT NULL UNIQUE,
  title               text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 10 AND 120),
  description         text CHECK (description IS NULL OR char_length(description) <= 2000),
  category_id         uuid NOT NULL REFERENCES public.categories(id),
  sub_discipline_id   uuid REFERENCES public.sub_disciplines(id),
  window_start_month  smallint NOT NULL CHECK (window_start_month BETWEEN 1 AND 12),
  window_end_month    smallint NOT NULL CHECK (window_end_month BETWEEN 1 AND 12),
  window_year         smallint NOT NULL CHECK (window_year BETWEEN 2024 AND 2100),
  window_start_date   date NOT NULL,
  window_end_date     date NOT NULL,
  period_key          text,
  duration_min_days   smallint CHECK (duration_min_days IS NULL OR duration_min_days BETWEEN 1 AND 90),
  duration_max_days   smallint CHECK (duration_max_days IS NULL OR duration_max_days BETWEEN 1 AND 90),
  difficulty          smallint CHECK (difficulty IS NULL OR difficulty BETWEEN 1 AND 5),
  group_size_min      smallint CHECK (group_size_min IS NULL OR group_size_min BETWEEN 2 AND 50),
  group_size_max      smallint CHECK (group_size_max IS NULL OR group_size_max BETWEEN 2 AND 50),
  budget_amount       numeric(12,2) CHECK (budget_amount IS NULL OR budget_amount > 0),
  budget_currency     varchar(3) REFERENCES public.ref_currencies(code),
  intent              public.trip_idea_intent_t NOT NULL DEFAULT 'seeking_organizer',
  visibility          public.trip_idea_visibility_t NOT NULL DEFAULT 'public',
  language            char(2) NOT NULL DEFAULT 'hu',
  status              public.trip_idea_status_t NOT NULL DEFAULT 'open',
  moderation_status   public.trip_idea_moderation_t NOT NULL DEFAULT 'none',
  closed_reason       public.trip_idea_closed_reason_t,
  closed_at           timestamptz,
  expires_at          timestamptz NOT NULL,
  timezone            text NOT NULL DEFAULT 'UTC',
  member_count        integer NOT NULL DEFAULT 0,
  party_size_total    integer NOT NULL DEFAULT 0,
  offer_count         integer NOT NULL DEFAULT 0,
  created_via         text NOT NULL DEFAULT 'form' CHECK (created_via IN ('form','discover_empty','taste_result','board')),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  deleted_at          timestamptz,
  CONSTRAINT trip_ideas_duration_order CHECK (duration_min_days IS NULL OR duration_max_days IS NULL OR duration_max_days >= duration_min_days),
  CONSTRAINT trip_ideas_group_order CHECK (group_size_min IS NULL OR group_size_max IS NULL OR group_size_max >= group_size_min),
  CONSTRAINT trip_ideas_window_order CHECK (window_end_date >= window_start_date)
);
COMMENT ON TABLE public.trip_ideas IS 'M22: túraötlet. A csatlakozás érdeklődés, nem jelentkezés (BR-M22-001). Az időablak abszolút (hónap+év), a lejárat az ötletgazda zónája szerint (NyK-01).';
CREATE INDEX IF NOT EXISTS idx_trip_ideas_board ON public.trip_ideas (status, visibility, moderation_status, member_count DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_trip_ideas_owner ON public.trip_ideas (owner_id);
CREATE INDEX IF NOT EXISTS idx_trip_ideas_window ON public.trip_ideas (window_start_date, window_end_date);
CREATE INDEX IF NOT EXISTS idx_trip_ideas_category ON public.trip_ideas (category_id);
CREATE INDEX IF NOT EXISTS idx_trip_ideas_expires ON public.trip_ideas (expires_at) WHERE status IN ('open','organizing','converted');

-- ── Célterületek ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.trip_idea_destinations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id       uuid NOT NULL REFERENCES public.trip_ideas(id) ON DELETE CASCADE,
  name          text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 2 AND 100),
  continent     text,
  country_codes text[] NOT NULL DEFAULT '{}',
  sort_order    smallint NOT NULL DEFAULT 0,
  CONSTRAINT trip_idea_destination_place CHECK (continent IS NOT NULL OR cardinality(country_codes) > 0)
);
CREATE INDEX IF NOT EXISTS idx_trip_idea_destinations_idea ON public.trip_idea_destinations (idea_id);
CREATE INDEX IF NOT EXISTS idx_trip_idea_destinations_countries ON public.trip_idea_destinations USING gin (country_codes);

CREATE OR REPLACE FUNCTION public.validate_trip_idea_destination()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE bad text; n integer;
BEGIN
  SELECT c INTO bad FROM unnest(NEW.country_codes) AS c
   WHERE NOT EXISTS (SELECT 1 FROM public.ref_countries r WHERE r.code = c AND r.is_active) LIMIT 1;
  IF bad IS NOT NULL THEN RAISE EXCEPTION 'invalid_country_code: %', bad USING ERRCODE = '22023'; END IF;
  SELECT count(*) INTO n FROM public.trip_idea_destinations d WHERE d.idea_id = NEW.idea_id AND d.id <> NEW.id;
  IF n >= 5 THEN RAISE EXCEPTION 'destination_max' USING ERRCODE = '23514'; END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_validate_trip_idea_destination ON public.trip_idea_destinations;
CREATE TRIGGER trg_validate_trip_idea_destination BEFORE INSERT OR UPDATE ON public.trip_idea_destinations
FOR EACH ROW EXECUTE FUNCTION public.validate_trip_idea_destination();

-- ── Csatlakozók ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.trip_idea_members (
  idea_id               uuid NOT NULL REFERENCES public.trip_ideas(id) ON DELETE CASCADE,
  user_id               uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status                public.trip_idea_member_status_t NOT NULL DEFAULT 'active',
  is_anonymous          boolean NOT NULL DEFAULT false,
  note                  text CHECK (note IS NULL OR char_length(note) <= 300),
  preferred_months      smallint[] NOT NULL DEFAULT '{}',
  party_size            smallint NOT NULL DEFAULT 1 CHECK (party_size BETWEEN 1 AND 10),
  notifications_enabled boolean NOT NULL DEFAULT true,
  joined_via            text NOT NULL DEFAULT 'detail' CHECK (joined_via IN ('detail','discover_empty','similar_offer','link','owner')),
  joined_at             timestamptz NOT NULL DEFAULT now(),
  left_at               timestamptz,
  PRIMARY KEY (idea_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_trip_idea_members_user ON public.trip_idea_members (user_id) WHERE status = 'active';

-- ── Vállalások ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.trip_idea_organizer_offers (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id        uuid NOT NULL REFERENCES public.trip_ideas(id) ON DELETE CASCADE,
  organizer_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message        text CHECK (message IS NULL OR char_length(message) <= 500),
  planned_months smallint[] NOT NULL DEFAULT '{}',
  status         public.trip_idea_offer_status_t NOT NULL DEFAULT 'active',
  created_at     timestamptz NOT NULL DEFAULT now(),
  withdrawn_at   timestamptz,
  UNIQUE (idea_id, organizer_id)
);

-- ── Kapcsolt túrák ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.trip_idea_trips (
  idea_id     uuid NOT NULL REFERENCES public.trip_ideas(id) ON DELETE CASCADE,
  trip_id     uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  created_by  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  notified_at timestamptz,
  PRIMARY KEY (idea_id, trip_id)
);
CREATE INDEX IF NOT EXISTS idx_trip_idea_trips_trip ON public.trip_idea_trips (trip_id);

-- ── Bejelentések (M05 content_reports hiányában; GAP-005) ─────────────────────
CREATE TABLE IF NOT EXISTS public.trip_idea_reports (
  idea_id     uuid NOT NULL REFERENCES public.trip_ideas(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason      text NOT NULL CHECK (reason IN ('spam','hidden_commercial','inappropriate','other')),
  details     text CHECK (details IS NULL OR char_length(details) <= 500),
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (idea_id, reporter_id)
);

-- ── system_settings (BR-M22-002 lazán, NyK-03; Norbert 2026-10-30/31) ───────
INSERT INTO public.system_settings (key, value, description) VALUES
  ('trip_idea_report_threshold', '3', 'M22: ennyi különböző bejelentés után under_review'),
  ('trip_idea_organizer_notify_threshold', '5', 'M22: ennyi csatlakozónál értesülnek az illeszkedő szervezők'),
  ('trip_idea_low_result_threshold', '3', 'M22: ennyi találat alatt jelenik meg a teljes ötletblokk a Felfedezésen'),
  ('trip_idea_daily_create_limit', '3', 'M22: napi beküldési korlát felhasználónként'),
  ('trip_idea_min_destination_precision', '"continent"', 'M22: continent | country — legmegengedőbb'),
  ('trip_idea_max_window_months', '12', 'M22: az időablak legfeljebb ennyi hónap'),
  ('trip_idea_require_sub_discipline', 'false', 'M22'),
  ('trip_idea_require_min_duration', 'false', 'M22'),
  ('trip_idea_min_description_length', '0', 'M22: 0 = nem kötelező')
ON CONFLICT (key) DO NOTHING;

-- ── Láthatóság (BR-M22-006) ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_platform_admin_user(p_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.admin_roles a WHERE a.user_id = p_user AND a.is_active);
$$;

CREATE OR REPLACE FUNCTION public.can_view_trip_idea(p_idea_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trip_ideas i
    WHERE i.id = p_idea_id AND i.deleted_at IS NULL
      AND (
        i.owner_id = auth.uid()
        OR public.is_platform_admin_user(auth.uid())
        OR (
          i.moderation_status = 'none'
          AND (
            i.visibility IN ('public','link_only')
            OR (i.visibility = 'followers_only' AND auth.uid() IS NOT NULL AND (
                 EXISTS (SELECT 1 FROM public.user_follows f WHERE f.following_id = i.owner_id AND f.follower_id = auth.uid())
              OR EXISTS (SELECT 1 FROM public.trip_idea_members m WHERE m.idea_id = i.id AND m.user_id = auth.uid() AND m.status = 'active')))
          )
        )
      )
  );
$$;
GRANT EXECUTE ON FUNCTION public.can_view_trip_idea(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_platform_admin_user(uuid) TO anon, authenticated, service_role;

ALTER TABLE public.trip_ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_idea_destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_idea_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_idea_organizer_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_idea_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_idea_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS trip_ideas_select ON public.trip_ideas;
CREATE POLICY trip_ideas_select ON public.trip_ideas FOR SELECT USING (public.can_view_trip_idea(id));
DROP POLICY IF EXISTS trip_ideas_insert ON public.trip_ideas;
CREATE POLICY trip_ideas_insert ON public.trip_ideas FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
DROP POLICY IF EXISTS trip_ideas_update ON public.trip_ideas;
CREATE POLICY trip_ideas_update ON public.trip_ideas FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS trip_idea_destinations_select ON public.trip_idea_destinations;
CREATE POLICY trip_idea_destinations_select ON public.trip_idea_destinations FOR SELECT USING (public.can_view_trip_idea(idea_id));
DROP POLICY IF EXISTS trip_idea_destinations_write ON public.trip_idea_destinations;
CREATE POLICY trip_idea_destinations_write ON public.trip_idea_destinations FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.trip_ideas i WHERE i.id = idea_id AND i.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.trip_ideas i WHERE i.id = idea_id AND i.owner_id = auth.uid()));

-- Csatlakozók: a lista azé, aki az ötletet látja; a megjegyzést csak az ötletgazda és a vállalók — a kód szűri (a sor látszik)
DROP POLICY IF EXISTS trip_idea_members_select ON public.trip_idea_members;
CREATE POLICY trip_idea_members_select ON public.trip_idea_members FOR SELECT USING (public.can_view_trip_idea(idea_id));
DROP POLICY IF EXISTS trip_idea_members_write ON public.trip_idea_members;
CREATE POLICY trip_idea_members_write ON public.trip_idea_members FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid() AND public.can_view_trip_idea(idea_id));

DROP POLICY IF EXISTS trip_idea_offers_select ON public.trip_idea_organizer_offers;
CREATE POLICY trip_idea_offers_select ON public.trip_idea_organizer_offers FOR SELECT USING (public.can_view_trip_idea(idea_id));
DROP POLICY IF EXISTS trip_idea_offers_write ON public.trip_idea_organizer_offers;
CREATE POLICY trip_idea_offers_write ON public.trip_idea_organizer_offers FOR ALL TO authenticated
  USING (organizer_id = auth.uid()) WITH CHECK (organizer_id = auth.uid() AND public.can_view_trip_idea(idea_id));

DROP POLICY IF EXISTS trip_idea_trips_select ON public.trip_idea_trips;
CREATE POLICY trip_idea_trips_select ON public.trip_idea_trips FOR SELECT USING (public.can_view_trip_idea(idea_id));
DROP POLICY IF EXISTS trip_idea_trips_insert ON public.trip_idea_trips;
CREATE POLICY trip_idea_trips_insert ON public.trip_idea_trips FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND EXISTS (SELECT 1 FROM public.trips t WHERE t.id = trip_id AND t.organizer_id = auth.uid()));

DROP POLICY IF EXISTS trip_idea_reports_insert ON public.trip_idea_reports;
CREATE POLICY trip_idea_reports_insert ON public.trip_idea_reports FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid());
DROP POLICY IF EXISTS trip_idea_reports_select_own ON public.trip_idea_reports;
CREATE POLICY trip_idea_reports_select_own ON public.trip_idea_reports FOR SELECT TO authenticated USING (reporter_id = auth.uid() OR public.is_platform_admin_user(auth.uid()));

-- ── Rendszermezők védelme (status, moderation, számlálók csak szerveroldalon) ─
CREATE OR REPLACE FUNCTION public.guard_trip_idea_system_fields()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF current_user IN ('anon','authenticated') THEN
    IF TG_OP = 'INSERT' THEN
      NEW.status := 'open'; NEW.moderation_status := 'none'; NEW.member_count := 0; NEW.party_size_total := 0; NEW.offer_count := 0;
      NEW.closed_reason := NULL; NEW.closed_at := NULL; NEW.deleted_at := NULL;
    ELSE
      IF NEW.moderation_status IS DISTINCT FROM OLD.moderation_status
         OR NEW.member_count IS DISTINCT FROM OLD.member_count
         OR NEW.party_size_total IS DISTINCT FROM OLD.party_size_total
         OR NEW.offer_count IS DISTINCT FROM OLD.offer_count
         OR NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
        RAISE EXCEPTION 'trip_idea_system_fields_read_only' USING ERRCODE = '42501';
      END IF;
      -- Állapot: a kliens csak lezárni (open/organizing/converted → closed), a lezárást visszavonni (closed → újraszámolt)
      -- vagy megújítani (expired → újraszámolt) tud; az ok a lezáráshoz kötelező (FR-M22-011). A többi átmenet trigger-es.
      IF NEW.status IS DISTINCT FROM OLD.status THEN
        IF NEW.status = 'closed' AND OLD.status IN ('open','organizing','converted') THEN
          IF NEW.closed_reason IS NULL THEN RAISE EXCEPTION 'closed_reason_required' USING ERRCODE = '23514'; END IF;
          NEW.closed_at := now();
        ELSIF OLD.status IN ('closed','expired') AND NEW.status = 'open' THEN
          NEW.closed_reason := NULL; NEW.closed_at := NULL;
          IF NEW.expires_at <= now() THEN RAISE EXCEPTION 'invalid_transition' USING ERRCODE = '23514'; END IF;
        ELSE
          RAISE EXCEPTION 'invalid_transition' USING ERRCODE = '23514';
        END IF;
      END IF;
      IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
        -- törlés csak akkor, ha más nem csatlakozott és nincs kapcsolt túra (FR-M22-011 4.)
        IF OLD.member_count > 1 OR EXISTS (SELECT 1 FROM public.trip_idea_trips t WHERE t.idea_id = OLD.id) THEN
          RAISE EXCEPTION 'idea_not_deletable' USING ERRCODE = '23514';
        END IF;
      END IF;
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_guard_trip_idea_system_fields ON public.trip_ideas;
CREATE TRIGGER trg_guard_trip_idea_system_fields BEFORE INSERT OR UPDATE ON public.trip_ideas
FOR EACH ROW EXECUTE FUNCTION public.guard_trip_idea_system_fields();

-- Az ötletgazda az első csatlakozó (FR-M22-001 2.)
CREATE OR REPLACE FUNCTION public.trip_idea_owner_joins()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.trip_idea_members (idea_id, user_id, status, joined_via)
  VALUES (NEW.id, NEW.owner_id, 'active', 'owner')
  ON CONFLICT (idea_id, user_id) DO NOTHING;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_trip_idea_owner_joins ON public.trip_ideas;
CREATE TRIGGER trg_trip_idea_owner_joins AFTER INSERT ON public.trip_ideas
FOR EACH ROW EXECUTE FUNCTION public.trip_idea_owner_joins();

-- ── Állapot és számlálók újraszámítása (8.1) ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.trip_idea_recompute(p_idea_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_members integer; v_party integer; v_offers integer; v_published boolean; v_status public.trip_idea_status_t; v_new public.trip_idea_status_t;
BEGIN
  SELECT count(*), coalesce(sum(party_size),0) INTO v_members, v_party FROM public.trip_idea_members WHERE idea_id = p_idea_id AND status = 'active';
  SELECT count(*) INTO v_offers FROM public.trip_idea_organizer_offers WHERE idea_id = p_idea_id AND status = 'active';
  SELECT EXISTS (SELECT 1 FROM public.trip_idea_trips l JOIN public.trips t ON t.id = l.trip_id
                 WHERE l.idea_id = p_idea_id AND t.deleted_at IS NULL AND t.status::text IN ('published','registration_open','active'))
    INTO v_published;
  SELECT status INTO v_status FROM public.trip_ideas WHERE id = p_idea_id;
  v_new := v_status;
  IF v_status IN ('open','organizing','converted') THEN
    v_new := CASE WHEN v_published THEN 'converted'::public.trip_idea_status_t WHEN v_offers > 0 THEN 'organizing' ELSE 'open' END;
  END IF;
  UPDATE public.trip_ideas SET member_count = v_members, party_size_total = v_party, offer_count = v_offers, status = v_new
   WHERE id = p_idea_id AND (member_count <> v_members OR party_size_total <> v_party OR offer_count <> v_offers OR status <> v_new);
END; $$;

GRANT EXECUTE ON FUNCTION public.trip_idea_recompute(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.trip_idea_children_changed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  PERFORM public.trip_idea_recompute(COALESCE(NEW.idea_id, OLD.idea_id));
  RETURN NULL;
END; $$;
DROP TRIGGER IF EXISTS trg_trip_idea_members_changed ON public.trip_idea_members;
CREATE TRIGGER trg_trip_idea_members_changed AFTER INSERT OR UPDATE OR DELETE ON public.trip_idea_members FOR EACH ROW EXECUTE FUNCTION public.trip_idea_children_changed();
DROP TRIGGER IF EXISTS trg_trip_idea_offers_changed ON public.trip_idea_organizer_offers;
CREATE TRIGGER trg_trip_idea_offers_changed AFTER INSERT OR UPDATE OR DELETE ON public.trip_idea_organizer_offers FOR EACH ROW EXECUTE FUNCTION public.trip_idea_children_changed();
DROP TRIGGER IF EXISTS trg_trip_idea_trips_changed ON public.trip_idea_trips;
CREATE TRIGGER trg_trip_idea_trips_changed AFTER INSERT OR DELETE ON public.trip_idea_trips FOR EACH ROW EXECUTE FUNCTION public.trip_idea_children_changed();

-- a kapcsolt túra állapotváltozása (publikálás, lemondás, törlés) → az ötlet újraszámolása (12.2)
CREATE OR REPLACE FUNCTION public.trip_idea_on_trip_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE r record;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at THEN
    FOR r IN SELECT idea_id FROM public.trip_idea_trips WHERE trip_id = NEW.id LOOP PERFORM public.trip_idea_recompute(r.idea_id); END LOOP;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_trip_idea_on_trip_change ON public.trips;
CREATE TRIGGER trg_trip_idea_on_trip_change AFTER UPDATE OF status, deleted_at ON public.trips FOR EACH ROW EXECUTE FUNCTION public.trip_idea_on_trip_change();

-- csatlakozás csak nyitott állapotú ötlethez (8.1), a tulaj nem léphet vissza (FR-M22-005 5.)
CREATE OR REPLACE FUNCTION public.guard_trip_idea_member()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE v_status public.trip_idea_status_t; v_owner uuid;
BEGIN
  SELECT status, owner_id INTO v_status, v_owner FROM public.trip_ideas WHERE id = NEW.idea_id;
  IF NEW.status = 'active' AND v_status NOT IN ('open','organizing','converted') AND NEW.joined_via <> 'owner' THEN
    RAISE EXCEPTION 'idea_not_joinable' USING ERRCODE = '23514';
  END IF;
  IF NEW.status = 'left' AND NEW.user_id = v_owner THEN RAISE EXCEPTION 'owner_cannot_leave' USING ERRCODE = '23514'; END IF;
  IF NEW.status = 'left' THEN NEW.left_at := now(); ELSE NEW.left_at := NULL; IF TG_OP = 'UPDATE' AND OLD.status = 'left' THEN NEW.joined_at := now(); END IF; END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_guard_trip_idea_member ON public.trip_idea_members;
CREATE TRIGGER trg_guard_trip_idea_member BEFORE INSERT OR UPDATE ON public.trip_idea_members FOR EACH ROW EXECUTE FUNCTION public.guard_trip_idea_member();

CREATE OR REPLACE FUNCTION public.guard_trip_idea_offer()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE v_status public.trip_idea_status_t;
BEGIN
  SELECT status INTO v_status FROM public.trip_ideas WHERE id = NEW.idea_id;
  IF NEW.status = 'active' AND v_status NOT IN ('open','organizing','converted') THEN RAISE EXCEPTION 'idea_not_joinable' USING ERRCODE = '23514'; END IF;
  IF NEW.status = 'withdrawn' AND EXISTS (SELECT 1 FROM public.trip_idea_trips l JOIN public.trips t ON t.id = l.trip_id
       WHERE l.idea_id = NEW.idea_id AND t.organizer_id = NEW.organizer_id AND t.deleted_at IS NULL AND t.status::text <> 'draft') THEN
    RAISE EXCEPTION 'offer_locked' USING ERRCODE = '23514';
  END IF;
  NEW.withdrawn_at := CASE WHEN NEW.status = 'withdrawn' THEN now() ELSE NULL END;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_guard_trip_idea_offer ON public.trip_idea_organizer_offers;
CREATE TRIGGER trg_guard_trip_idea_offer BEFORE INSERT OR UPDATE ON public.trip_idea_organizer_offers FOR EACH ROW EXECUTE FUNCTION public.guard_trip_idea_offer();

-- bejelentési küszöb (FR-M22-014 2.)
CREATE OR REPLACE FUNCTION public.trip_idea_report_threshold()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE n integer; thr integer;
BEGIN
  SELECT count(DISTINCT reporter_id) INTO n FROM public.trip_idea_reports WHERE idea_id = NEW.idea_id;
  SELECT coalesce((value)::text::integer, 3) INTO thr FROM public.system_settings WHERE key = 'trip_idea_report_threshold';
  IF n >= coalesce(thr, 3) THEN
    UPDATE public.trip_ideas SET moderation_status = 'under_review' WHERE id = NEW.idea_id AND moderation_status = 'none';
  END IF;
  RETURN NULL;
END; $$;
DROP TRIGGER IF EXISTS trg_trip_idea_report_threshold ON public.trip_idea_reports;
CREATE TRIGGER trg_trip_idea_report_threshold AFTER INSERT ON public.trip_idea_reports FOR EACH ROW EXECUTE FUNCTION public.trip_idea_report_threshold();

-- ── Lejárat (BR-M22-004): naponta ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.expire_trip_ideas()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE n integer;
BEGIN
  UPDATE public.trip_ideas SET status = 'expired' WHERE status IN ('open','organizing','converted') AND expires_at <= now() AND deleted_at IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END; $$;
REVOKE ALL ON FUNCTION public.expire_trip_ideas() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_trip_ideas() TO service_role;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expire-trip-ideas') THEN PERFORM cron.unschedule('expire-trip-ideas'); END IF;
    PERFORM cron.schedule('expire-trip-ideas', '7 2 * * *', 'SELECT public.expire_trip_ideas()');
  END IF;
END $$;

-- ── Napi beküldési korlát (FR-M22-014 4.) ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trip_idea_daily_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE n integer; lim integer;
BEGIN
  IF current_user NOT IN ('anon','authenticated') THEN RETURN NEW; END IF;
  SELECT coalesce((value)::text::integer, 3) INTO lim FROM public.system_settings WHERE key = 'trip_idea_daily_create_limit';
  SELECT count(*) INTO n FROM public.trip_ideas WHERE owner_id = NEW.owner_id AND created_at >= now() - interval '24 hours';
  IF n >= coalesce(lim, 3) THEN RAISE EXCEPTION 'daily_limit' USING ERRCODE = '23514'; END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_trip_idea_daily_limit ON public.trip_ideas;
CREATE TRIGGER trg_trip_idea_daily_limit BEFORE INSERT ON public.trip_ideas FOR EACH ROW EXECUTE FUNCTION public.trip_idea_daily_limit();

GRANT SELECT ON public.trip_ideas, public.trip_idea_destinations, public.trip_idea_members, public.trip_idea_organizer_offers, public.trip_idea_trips TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.trip_ideas, public.trip_idea_destinations, public.trip_idea_members, public.trip_idea_organizer_offers TO authenticated;
GRANT INSERT ON public.trip_idea_trips, public.trip_idea_reports TO authenticated;
GRANT SELECT ON public.trip_idea_reports TO authenticated;

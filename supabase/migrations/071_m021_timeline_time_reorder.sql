-- 071 — M021 Menetrend: időpont (óra:perc) és átrendezés egy tranzakcióban (2026-11-01). Idempotens.
-- Kérés: Norbert, 2026-11-01 — „sorrend beállítás drag and droppal”, „időpontot is (indulás reggel 8-kor)”.
-- Terv: design/D02_Trip_Management.pen „M021 v2 — …” frame-ek (UDerj, NO5UX, PbOhz, zNUB9), folyamat: DngVH.
-- Függ a 021/022-től; a 070-től nem. A helyszín a 070 (M121) trip_locations táblájában van.

-- 1. Időpont: a nap mellé opcionális óra:perc, a túra helyi idejében (trips.timezone, M23 „helyi idő”).
ALTER TABLE public.trip_milestones ADD COLUMN IF NOT EXISTS due_time time;
ALTER TABLE public.trip_tasks ADD COLUMN IF NOT EXISTS due_time time;
COMMENT ON COLUMN public.trip_milestones.due_time IS
  'M021: opcionális időpont a due_date napján, a túra helyi idejében (trips.timezone). Nap nélkül nem adható meg.';
COMMENT ON COLUMN public.trip_tasks.due_time IS
  'M021: opcionális időpont a due_date napján, a túra helyi idejében (trips.timezone). Nap nélkül nem adható meg.';

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'trip_milestones_due_time_needs_date') THEN
    ALTER TABLE public.trip_milestones ADD CONSTRAINT trip_milestones_due_time_needs_date
      CHECK (due_time IS NULL OR due_date IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'trip_tasks_due_time_needs_date') THEN
    ALTER TABLE public.trip_tasks ADD CONSTRAINT trip_tasks_due_time_needs_date
      CHECK (due_time IS NULL OR due_date IS NOT NULL);
  END IF;
END $$;

-- 2. Átrendezés. SECURITY INVOKER: a hívó RLS-jogai érvényesek; a függvény ezen felül kimondja, hogy csak
--    a túra szervezője rendezhet (a trip_tasks_assignee_update szabály a feladat felelősének is ad UPDATE-et).
--    Ha bármelyik azonosító nem ehhez a túrához / szülőhöz tartozik, vagy nem látható, a teljes hívás elbukik.

-- 2a. Fázisok sorrendje
CREATE OR REPLACE FUNCTION public.reorder_trip_phases(p_trip_id uuid, p_phase_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE v_count integer;
BEGIN
  IF NOT is_trip_organizer(p_trip_id) THEN
    RAISE EXCEPTION 'reorder_trip_phases: nincs jogosultság' USING ERRCODE = '42501';
  END IF;
  IF p_phase_ids IS NULL OR cardinality(p_phase_ids) = 0
     OR cardinality(p_phase_ids) <> (SELECT count(DISTINCT x) FROM unnest(p_phase_ids) x) THEN
    RAISE EXCEPTION 'reorder_trip_phases: üres vagy ismétlődő lista' USING ERRCODE = '22023';
  END IF;
  IF (SELECT count(*) FROM trip_phases WHERE trip_id = p_trip_id) <> cardinality(p_phase_ids) THEN
    RAISE EXCEPTION 'reorder_trip_phases: a lista nem a túra összes fázisa' USING ERRCODE = '22023';
  END IF;
  UPDATE trip_phases p SET sort_order = u.ord - 1
    FROM unnest(p_phase_ids) WITH ORDINALITY AS u(id, ord)
   WHERE p.id = u.id AND p.trip_id = p_trip_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count <> cardinality(p_phase_ids) THEN
    RAISE EXCEPTION 'reorder_trip_phases: ismeretlen fázis' USING ERRCODE = '22023';
  END IF;
END;
$$;

-- 2b. Mérföldkövek: a teljes elrendezés fázisonként — [{"phase_id": "…", "milestone_ids": ["…", …]}, …].
--     Fázisok közötti áthelyezés is ezzel megy (phase_id átíródik). A listának a túra összes mérföldkövét
--     tartalmaznia kell, pontosan egyszer.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'm021_layout_row' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE public.m021_layout_row AS (phase_id uuid, milestone_id uuid, ord integer);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.reorder_trip_milestones(p_trip_id uuid, p_layout jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE v_total integer; v_rows public.m021_layout_row[];
BEGIN
  IF NOT is_trip_organizer(p_trip_id) THEN
    RAISE EXCEPTION 'reorder_trip_milestones: nincs jogosultság' USING ERRCODE = '42501';
  END IF;
  IF p_layout IS NULL OR jsonb_typeof(p_layout) <> 'array' THEN
    RAISE EXCEPTION 'reorder_trip_milestones: hibás elrendezés' USING ERRCODE = '22023';
  END IF;

  -- Az elrendezés egy tömbbe kibontva (ideiglenes tábla nélkül: az authenticated szerep TEMP-joga nem garantált).
  SELECT array_agg(ROW((g->>'phase_id')::uuid, m.id::uuid, (m.ord - 1)::integer)::public.m021_layout_row)
    INTO v_rows
    FROM jsonb_array_elements(p_layout) g
    CROSS JOIN LATERAL jsonb_array_elements_text(COALESCE(g->'milestone_ids', '[]'::jsonb)) WITH ORDINALITY AS m(id, ord);
  v_rows := COALESCE(v_rows, '{}');

  SELECT count(*) INTO v_total FROM trip_milestones WHERE trip_id = p_trip_id;
  IF cardinality(v_rows) <> v_total
     OR (SELECT count(DISTINCT r.milestone_id) FROM unnest(v_rows) r) <> v_total THEN
    RAISE EXCEPTION 'reorder_trip_milestones: a lista nem a túra összes mérföldköve' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM unnest(v_rows) r
              WHERE NOT EXISTS (SELECT 1 FROM trip_phases p WHERE p.id = r.phase_id AND p.trip_id = p_trip_id)) THEN
    RAISE EXCEPTION 'reorder_trip_milestones: idegen fázis' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM unnest(v_rows) r
              WHERE NOT EXISTS (SELECT 1 FROM trip_milestones m WHERE m.id = r.milestone_id AND m.trip_id = p_trip_id)) THEN
    RAISE EXCEPTION 'reorder_trip_milestones: ismeretlen mérföldkő' USING ERRCODE = '22023';
  END IF;

  UPDATE trip_milestones m SET phase_id = r.phase_id, sort_order = r.ord
    FROM unnest(v_rows) r
   WHERE m.id = r.milestone_id AND m.trip_id = p_trip_id
     AND (m.phase_id IS DISTINCT FROM r.phase_id OR m.sort_order IS DISTINCT FROM r.ord);
END;
$$;

-- 2c. Feladatok egy mérföldkövön belül
CREATE OR REPLACE FUNCTION public.reorder_trip_tasks(p_milestone_id uuid, p_task_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE v_trip uuid; v_count integer;
BEGIN
  SELECT trip_id INTO v_trip FROM trip_milestones WHERE id = p_milestone_id;
  IF v_trip IS NULL OR NOT is_trip_organizer(v_trip) THEN
    RAISE EXCEPTION 'reorder_trip_tasks: nincs jogosultság' USING ERRCODE = '42501';
  END IF;
  IF p_task_ids IS NULL OR cardinality(p_task_ids) <> (SELECT count(DISTINCT x) FROM unnest(p_task_ids) x)
     OR cardinality(p_task_ids) <> (SELECT count(*) FROM trip_tasks WHERE milestone_id = p_milestone_id) THEN
    RAISE EXCEPTION 'reorder_trip_tasks: a lista nem a mérföldkő összes feladata' USING ERRCODE = '22023';
  END IF;
  UPDATE trip_tasks t SET sort_order = u.ord - 1
    FROM unnest(p_task_ids) WITH ORDINALITY AS u(id, ord)
   WHERE t.id = u.id AND t.milestone_id = p_milestone_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count <> cardinality(p_task_ids) THEN
    RAISE EXCEPTION 'reorder_trip_tasks: ismeretlen feladat' USING ERRCODE = '22023';
  END IF;
END;
$$;

-- 3. Jogok (Supabase: a REVOKE FROM PUBLIC önmagában hatástalan, az anon külön — SEC-018)
REVOKE EXECUTE ON FUNCTION public.reorder_trip_phases(uuid, uuid[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reorder_trip_milestones(uuid, jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reorder_trip_tasks(uuid, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reorder_trip_phases(uuid, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reorder_trip_milestones(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reorder_trip_tasks(uuid, uuid[]) TO authenticated;

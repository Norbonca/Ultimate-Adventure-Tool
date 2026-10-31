-- 053 — M22 hotfix: az ötlet beküldése „Ezt az ötletet nem tekintheted meg” hibával elbukott.
-- Ok: az INSERT … RETURNING (supabase-js .insert().select()) a SELECT-szabályt is ellenőrzi az új soron;
-- a can_view_trip_idea() STABLE függvény az utasítás eleji pillanatképet látja, amelyben az új sor
-- még nincs benne → 42501. Javítás: a tulajdonos közvetlen oszlopfeltétellel is látja a saját
-- (nem törölt) ötletét; ez az új soron közvetlenül kiértékelődik. A láthatóság egyébként változatlan.
-- Éles próba visszagörgetett tranzakcióban (2026-10-31): insert+returning, célterület, member_count=1,
-- soft-delete — mind rendben.

DROP POLICY IF EXISTS trip_ideas_select ON public.trip_ideas;
CREATE POLICY trip_ideas_select ON public.trip_ideas
  FOR SELECT
  USING (
    (owner_id = (SELECT auth.uid()) AND deleted_at IS NULL)
    OR public.can_view_trip_idea(id)
  );

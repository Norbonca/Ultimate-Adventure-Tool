-- Fix RLS policies that are missing WITH CHECK clause for INSERT/UPSERT operations

-- user_privacy_settings: add WITH CHECK for INSERT
DROP POLICY IF EXISTS user_privacy_own ON user_privacy_settings;
CREATE POLICY user_privacy_own ON user_privacy_settings
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- emergency_contacts: verify it has WITH CHECK (it does from migration 001)
-- Already correct: FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())

-- user_skills: add WITH CHECK for INSERT  
DROP POLICY IF EXISTS user_skills_insert ON user_skills;
CREATE POLICY user_skills_insert ON user_skills
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS user_skills_update ON user_skills;
CREATE POLICY user_skills_update ON user_skills
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS user_skills_delete ON user_skills;
CREATE POLICY user_skills_delete ON user_skills
  FOR DELETE USING (user_id = auth.uid());

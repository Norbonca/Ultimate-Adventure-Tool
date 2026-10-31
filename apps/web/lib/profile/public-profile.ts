import type { SupabaseClient } from '@supabase/supabase-js';

/** Public column projection; profile visibility and deletion are enforced by RLS. */
export async function fetchPublicProfile(client: SupabaseClient, slugOrId: string) {
  const key = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(slugOrId) ? 'id' : 'slug';
  const { data, error } = await client.from('profiles')
    .select('id,display_name,slug,avatar_url,bio,reputation_points,reputation_level,verified_organizer')
    .eq(key, slugOrId).maybeSingle();
  if (error) throw new Error('profile_load_failed');
  return data;
}

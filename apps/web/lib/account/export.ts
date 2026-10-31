import type { SupabaseClient } from '@supabase/supabase-js';

const ownDatasets = [
  ['privacy', 'user_privacy_settings', 'user_id', '*'],
  ['interests', 'user_adventure_interests', 'user_id', '*'],
  ['skills', 'user_skills', 'user_id', '*'],
  ['emergency_contacts', 'emergency_contacts', 'user_id', '*'],
  ['following', 'user_follows', 'follower_id', '*'],
  ['followers', 'user_follows', 'following_id', '*'],
  ['organized_trips', 'trips', 'organizer_id', '*'],
  ['applications', 'trip_participants', 'user_id', '*'],
  ['ideas', 'trip_ideas', 'owner_id', '*'],
  ['idea_memberships', 'trip_idea_members', 'user_id', '*'],
  ['idea_offers', 'trip_idea_organizer_offers', 'organizer_id', '*'],
  ['idea_reports', 'trip_idea_reports', 'reporter_id', '*'],
  ['sessions', 'user_sessions', 'user_id', 'id,device_type,device_name,browser,ip_address,last_active_at,expires_at,created_at'],
  ['linked_accounts', 'user_credentials', 'user_id', 'provider,provider_id,linked_at'],
] as const;

/** Uses the caller's RLS client. Never accepts a requested target account. */
export async function exportOwnAccount(client: SupabaseClient) {
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError || !user) throw new Error('unauthorized');
  const { data: profile, error: profileError } = await client.rpc('get_my_profile');
  if (profileError || !profile) throw new Error('export_failed');
  const entries = await Promise.all(ownDatasets.map(async ([name, table, key, columns]) => {
    const rows: unknown[] = [];
    for (let offset = 0; ; offset += 500) {
      // Explicit ownership filters supplement RLS, including public tables.
      const { data, error } = await client.from(table).select(columns).eq(key, user.id).range(offset, offset + 499);
      if (error) throw new Error('export_failed');
      rows.push(...(data ?? []));
      if (!data || data.length < 500) break;
    }
    return [name, rows];
  }));
  return { schema_version: 1, exported_at: new Date().toISOString(), profile, ...Object.fromEntries(entries) };
}

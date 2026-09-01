"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface ProfileSearchResult {
  id: string;
  display_name: string | null;
  slug: string | null;
  avatar_url: string | null;
  isFollowing: boolean;
}

// Profilkeresés név vagy felhasználónév alapján (M05 — Community Dashboard).
export async function searchProfiles(
  query: string
): Promise<{ results: ProfileSearchResult[] }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { results: [] };

  const q = query.trim();
  if (q.length < 2) return { results: [] };

  const [{ data: profiles }, { data: myFollows }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name, slug, avatar_url")
      .or(`display_name.ilike.%${q}%,slug.ilike.%${q}%`)
      .neq("id", user.id)
      .limit(8),
    supabase
      .from("user_follows")
      .select("following_id")
      .eq("follower_id", user.id),
  ]);

  const followingIds = new Set((myFollows ?? []).map((f) => f.following_id));

  return {
    results: (profiles ?? []).map((p) => ({
      ...p,
      isFollowing: followingIds.has(p.id),
    })),
  };
}

export async function followUser(targetId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || targetId === user.id) return { error: "invalid" };

  const { error } = await supabase
    .from("user_follows")
    .upsert(
      { follower_id: user.id, following_id: targetId },
      { onConflict: "follower_id,following_id" }
    );
  if (error) return { error: error.message };

  revalidatePath("/community");
  return {};
}

export async function unfollowUser(targetId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "invalid" };

  const { error } = await supabase
    .from("user_follows")
    .delete()
    .eq("follower_id", user.id)
    .eq("following_id", targetId);
  if (error) return { error: error.message };

  revalidatePath("/community");
  return {};
}

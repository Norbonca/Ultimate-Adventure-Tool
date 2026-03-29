"use server";

import { createClient } from "@/lib/supabase/server";

// ============================================
// Categories + Sub-disciplines (from M02 ref tables)
// ============================================

export async function fetchCategoriesWithSubDisciplines() {
  const supabase = await createClient();

  const { data: categories, error: catError } = await supabase
    .from("categories")
    .select("id, name, name_localized, icon_name, color_hex, display_order")
    .eq("status", "active")
    .order("display_order");

  if (catError) return { categories: [], subDisciplines: [], error: catError.message };

  const { data: subDisciplines, error: sdError } = await supabase
    .from("sub_disciplines")
    .select("id, category_id, name, name_localized, description, display_order")
    .eq("status", "active")
    .order("display_order");

  if (sdError) return { categories: categories ?? [], subDisciplines: [], error: sdError.message };

  return { categories: categories ?? [], subDisciplines: subDisciplines ?? [], error: null };
}

// ============================================
// Adventure Interests — user's selected sub-disciplines
// ============================================

export async function fetchUserInterests() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { interests: [], error: "Not authenticated" };

  const { data, error } = await supabase
    .from("user_adventure_interests")
    .select("category_id")
    .eq("user_id", user.id);

  if (error) return { interests: [], error: error.message };
  return { interests: (data ?? []).map((r) => r.category_id), error: null };
}

export async function saveUserInterests(categoryIds: string[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Delete existing interests
  const { error: delError } = await supabase
    .from("user_adventure_interests")
    .delete()
    .eq("user_id", user.id);

  if (delError) return { error: delError.message };

  // Insert new ones
  if (categoryIds.length > 0) {
    const { error: insError } = await supabase
      .from("user_adventure_interests")
      .insert(categoryIds.map((cid) => ({ user_id: user.id, category_id: cid })));

    if (insError) return { error: insError.message };
  }

  return { error: null };
}

// ============================================
// Skills — user's skill levels per category
// ============================================

export async function fetchUserSkills() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { skills: [], error: "Not authenticated" };

  const { data, error } = await supabase
    .from("user_skills")
    .select("id, category_id, skill_level, years_experience")
    .eq("user_id", user.id);

  if (error) return { skills: [], error: error.message };
  return { skills: data ?? [], error: null };
}

export async function saveUserSkills(
  skills: { category_id: string; skill_level: string; years_experience?: number }[]
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Upsert each skill
  for (const skill of skills) {
    const { error } = await supabase
      .from("user_skills")
      .upsert(
        {
          user_id: user.id,
          category_id: skill.category_id,
          skill_level: skill.skill_level,
          years_experience: skill.years_experience ?? null,
        },
        { onConflict: "user_id,category_id" }
      );

    if (error) return { error: error.message };
  }

  return { error: null };
}

// ============================================
// Privacy Settings
// ============================================

export async function fetchPrivacySettings() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { settings: null, error: "Not authenticated" };

  const { data, error } = await supabase
    .from("user_privacy_settings")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error) return { settings: null, error: error.message };
  return { settings: data, error: null };
}

export async function savePrivacySettings(settings: Record<string, unknown>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("user_privacy_settings")
    .upsert({ user_id: user.id, ...settings }, { onConflict: "user_id" });

  if (error) return { error: error.message };
  return { error: null };
}

// ============================================
// Avatar Image Actions
// ============================================

export async function uploadAvatar(
  formDataFile: FormData
): Promise<{ url: string; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { url: "", error: "Not authenticated" };

  const file = formDataFile.get("file") as File;
  if (!file) return { url: "", error: "No file provided" };

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    return { url: "", error: "Invalid file type. Allowed: JPG, PNG, WebP" };
  }

  const maxSize = 5 * 1024 * 1024; // 5 MB
  if (file.size > maxSize) {
    return { url: "", error: "File too large. Max 5 MB" };
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const filePath = `${user.id}/${timestamp}-${random}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: true,
    });

  if (uploadError) {
    return { url: "", error: uploadError.message };
  }

  const { data: urlData } = supabase.storage
    .from("avatars")
    .getPublicUrl(filePath);

  return { url: urlData.publicUrl };
}

export async function fetchSystemAvatars(type?: string) {
  const supabase = await createClient();

  let query = supabase
    .from("ref_avatar_images")
    .select("id, type, url, thumbnail_url, alt_text, alt_text_localized, tags, sort_order")
    .eq("is_active", true)
    .order("sort_order");

  if (type) {
    query = query.eq("type", type);
  }

  const { data, error } = await query;
  if (error) return [];
  return data ?? [];
}

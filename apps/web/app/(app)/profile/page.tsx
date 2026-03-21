import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

interface Profile {
  id: string;
  avatar?: string;
  display_name?: string;
  email: string;
  slug?: string;
  subscription_tier?: string;
  preferred_language?: string;
  preferred_currency?: string;
  country_code?: string;
  bio?: string;
  reputation_points?: number;
  created_at?: string;
  location_city?: string;
}

interface UserSkill {
  id: string;
  skill_name: string;
  proficiency_level?: string;
}

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch profile data
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Fetch user skills
  const { data: skills } = await supabase
    .from("user_skills")
    .select("*")
    .eq("user_id", user.id);

  const userData: Profile = profile || {
    id: user.id,
    email: user.email || "",
    display_name: user.user_metadata?.full_name || "",
  };

  const initials = (userData.display_name || userData.email || "U")
    .split(" ")
    .map((n) => n.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("hu-HU", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="h-9 w-9 rounded-lg bg-adventure-forest text-white flex items-center justify-center font-bold text-sm hover:bg-green-800 transition-colors">
              UAT
            </Link>
            <h1 className="text-lg font-semibold text-gray-900">
              Profil
            </h1>
          </div>
          <div className="flex items-center gap-6">
            <span className="text-sm text-gray-600">{user.email}</span>
            <form action="/api/v1/auth/signout" method="POST">
              <button className="text-sm text-gray-500 hover:text-gray-700">
                Kijelentkezés
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Profile Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Profile Header Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-8 mb-6">
          <div className="flex items-start justify-between mb-8">
            <div className="flex items-center gap-6">
              <div className="h-20 w-20 rounded-xl bg-adventure-forest text-white flex items-center justify-center font-bold text-2xl">
                {initials}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {userData.display_name || "Felhasználó"}
                </h2>
                <p className="text-gray-600 mt-1">{userData.email}</p>
                {userData.bio && (
                  <p className="text-gray-700 mt-2">{userData.bio}</p>
                )}
              </div>
            </div>
            <Link
              href="#"
              className="px-4 py-2 rounded-lg bg-adventure-forest text-white font-semibold hover:bg-green-800 transition-colors"
            >
              Szerkesztés
            </Link>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-gray-200">
            <div>
              <p className="text-sm text-gray-500">Csatlakozás dátuma</p>
              <p className="text-lg font-semibold text-gray-900 mt-1">
                {formatDate(userData.created_at)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Előfizetés szint</p>
              <p className="text-lg font-semibold text-gray-900 mt-1">
                {userData.subscription_tier || "-"}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Reputációs pontok</p>
              <p className="text-lg font-semibold text-adventure-forest mt-1">
                {userData.reputation_points || 0}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Felhasználónév</p>
              <p className="text-lg font-semibold text-gray-900 mt-1">
                {userData.slug || "-"}
              </p>
            </div>
          </div>
        </div>

        {/* Personal Information */}
        <div className="bg-white rounded-xl border border-gray-200 p-8 mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-6">
            Személyes adatok
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="text-base font-semibold text-gray-900 mt-2">
                {userData.email}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Megjelenítendő név</p>
              <p className="text-base font-semibold text-gray-900 mt-2">
                {userData.display_name || "-"}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Város</p>
              <p className="text-base font-semibold text-gray-900 mt-2">
                {userData.location_city || "-"}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Ország</p>
              <p className="text-base font-semibold text-gray-900 mt-2">
                {userData.country_code || "-"}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Preferált nyelv</p>
              <p className="text-base font-semibold text-gray-900 mt-2">
                {userData.preferred_language || "-"}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Preferált valuta</p>
              <p className="text-base font-semibold text-gray-900 mt-2">
                {userData.preferred_currency || "-"}
              </p>
            </div>
          </div>
          {userData.bio && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-500">Rólad</p>
              <p className="text-base text-gray-700 mt-2">
                {userData.bio}
              </p>
            </div>
          )}
        </div>

        {/* User Skills */}
        {skills && skills.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-8 mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-6">
              Készségek
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {skills.map((skill: UserSkill) => (
                <div
                  key={skill.id}
                  className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <h4 className="font-semibold text-gray-900">
                    {skill.skill_name}
                  </h4>
                  {skill.proficiency_level && (
                    <p className="text-sm text-gray-600 mt-1">
                      Szint: {skill.proficiency_level}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info Section */}
        <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
          <p className="text-sm text-blue-800">
            <span className="font-semibold">Csatornázás:</span> Szerkesztési
            lehetőség hamarosan érkezik. Az adatok módosításához
            kérjük, vedd fel velünk a kapcsolatot.
          </p>
        </div>
      </div>
    </main>
  );
}

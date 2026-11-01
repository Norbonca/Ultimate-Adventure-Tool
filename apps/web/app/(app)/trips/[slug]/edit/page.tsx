import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { fetchTripBySlug, fetchCategoryParameters, fetchParameterOptions, fetchCountries, fetchCrewPositions } from "../../actions";
import { getServerLocale } from "@/lib/i18n/server";
import { AppHeader } from "@/components/AppHeader";
import { CATEGORY_DISPLAY } from "@/lib/categories";
import { EditTripForm } from "./edit-form";
import type { TripFxSettingsProps } from "@/components/expenses/TripFxSettings";

interface EditPageProps {
  params: Promise<{ slug: string }>;
}

export default async function EditTripPage({ params }: EditPageProps) {
  const { slug } = await params;
  const trip = await fetchTripBySlug(slug);
  if (!trip) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== trip.organizer_id) redirect(`/trips/${slug}`);

  const locale = await getServerLocale();

  const cat = Array.isArray(trip.categories) ? trip.categories[0] : trip.categories;
  const catDisplay = cat ? CATEGORY_DISPLAY[(cat as { name: string }).name] : null;

  const categoryId = trip.category_id;
  const subDisciplineId = trip.sub_discipline_id;

  const [params_list, countries, crewPositions] = await Promise.all([
    categoryId ? fetchCategoryParameters(categoryId, subDisciplineId || undefined) : Promise.resolve([]),
    fetchCountries(),
    fetchCrewPositions(trip.id),
  ]);

  const selectParamIds = params_list
    .filter((p) => p.field_type === "select" || p.field_type === "multiselect")
    .map((p) => p.id);
  const paramOptions = selectParamIds.length > 0
    ? await fetchParameterOptions(selectParamIds)
    : [];

  // M03 · Elszámolás (D02 XKV28): a túra devizabeállításai, túraszintű árfolyamai és a zárolás állapota.
  const [{ data: fxRow }, { data: fxRates }, { count: activeExpenses }] = await Promise.all([
    supabase.from("trips").select("settlement_currency, fx_mode, expenses_participants_can_add").eq("id", trip.id).maybeSingle(),
    supabase.from("trip_fx_rates").select("currency, rate").eq("trip_id", trip.id).order("currency"),
    supabase.from("expenses").select("id", { count: "exact", head: true }).eq("trip_id", trip.id).eq("status", "active"),
  ]);
  const fxSettings: TripFxSettingsProps | null = fxRow
    ? {
        tripId: trip.id,
        settlementCurrency: fxRow.settlement_currency,
        fxMode: fxRow.fx_mode,
        participantsCanAdd: fxRow.expenses_participants_can_add,
        rates: (fxRates ?? []).map((r) => ({ currency: r.currency, rate: String(r.rate) })),
        locked: (activeExpenses ?? 0) > 0,
      }
    : null;

  return (
    <main className="min-h-screen bg-slate-50">
      <AppHeader
        user={{ email: user.email ?? "", displayName: user.user_metadata?.full_name }}
      />

      <EditTripForm
        trip={trip}
        slug={slug}
        locale={locale}
        categoryDisplay={catDisplay}
        categoryParameters={params_list}
        parameterOptions={paramOptions}
        countries={countries}
        crewPositions={crewPositions.map((position) => position.role_name)}
        fxSettings={fxSettings}
      />
    </main>
  );
}

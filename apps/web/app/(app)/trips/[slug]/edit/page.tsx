import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { fetchTripBySlug, fetchCategoryParameters, fetchParameterOptions, fetchCountries } from "../../actions";
import { getServerT, getServerLocale } from "@/lib/i18n/server";
import { AppHeader } from "@/components/AppHeader";
import { CATEGORY_DISPLAY } from "@/lib/categories";
import { EditTripForm } from "./edit-form";
import { BackButton } from "@/components/BackButton";

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

  const { t } = await getServerT();
  const locale = await getServerLocale();

  const cat = Array.isArray(trip.categories) ? trip.categories[0] : trip.categories;
  const catDisplay = cat ? CATEGORY_DISPLAY[(cat as { name: string }).name] : null;

  // Load category parameters + options for the category details section
  const categoryId = trip.category_id;
  const subDisciplineId = trip.sub_discipline_id;

  const [params_list, countries] = await Promise.all([
    categoryId ? fetchCategoryParameters(categoryId, subDisciplineId || undefined) : Promise.resolve([]),
    fetchCountries(),
  ]);

  const selectParamIds = params_list
    .filter((p) => p.field_type === "select" || p.field_type === "multiselect")
    .map((p) => p.id);
  const paramOptions = selectParamIds.length > 0
    ? await fetchParameterOptions(selectParamIds)
    : [];

  return (
    <main className="min-h-screen bg-[#F8FAFC]">
      <AppHeader
       
        user={{ email: user.email ?? "", displayName: user.user_metadata?.full_name }}
      />

      <BackButton fallback={`/trips/${slug}`} label={t('common.back')} />

      <div className="max-w-4xl mx-auto px-6 py-8">
        <EditTripForm
          trip={trip}
          slug={slug}
          locale={locale}
          categoryDisplay={catDisplay}
          categoryParameters={params_list}
          parameterOptions={paramOptions}
          countries={countries}
        />
      </div>
    </main>
  );
}

import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { fetchPublicProfile } from '@/lib/profile/public-profile';
import { getServerT } from '@/lib/i18n/server';
import { AppHeader } from '@/components/AppHeader';
import { FollowToggle } from '@/app/(app)/community/find-friends';
import { Button } from '@/components/ui';
import { CATEGORY_DISPLAY, getCategoryName } from '@/lib/categories';

// D01_User_Auth_Profile.pen#4EQMy: social list -> visible profile -> follow.
// Only available public data is shown; private contact/trip-history fields are omitted.
export default async function PublicProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const client = await createClient();
  const profile = await fetchPublicProfile(client, slug);
  if (!profile) notFound();
  const [{ data: { user } }, { t, locale }] = await Promise.all([client.auth.getUser(), getServerT()]);
  const { data: interests } = await client.from('user_adventure_interests').select('category_id').eq('user_id', profile.id);
  const ids = (interests ?? []).map(row => row.category_id);
  const { data: categories } = ids.length
    ? await client.from('categories').select('id,name').in('id', ids)
    : { data: [] };
  const { data: following } = user && user.id !== profile.id
    ? await client.from('user_follows').select('following_id').eq('follower_id', user.id).eq('following_id', profile.id).maybeSingle()
    : { data: null };
  const name = profile.display_name || t('common.user');
  return <main className="min-h-screen bg-canvas text-ink">
    <AppHeader user={user ? { email: user.email ?? '', displayName: user.user_metadata?.full_name } : null} />
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 md:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="min-w-0 rounded-2xl border border-subtle bg-surface p-6">
        {profile.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- same user-controlled Storage avatar as the social list
          <img src={profile.avatar_url} alt={name} className="mx-auto h-24 w-24 rounded-full object-cover" />
        ) : <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-primary text-2xl text-on-primary">{name.slice(0, 2).toUpperCase()}</div>}
        <h1 className="mt-4 break-words text-center text-2xl font-bold">{name}</h1>
        {profile.slug && <p className="mt-1 break-all text-center text-muted">@{profile.slug}</p>}
        {profile.bio && <p className="mt-5 whitespace-pre-wrap break-words text-sm">{profile.bio}</p>}
        <div className="mt-5 flex justify-center">
          {user?.id === profile.id ? <Button href="/settings/profile">{t('common.edit')}</Button>
            : user ? <FollowToggle targetId={profile.id} initialFollowing={!!following} />
              : <Button href={`/login?redirect=${encodeURIComponent(`/u/${slug}`)}`}>{t('auth.login')}</Button>}
        </div>
      </aside>
      <div className="min-w-0 space-y-6">
        <section className="rounded-2xl border border-subtle bg-surface p-6">
          <h2 className="text-xl font-bold">{t('settings.interests.title')}</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {(categories ?? []).map(category => <span key={category.id} className="rounded-lg border border-subtle px-3 py-2 text-sm">{CATEGORY_DISPLAY[category.name] ? getCategoryName(CATEGORY_DISPLAY[category.name], locale) : category.name}</span>)}
            {!categories?.length && <p className="text-muted">{t('common.noData')}</p>}
          </div>
        </section>
        <section className="rounded-2xl border border-subtle bg-surface p-6">
          <h2 className="text-xl font-bold">{t('profile.overview.reputationPoints')}</h2>
          <p className="mt-4 text-2xl font-semibold">{profile.reputation_points}</p>
          <p className="text-muted">{t('profile.overview.level', { level: profile.reputation_level })}</p>
          {profile.verified_organizer && <p className="mt-3">{t('profile.overview.verifiedOrganizer')}</p>}
        </section>
      </div>
    </div>
  </main>;
}

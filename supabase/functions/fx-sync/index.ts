// fx-sync — napi EKB-árfolyam szinkron (rendszerspec §14.8; NyK-05: pg_cron + pg_net → Edge Function, Norbert 2026-10-31).
// Hívja: a 067 `fx-sync-daily` pg_cron jobja és az admin „Szinkronizálás most” gombja. Nyilvános (verify_jwt = false):
// csak közérdekű EKB-adatot tölt le és ír be, ezért nem titok-védett — helyette 10 perces fojtás (fx_sync_runs) véd a túlhívástól.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { buildRatesUrl, syncWindow, toRateRows } from '../_shared/fx-parse.ts';

const THROTTLE_MIN = 10;

Deno.serve(async (req) => {
  const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
  const triggeredBy = ['cron', 'admin', 'test'].includes(body?.triggered_by) ? body.triggered_by : 'cron';
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const since = new Date(Date.now() - THROTTLE_MIN * 60_000).toISOString();
  const { data: recent } = await db.from('fx_sync_runs').select('id').gte('started_at', since).in('status', ['running', 'ok']).limit(1);
  if (recent && recent.length) return Response.json({ ok: true, skipped: 'throttled' });

  const { data: src } = await db.from('fx_rate_sources').select('code, enabled').eq('code', 'frankfurter').maybeSingle();
  if (!src?.enabled) return Response.json({ ok: false, error: 'source_disabled' }, { status: 409 });

  const { data: run } = await db.from('fx_sync_runs').insert({ source_code: 'frankfurter', triggered_by: triggeredBy }).select('id').single();
  const finish = (patch: Record<string, unknown>) => db.from('fx_sync_runs').update({ finished_at: new Date().toISOString(), ...patch }).eq('id', run!.id);

  try {
    const { data: maxRow } = await db.from('exchange_rates').select('rate_date').eq('source', 'ecb').order('rate_date', { ascending: false }).limit(1).maybeSingle();
    const { data: setting } = await db.from('system_settings').select('value').eq('key', 'fx_max_backfill_days').maybeSingle();
    const today = new Date().toISOString().slice(0, 10);
    const win = syncWindow(maxRow?.rate_date ?? null, today, Number(setting?.value ?? 7) || 7);
    if (!win) { await finish({ status: 'ok', rates_upserted: 0 }); return Response.json({ ok: true, upserted: 0 }); }

    const res = await fetch(buildRatesUrl(win.from, win.to), { headers: { accept: 'application/json' } });
    if (res.status === 404) { await finish({ status: 'ok', rates_upserted: 0, error_message: 'no_publication' }); return Response.json({ ok: true, upserted: 0 }); }
    if (!res.ok) throw new Error(`frankfurter_http_${res.status}`);

    const { data: cur } = await db.from('ref_currencies').select('code');
    const rows = toRateRows(await res.json(), new Set((cur ?? []).map((c: { code: string }) => c.code)));
    if (rows.length) {
      const { error } = await db.from('exchange_rates').upsert(rows, { onConflict: 'source,base_currency,target_currency,rate_date' });
      if (error) throw new Error(`upsert_failed: ${error.message}`);
    }
    const lastDate = rows.reduce<string | null>((m, r) => (!m || r.rate_date > m ? r.rate_date : m), null);
    await db.from('fx_rate_sources').update({ last_synced_at: new Date().toISOString() }).eq('code', 'frankfurter');
    await finish({ status: 'ok', rates_upserted: rows.length, rate_date: lastDate });
    return Response.json({ ok: true, upserted: rows.length, rate_date: lastDate });
  } catch (e) {
    await finish({ status: 'error', error_message: String((e as Error).message ?? e).slice(0, 500) });
    return Response.json({ ok: false, error: 'sync_failed' }, { status: 502 });
  }
});

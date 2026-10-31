import { createClient } from '@/lib/supabase/server';
import { exportOwnAccount } from '@/lib/account/export';

export async function GET() {
  try {
    const data = await exportOwnAccount(await createClient());
    return Response.json(data, { headers: {
      'Content-Disposition': 'attachment; filename="trevu-account.json"',
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    } });
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === 'unauthorized';
    return Response.json({ error: unauthorized ? 'unauthorized' : 'export_failed' }, {
      status: unauthorized ? 401 : 500, headers: { 'Cache-Control': 'private, no-store' },
    });
  }
}

import { spawnSync } from 'node:child_process';

const mode = process.argv[2];
const localOnly = value => ['localhost', '127.0.0.1'].includes(new URL(value).hostname);
if (!localOnly(process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://localhost:55321')) {
  throw new Error('Local tests must not target a remote Supabase instance');
}
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';
if (!localOnly(baseURL)) throw new Error('Local browser tests require a local application');
const commands = {
  integration: ['vitest', 'run', 'test/integration/trips-lifecycle.test.ts'],
  e2e: ['playwright', 'test', 'audit-critical.spec.ts', '--project=chromium-hu', '--project=chromium-en'],
};
if (!commands[mode]) throw new Error('Expected integration or e2e');
const result = spawnSync('pnpm', ['--filter', '@uat/web', 'exec', ...commands[mode]], {
  stdio: 'inherit',
  env: { ...process.env, INTEGRATION: '1', PLAYWRIGHT_BASE_URL: baseURL },
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);

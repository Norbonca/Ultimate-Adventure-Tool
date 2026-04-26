import { spawnSync } from 'node:child_process';

export default async function globalSetup() {
  // Apply latest migrations to local DB. NEVER 'db reset'!
  const r = spawnSync('npx', ['supabase', 'migration', 'up'], {
    cwd: '../..',
    stdio: 'inherit',
  });
  if (r.status !== 0) {
    console.warn('[playwright global-setup] supabase migration up failed (continuing — assume schema is current)');
  }
}

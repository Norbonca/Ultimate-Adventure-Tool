#!/usr/bin/env python3
"""Test migration 031 on a disposable schema clone, never on development data."""
from pathlib import Path
import concurrent.futures
import os
import subprocess
import shutil
import time

ROOT = Path(__file__).resolve().parents[1]
CONTAINER = os.environ.get('UAT_TEST_DB_CONTAINER', 'supabase_db_trevu-local')
DATABASE = 'uat_audit_' + str(int(time.time()))
DOCKER = os.environ.get('DOCKER_BIN') or shutil.which('docker') or '/usr/local/bin/docker'


def run(args, sql=None, check=True):
    result = subprocess.run([DOCKER, 'exec', '-i', CONTAINER, *args], input=sql,
                            text=True, capture_output=True)
    if check and result.returncode:
        raise RuntimeError(result.stderr)
    return result


def query(sql, check=True):
    return run(['psql', '-X', '-qAt', '-U', 'postgres', '-d', DATABASE,
                '-v', 'ON_ERROR_STOP=1'], sql, check)


run(['createdb', '-U', 'postgres', DATABASE])
try:
    query('CREATE SCHEMA extensions; CREATE EXTENSION postgis WITH SCHEMA extensions; '
          'CREATE EXTENSION pg_trgm WITH SCHEMA extensions; CREATE EXTENSION pgcrypto WITH SCHEMA extensions;')
    schema = run(['pg_dump', '-U', 'postgres', '--schema-only', '--no-owner', '--no-privileges',
                  '--schema=public', '--schema=auth', 'postgres']).stdout
    query(schema.replace('CREATE SCHEMA public;', ''))
    query('GRANT USAGE ON SCHEMA public, auth TO anon, authenticated; '
          'GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;')
    migration = (ROOT / 'supabase/migrations/031_audit_security_and_atomic_writes.sql').read_text()
    query(migration)
    query(migration)  # Explicit idempotency check.
    contract = (ROOT / 'supabase/migrations/032_trip_draft_and_visibility_contract.sql').read_text()
    query(contract)
    query(contract)
    tests = (ROOT / 'supabase/tests/audit-security.sql').read_text()
    print(query(tests).stdout.strip())
    # Reuse only fixture INSERTs; these are unique to the disposable database.
    fixture = tests.split('BEGIN;', 1)[1].split('SET LOCAL ROLE anon;', 1)[0]
    query(fixture)
    query("""
      INSERT INTO public.profiles(id,display_name,slug,email) VALUES
      ('00000000-0000-4000-8000-000000000004','Fourth','audit-fourth','fourth@audit.local');
      UPDATE public.trips SET require_approval=false;
      INSERT INTO public.trip_participants(trip_id,user_id,status) VALUES
      ('00000000-0000-4000-8000-000000000020','00000000-0000-4000-8000-000000000002','approved');
    """)
    def reserve(suffix):
        return query("""BEGIN;
          SET LOCAL ROLE authenticated;
          SELECT set_config('request.jwt.claims',
          '{"sub":"00000000-0000-4000-8000-00000000000%s","role":"authenticated"}',true);
          INSERT INTO public.trip_participants(trip_id,user_id,status) VALUES
          ('00000000-0000-4000-8000-000000000020',auth.uid(),'approved');
          SELECT pg_sleep(0.2); COMMIT;
        """ % suffix, check=False)
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(reserve, ['3', '4']))
    assert sum(result.returncode == 0 for result in results) == 1, [r.stderr for r in results]
    assert any('trip_full' in result.stderr for result in results), [r.stderr for r in results]
    assert query('SELECT current_participants FROM public.trips').stdout.strip() == '2'
    assert query('SELECT count(*) FROM public.trip_participants').stdout.strip() == '2'
    print('PASS: two concurrent reservations for one spot, exactly one accepted; migration idempotent')
finally:
    # Only the database created above is removed, never the source database.
    run(['dropdb', '-U', 'postgres', DATABASE])

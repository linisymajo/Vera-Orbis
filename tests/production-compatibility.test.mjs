import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

test('production supplement preserves legacy dates and bigint progress, guards context and removes only management rights', async t => {
  const db=new PGlite()
  const sql=async name=>readFile(new URL('../supabase/production/'+name,import.meta.url),'utf8')
  try {
    await db.exec(`create role anon;create role authenticated;
      alter default privileges in schema public grant all on tables to anon,authenticated;
      create table public.weekly_challenges(id integer primary key,end_date date);
      create table public.profiles(id integer primary key,progress bigint);
      alter table public.weekly_challenges enable row level security;
      alter table public.profiles enable row level security;
      insert into public.weekly_challenges values(1,'2026-11-05'),(2,null);
      insert into public.profiles values(1,1099511627776);`)
    await t.test('missing deliberate target context aborts without a type or data change',async()=>{
      await assert.rejects(db.exec(await sql('academic_compatibility.sql')),/Approved production/)
      await db.exec('rollback')
      assert.equal((await db.query("select data_type from information_schema.columns where table_name='weekly_challenges' and column_name='end_date'")).rows[0].data_type,'date')
    })
    await db.query("select set_config('app.vera_release_target','iopgzmvaqobigjwibual',false)")
    await t.test('date conversion preserves UTC midnight, nulls and all unrelated bigint data',async()=>{
      await db.exec(await sql('academic_compatibility.sql'))
      assert.equal((await db.query('select end_date from weekly_challenges where id=1')).rows[0].end_date.toISOString(),'2026-11-05T00:00:00.000Z')
      assert.equal((await db.query('select end_date from weekly_challenges where id=2')).rows[0].end_date,null)
      assert.equal(String((await db.query('select progress from profiles')).rows[0].progress),'1099511627776')
      await db.exec(await sql('academic_compatibility.sql'))
    })
    await t.test('tracking is private and does not invent old migration history',async()=>{
      await db.exec(await sql('release_tracking.sql'))
      assert.equal((await db.query('select count(*)::int n from supabase_migrations.schema_migrations')).rows[0].n,0)
      assert.equal((await db.query("select has_table_privilege('authenticated','public.vera_production_release_checksums','SELECT') allowed")).rows[0].allowed,false)
    })
    await t.test('RLS remains enabled and ordinary client permissions survive hardening',async()=>{
      await db.exec(await sql('client_privilege_hardening.sql'))
      for(const role of ['anon','authenticated']) {
        for(const privilege of ['TRUNCATE','TRIGGER','REFERENCES']) assert.equal((await db.query('select has_table_privilege($1,$2,$3) allowed',[role,'public.profiles',privilege])).rows[0].allowed,false)
        assert.equal((await db.query('select has_table_privilege($1,$2,$3) allowed',[role,'public.profiles','SELECT'])).rows[0].allowed,true)
      }
      assert.equal((await db.query("select count(*)::int n from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and not c.relrowsecurity")).rows[0].n,0)
    })
  } finally { await db.close() }
})

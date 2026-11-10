import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

const migrations = ['0005_materials_storage_policy.sql', '0015_material_owner_boundary.sql', '0018_student_attachments.sql']

test('actual migration RLS guards support managed nonowner policy operators without weakening ownership or RLS', async t => {
  const db = new PGlite()
  const enabled = async () => (await db.query("select relrowsecurity from pg_catalog.pg_class where oid='storage.objects'::regclass")).rows[0].relrowsecurity
  async function asNonowner(work) {
    await db.exec('set role staging_policy_operator')
    try { return await work() } finally { await db.exec('reset role') }
  }
  try {
    await db.exec(`create role staging_policy_operator nosuperuser nobypassrls;
      create schema storage;
      create table storage.objects(id uuid primary key,bucket_id text,name text);
      grant usage on schema storage to staging_policy_operator;
      alter table storage.objects enable row level security;`)
    const ownerBefore = (await db.query("select relowner from pg_catalog.pg_class where oid='storage.objects'::regclass")).rows[0].relowner
    const operator = await asNonowner(() => db.query(`select r.rolsuper,r.rolbypassrls,
      c.relowner=r.oid as owns_table,pg_has_role(current_user,c.relowner,'MEMBER') as owner_member
      from pg_roles r cross join pg_class c where r.rolname=current_user and c.oid='storage.objects'::regclass`))
    assert.deepEqual(operator.rows[0], { rolsuper: false, rolbypassrls: false, owns_table: false, owner_member: false })
    // A plain ALTER fails even when the managed table already has RLS enabled.
    await assert.rejects(asNonowner(() => db.exec('alter table storage.objects enable row level security')), /must be owner|permission denied/i)
    for (const migration of migrations) await t.test(migration, async () => {
      const source = await readFile(new URL('../supabase/migrations/' + migration, import.meta.url), 'utf8')
      const blocks = source.match(/do \$storage_rls\$[\s\S]*?end \$storage_rls\$;/g) || []
      assert.equal(blocks.length, 1, 'exercise the actual reviewed migration guard')
      const block = blocks[0]
      assert.doesNotMatch(source.replace(block, ''), /alter\s+table\s+storage\.objects\s+enable\s+row\s+level\s+security/i, 'no unconditional owner-only ALTER may remain outside the guard')
      await asNonowner(() => db.exec(block))
      assert.equal(await enabled(), true, 'an already-protected managed table needs no owner-only ALTER')
      await db.exec('alter table storage.objects disable row level security')
      assert.equal(await enabled(), false)
      await assert.rejects(asNonowner(() => db.exec(block)), /must be owner|permission denied/i)
      assert.equal(await enabled(), false, 'nonowner cannot silently claim disabled RLS was fixed')
      await db.exec(block)
      assert.equal(await enabled(), true, 'the ordinary owner initialization path still enables RLS')
      assert.equal((await db.query("select relowner from pg_catalog.pg_class where oid='storage.objects'::regclass")).rows[0].relowner, ownerBefore)
      await assert.rejects(asNonowner(() => db.exec('select * from storage.objects')), /permission denied/i)
    })
    const memberships = (await db.query("select count(*) from pg_auth_members where member=(select oid from pg_roles where rolname='staging_policy_operator')")).rows[0].count
    assert.equal(Number(memberships), 0, 'guards never grant owner membership or bypass privileges')
  } finally { await db.close() }
})

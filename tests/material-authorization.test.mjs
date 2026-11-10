import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'

const T = '10000000-0000-4000-8000-000000000001'
const OTHER_T = '10000000-0000-4000-8000-000000000002'
const ADMIN = '10000000-0000-4000-8000-000000000003'
const S = '20000000-0000-4000-8000-000000000001'
const OTHER_S = '20000000-0000-4000-8000-000000000002'
const PENDING = '20000000-0000-4000-8000-000000000003'
const migration = name => readFileSync(new URL('../supabase/migrations/' + name, import.meta.url), 'utf8')

test('actual materials policies preserve assigned downloads while enforcing teacher ownership and enrollment', async t => {
  const db = new PGlite()
  async function as(user, work) {
    await db.exec('set role authenticated')
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user])
    try { return await work() } finally { await db.exec('reset role') }
  }
  const rowsFor = (user, table) => as(user, () => db.query('select * from ' + table))
  async function putMaterial({ teacher = T, student = S, path = T + '/lesson.pdf', audience = 'student', title = 'Private lesson' } = {}) {
    return (await db.query('insert into materials(teacher_id,student_id,file_path,audience,title) values($1,$2,$3,$4,$5) returning id', [teacher, student, path, audience, title])).rows[0].id
  }
  try {
    await db.exec(`create role authenticated; create role anon; create schema auth; create schema storage;
      create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}'::jsonb);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      create table public.teachers(id uuid primary key references auth.users(id));
      create table public.profiles(id uuid primary key references auth.users(id),name text,language text,level text,level_name text,progress int,lessons_completed int,current_module text,next_step text);
      create table public.inbox_messages(id uuid primary key,recipient_id uuid,is_read boolean,read_at timestamptz,updated_at timestamptz);
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(name text primary key,bucket_id text,metadata jsonb);
      create function storage.foldername(name text) returns text[] language sql immutable as $$select (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1]$$;
      grant usage on schema public,auth,storage to authenticated,anon;
      grant select on public.teachers,public.profiles to authenticated;
      grant select,insert,update,delete on storage.objects to authenticated;`)
    for (const id of [T, OTHER_T, ADMIN, S, OTHER_S]) {
      await db.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())', [id, id + '@example.com'])
    }
    await db.query('insert into teachers values($1),($2)', [T, OTHER_T])
    await db.query("insert into profiles(id,name) values($1,'Student'),($2,'Other student')", [S, OTHER_S])
    // Real legacy teacher/material policy migration and Storage policy migration.
    await db.exec(migration('0008_teacher_management_security_patch.sql'))
    await db.exec(migration('0005_materials_storage_policy.sql'))
    await db.exec(migration('0011_material_office_formats.sql'))
    await db.exec(migration('0013_hybrid_enrollment.sql'))
    await db.exec('grant select,insert,update,delete on public.materials to authenticated')
    await db.query('insert into academic_admins(user_id) values($1)', [ADMIN])
    await db.query("update enrollments set source='self',teacher_id=$1 where student_id=$2", [T, S])
    await db.query("update enrollments set source='self',teacher_id=$1 where student_id=$2", [OTHER_T, OTHER_S])
    await db.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())', [PENDING, 'pending@example.com'])
    const ownMaterial = await putMaterial()
    const otherMaterial = await putMaterial({ teacher: OTHER_T, student: OTHER_S, path: OTHER_T + '/private.pdf' })
    const globalMaterial = await putMaterial({ student: null, path: T + '/global.docx', audience: 'all', title: 'Shared expressions' })
    const legacyMaterial = await putMaterial({ teacher: null, path: 'legacy/existing.svg', title: 'Legacy assigned image' })
    await putMaterial({ teacher: T, student: S, path: OTHER_T + '/aliased.pdf', title: 'Preexisting forged alias' })
    for (const name of [T + '/lesson.pdf', OTHER_T + '/private.pdf', T + '/global.docx', 'legacy/existing.svg', OTHER_T + '/aliased.pdf', S + '/student-folder.pdf']) {
      await db.query("insert into storage.objects values($1,'materials',null)", [name])
    }
    await putMaterial({ teacher: null, path: S + '/student-folder.pdf', title: 'Legacy student-folder resource' })
    const before = {
      materials: (await db.query('select * from materials order by id')).rows,
      objects: (await db.query('select * from storage.objects order by name')).rows
    }
    await db.exec(migration('0015_material_owner_boundary.sql'))

    await t.test('migration is data-preserving and idempotent', async () => {
      assert.deepEqual((await db.query('select * from materials order by id')).rows, before.materials)
      assert.deepEqual((await db.query('select * from storage.objects order by name')).rows, before.objects)
      await db.exec(migration('0015_material_owner_boundary.sql'))
      assert.deepEqual((await db.query('select * from materials order by id')).rows, before.materials)
    })
    await t.test('each teacher reads own metadata and Storage namespace; cross-teacher reads are empty', async () => {
      const own = await rowsFor(T, 'materials')
      assert.ok(own.rows.some(row => row.id === ownMaterial))
      assert.ok(!own.rows.some(row => row.id === otherMaterial || row.id === legacyMaterial))
      const theirs = await rowsFor(OTHER_T, 'materials')
      assert.ok(theirs.rows.some(row => row.id === otherMaterial))
      assert.ok(!theirs.rows.some(row => row.id === ownMaterial || row.id === globalMaterial))
      const files = await rowsFor(T, 'storage.objects')
      assert.ok(files.rows.some(row => row.name === T + '/lesson.pdf'))
      assert.ok(files.rows.every(row => row.name.startsWith(T + '/')))
      assert.equal((await as(T, () => db.query('select * from storage.objects where name=$1', [OTHER_T + '/private.pdf']))).rows.length, 0)
    })
    await t.test('approved student keeps own, global and unowned legacy downloads; pending student has none', async () => {
      const files = (await rowsFor(S, 'storage.objects')).rows.map(row => row.name)
      for (const name of [T + '/lesson.pdf', T + '/global.docx', 'legacy/existing.svg', S + '/student-folder.pdf']) assert.ok(files.includes(name), name)
      assert.ok(!files.includes(OTHER_T + '/private.pdf'))
      assert.ok(!files.includes(OTHER_T + '/aliased.pdf'), 'preexisting foreign-owner alias must not authorize download')
      const other = (await rowsFor(OTHER_S, 'storage.objects')).rows.map(row => row.name)
      assert.deepEqual(other.sort(), [OTHER_T + '/private.pdf', T + '/global.docx'].sort())
      assert.equal((await rowsFor(PENDING, 'materials')).rows.length, 0)
      assert.equal((await rowsFor(PENDING, 'storage.objects')).rows.length, 0)
    })
    await t.test('teachers upload and maintain own files; other folders and student mutations are denied', async () => {
      const path = T + '/new.pptx'
      await as(T, () => db.query("insert into storage.objects values($1,'materials',null)", [path]))
      assert.equal((await as(T, () => db.query('update storage.objects set metadata=$1 where name=$2 returning name', [{ reviewed: true }, path]))).rows.length, 1)
      assert.equal((await as(OTHER_T, () => db.query('update storage.objects set metadata=$1 where name=$2 returning name', [{ stolen: true }, path]))).rows.length, 0)
      assert.equal((await as(OTHER_T, () => db.query('delete from storage.objects where name=$1 returning name', [path]))).rows.length, 0)
      await assert.rejects(as(T, () => db.query("insert into storage.objects values($1,'materials',null)", [OTHER_T + '/wrong-folder.pdf'])), /row-level security/)
      await assert.rejects(as(T, () => db.query('update storage.objects set name=$1 where name=$2', [OTHER_T + '/renamed.pdf', path])), /row-level security/)
      await assert.rejects(as(S, () => db.query("insert into storage.objects values($1,'materials',null)", [S + '/new.pdf'])), /row-level security/)
      assert.equal((await as(S, () => db.query('delete from storage.objects where name=$1 returning name', [S + '/student-folder.pdf']))).rows.length, 0)
      assert.equal((await as(T, () => db.query('delete from storage.objects where name=$1 returning name', [path]))).rows.length, 1)
    })
    await t.test('material writes require teacher ownership, assigned student scope and own file namespace', async () => {
      const valid = await as(T, () => db.query("insert into materials(teacher_id,student_id,title,file_path) values($1,$2,'New own resource',$3) returning id", [T, S, T + '/lesson.pdf']))
      assert.ok(valid.rows[0].id)
      for (const [teacher, student, path] of [[OTHER_T, S, T + '/lesson.pdf'], [T, OTHER_S, T + '/lesson.pdf'], [T, PENDING, T + '/lesson.pdf'], [T, S, OTHER_T + '/private.pdf'], [null, S, T + '/lesson.pdf']]) {
        await assert.rejects(as(T, () => db.query("insert into materials(teacher_id,student_id,title,file_path) values($1,$2,'Denied',$3)", [teacher, student, path])), /row-level security/)
      }
      await assert.rejects(as(T, () => db.query('update materials set student_id=$1 where id=$2', [OTHER_S, ownMaterial])), /row-level security/)
      await assert.rejects(as(T, () => db.query('update materials set file_path=$1 where id=$2', [OTHER_T + '/private.pdf', ownMaterial])), /row-level security/)
      assert.equal((await as(T, () => db.query("update materials set title='Owned edit' where id=$1 returning id", [ownMaterial]))).rows.length, 1)
      assert.equal((await as(T, () => db.query('delete from materials where id=$1 returning id', [otherMaterial]))).rows.length, 0)
      assert.equal((await as(S, () => db.query('delete from materials where id=$1 returning id', [ownMaterial]))).rows.length, 0)
    })
    await t.test('admin can inspect unowned metadata without inheriting teachers private folders', async () => {
      const visible = (await rowsFor(ADMIN, 'materials')).rows
      assert.ok(visible.some(row => row.id === legacyMaterial))
      assert.ok(!visible.some(row => row.id === ownMaterial || row.id === otherMaterial))
      assert.equal((await rowsFor(ADMIN, 'storage.objects')).rows.length, 0)
    })
  } finally { await db.close() }
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { uploadMaterialFile } from '../src/lib/materialStorage.js'

const T = '10000000-0000-4000-8000-000000000001'
const S = '20000000-0000-4000-8000-000000000001'
const OTHER = '20000000-0000-4000-8000-000000000002'
const office = [
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
]

// Build real uncompressed ZIP containers for small Office OpenXML fixtures in memory.
function zip(entries) {
  let offset = 0
  const local = [], directory = []
  for (const [name, xml] of entries) {
    const filename = Buffer.from(name), data = Buffer.from(xml)
    let crc = 0xffffffff
    for (const byte of data) {
      crc ^= byte
      for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0)
    }
    crc = (crc ^ 0xffffffff) >>> 0
    const header = Buffer.alloc(30)
    header.writeUInt32LE(0x04034b50); header.writeUInt16LE(20, 4)
    header.writeUInt32LE(crc, 14); header.writeUInt32LE(data.length, 18)
    header.writeUInt32LE(data.length, 22); header.writeUInt16LE(filename.length, 26)
    local.push(header, filename, data)
    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6)
    central.writeUInt32LE(crc, 16); central.writeUInt32LE(data.length, 20)
    central.writeUInt32LE(data.length, 24); central.writeUInt16LE(filename.length, 28)
    central.writeUInt32LE(offset, 42); directory.push(central, filename)
    offset += header.length + filename.length + data.length
  }
  const central = Buffer.concat(directory), end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10)
  end.writeUInt32LE(central.length, 12); end.writeUInt32LE(offset, 16)
  return Buffer.concat([...local, central, end])
}
function openXML(path, contentType, content, extras = []) {
  return zip([
    ['[Content_Types].xml', `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/${path}" ContentType="${contentType}"/>${extras.filter(([name]) => name.startsWith('xl/worksheets/')).map(([name]) => `<Override PartName="/${name}" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`],
    ['_rels/.rels', `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="${path}"/></Relationships>`],
    [path, content], ...extras
  ])
}
function samplePDF() {
  const stream = 'BT /F1 18 Tf 30 250 Td (Listen. Repeat. Personalize. Use.) Tj ET'
  const objects = [
    '<</Type/Catalog/Pages 2 0 R>>',
    '<</Type/Pages/Kids[3 0 R]/Count 1>>',
    '<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 300]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>',
    `<</Length ${Buffer.byteLength(stream)}>>\nstream\n${stream}\nendstream`,
    '<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>'
  ]
  let pdf = '%PDF-1.4\n'
  const offsets = [0]
  for (let i = 0; i < objects.length; i++) {
    offsets.push(Buffer.byteLength(pdf))
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`
  }
  const xref = Buffer.byteLength(pdf)
  pdf += `xref\n0 ${offsets.length}\n0000000000 65535 f \n`
  for (const offset of offsets.slice(1)) pdf += `${String(offset).padStart(10, '0')} 00000 n \n`
  return pdf + `trailer\n<</Root 1 0 R/Size ${offsets.length}>>\nstartxref\n${xref}\n%%EOF\n`
}

const samples = [
  new File([openXML('word/document.xml', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml', '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Listen. Repeat. Personalize. Use.</w:t></w:r></w:p></w:body></w:document>')], 'lesson.docx', { type: office[1] }),
  new File([openXML('ppt/presentation.xml', 'application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml', '<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:sldIdLst/><p:sldSz cx="9144000" cy="6858000"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>')], 'lesson.pptx', { type: office[3] }),
  new File([openXML('xl/workbook.xml', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml', '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Expressions" sheetId="1" r:id="rId1"/></sheets></workbook>', [
    ['xl/_rels/workbook.xml.rels', '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>'],
    ['xl/worksheets/sheet1.xml', '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>Bonjour</t></is></c></row></sheetData></worksheet>']
  ])], 'lesson.xlsx', { type: '' }),
  new File([samplePDF()], 'lesson.pdf', { type: 'application/pdf' }),
  new File([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWOQAAAAASUVORK5CYII=', 'base64')], 'lesson.png', { type: 'image/png' })
]
const wav = Buffer.alloc(46)
wav.write('RIFF'); wav.writeUInt32LE(38, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16)
wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(8000, 24)
wav.writeUInt32LE(16000, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34)
wav.write('data', 36); wav.writeUInt32LE(2, 40)
samples.push(new File([wav], 'listen.wav', { type: 'audio/wav' }))

function storageDouble({ user = T, error = null, confirmed = true } = {}) {
  const objects = new Map(), calls = []
  return {
    objects, calls,
    auth: { getUser: async () => ({ data: { user: user ? { id: user } : null } }) },
    storage: { from(bucket) {
      assert.equal(bucket, 'materials')
      return { async upload(path, file, options) {
        calls.push({ path, options })
        if (error) return { error }
        objects.set(path, Buffer.from(await file.arrayBuffer()))
        return { data: confirmed ? { path } : {} }
      } }
    } }
  }
}

test('Office, PDF, PNG and WAV samples retain exact bytes through the upload adapter (Storage double)', async () => {
  for (const file of samples) {
    const api = storageDouble()
    const { path } = await uploadMaterialFile(api, file, { teacherId: T })
    assert.ok(path.startsWith(T + '/'))
    assert.deepEqual(api.objects.get(path), Buffer.from(await file.arrayBuffer()))
    assert.equal(api.calls[0].options.upsert, false)
    assert.ok(api.calls[0].options.contentType)
  }
})
test('upload blocks unsupported, empty, oversized or unauthenticated files before writes', async () => {
  for (const file of [
    new File([], 'empty.pdf'),
    new File(['bad'], 'lesson.exe'),
    new File(['bad'], 'lesson.docx', { type: 'text/html' }),
    { name: 'lesson.pdf', type: '', size: 10485761 },
    { name: 'lesson.pdf', type: '', size: NaN }
  ]) {
    const api = storageDouble()
    await assert.rejects(uploadMaterialFile(api, file), /supported/)
    assert.equal(api.calls.length, 0)
  }
  for (const [user, teacherId] of [[null, undefined], [S, T]]) {
    const api = storageDouble({ user })
    await assert.rejects(uploadMaterialFile(api, samples[0], { teacherId }), /session|identity/)
    assert.equal(api.calls.length, 0)
  }
})
test('upload rejects Storage denial and missing persistence confirmation', async () => {
  await assert.rejects(uploadMaterialFile(storageDouble({ error: { message: 'RLS denied' } }), samples[0]), /RLS denied/)
  await assert.rejects(uploadMaterialFile(storageDouble({ confirmed: false }), samples[0]), /did not confirm/)
})

test('actual 0005 + 0011 PostgreSQL migrations preserve bucket limits, objects, policies and access', async () => {
  const db = new PGlite()
  try {
    await db.exec(`create role authenticated; create schema auth; create schema storage;
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      create table public.teachers(id uuid primary key);
      create table public.materials(file_path text,student_id uuid,audience text);
      create table storage.buckets(id text primary key,name text,public boolean, file_size_limit bigint, allowed_mime_types text[]);
      create table storage.objects(name text primary key,bucket_id text,metadata jsonb);
      create function storage.foldername(name text) returns text[] language sql immutable as $$select (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1]$$;
      grant usage on schema public,auth,storage to authenticated;
      grant select on public.teachers,public.materials,storage.buckets to authenticated;
      grant select,insert,update,delete on storage.objects to authenticated;`)
    await db.query('insert into teachers values($1)', [T])
    const migration = name => readFileSync(new URL('../supabase/migrations/' + name, import.meta.url), 'utf8')
    await db.exec(migration('0005_materials_storage_policy.sql'))
    const svgPath = T + '/existing.svg'
    await db.query("insert into storage.objects values($1,'materials',$2)", [svgPath, JSON.stringify({ mimetype: 'image/svg+xml', size: 67 })])
    await db.query("insert into materials values($1,$2,'student')", [svgPath, S])
    const beforeBucket = (await db.query("select * from storage.buckets where id='materials'")).rows[0]
    const beforeObjects = (await db.query('select * from storage.objects')).rows
    const beforePolicies = (await db.query("select * from pg_policies where schemaname='storage' order by policyname")).rows
    await db.exec(migration('0011_material_office_formats.sql'))
    const bucket = (await db.query("select * from storage.buckets where id='materials'")).rows[0]
    assert.equal(bucket.public, false)
    assert.equal(Number(bucket.file_size_limit), 10485760)
    for (const mime of [...beforeBucket.allowed_mime_types, ...office]) assert.ok(bucket.allowed_mime_types.includes(mime), mime)
    assert.deepEqual((await db.query('select * from storage.objects')).rows, beforeObjects)
    assert.deepEqual((await db.query("select * from pg_policies where schemaname='storage' order by policyname")).rows, beforePolicies)
    await db.exec(migration('0011_material_office_formats.sql'))
    assert.equal((await db.query("select allowed_mime_types from storage.buckets where id='materials'")).rows[0].allowed_mime_types.length, bucket.allowed_mime_types.length)
    async function as(user, work) {
      await db.exec('set role authenticated')
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user])
      try { return await work() } finally { await db.exec('reset role') }
    }
    assert.equal((await as(S, () => db.query('select * from storage.objects'))).rows[0].name, svgPath)
    assert.equal((await as(OTHER, () => db.query('select * from storage.objects'))).rows.length, 0)
    await as(T, () => db.query("insert into storage.objects values($1,'materials',null)", [T + '/new.docx']))
    await assert.rejects(as(S, () => db.query("insert into storage.objects values($1,'materials',null)", [S + '/student.docx'])), /row-level security/)
    await assert.rejects(as(T, () => db.query("insert into storage.objects values($1,'materials',null)", [S + '/wrong-folder.docx'])), /row-level security/)
    await db.exec("update storage.buckets set allowed_mime_types=null where id='materials'")
    await db.exec(migration('0011_material_office_formats.sql'))
    assert.equal((await db.query("select allowed_mime_types from storage.buckets where id='materials'")).rows[0].allowed_mime_types, null)
  } finally { await db.close() }
})



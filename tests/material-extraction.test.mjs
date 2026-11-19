import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { extractAcademicMaterial, indexAcademicMaterial } from '../supabase/functions/academic-ai/material-extraction.js'
const require = createRequire(new URL('../supabase/functions/academic-ai/package.json', import.meta.url))
const { zipSync, strToU8 } = require('fflate')
const archive = entries => zipSync(Object.fromEntries(Object.entries(entries).map(([k, v]) => [k, strToU8(v)])))
export function syntheticPptx() { return archive({ 'ppt/slides/slide1.xml': '<p:sld xmlns:p="p" xmlns:a="a"><a:t>Could you tell me how to get to the station?</a:t></p:sld>', 'ppt/slides/slide2.xml': '<p:sld xmlns:p="p" xmlns:a="a"><a:t>Ask a follow-up question politely.</a:t></p:sld>', 'ppt/notesSlides/notesSlide1.xml': '<p:notes xmlns:p="p" xmlns:a="a"><a:t>Practise in pairs.</a:t></p:notes>' }) }
function pdf(text = null) {
  const stream = text ? `BT /F1 12 Tf 20 80 Td (${text}) Tj ET` : ''
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 100] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`]
  let s = '%PDF-1.4\n'; const offsets = []
  objects.forEach((v, i) => { offsets.push(s.length); s += `${i + 1} 0 obj\n${v}\nendobj\n` })
  const xref = s.length; s += 'xref\n0 6\n0000000000 65535 f \n' + offsets.map(n => String(n).padStart(10, '0') + ' 00000 n \n').join('') + `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  return strToU8(s)
}
test('real local Office parsers retain slide, note, paragraph and worksheet references', async () => {
  const ppt = await extractAcademicMaterial(syntheticPptx(), 'travel.pptx'); assert.equal(ppt.status, 'ready'); assert.equal(ppt.sections[0].locator, 'slide 1'); assert.ok(ppt.sections.some(s => s.locator === 'notes 1'))
  const doc = await extractAcademicMaterial(archive({ 'word/document.xml': '<w:document xmlns:w="w"><w:p><w:r><w:t>Useful &amp; polite</w:t></w:r><w:r><w:t> requests</w:t></w:r></w:p></w:document>' }), 'travel.docx'); assert.equal(doc.sections[0].text, 'Useful & polite requests')
  const xlsx = await extractAcademicMaterial(archive({ 'xl/sharedStrings.xml': '<sst><si><t>Directions</t></si><si><r><t>Polite </t></r><r><t>questions</t></r></si></sst>', 'xl/worksheets/sheet1.xml': '<worksheet><sheetData><row><c t="s"><v>0</v></c><c t="s"><v>1</v></c><c><v>7</v></c></row></sheetData></worksheet>' }), 'travel.xlsx'); assert.equal(xlsx.sections[0].text, 'Directions | Polite questions | 7')
})
test('real PDF parser extracts selectable text and identifies OCR-required pages without inventing text', async () => {
  const text = await extractAcademicMaterial(pdf('Practical travel directions'), 'travel.pdf'); assert.equal(text.status, 'ready'); assert.match(text.sections[0].text, /Practical travel directions/)
  const scanned = await extractAcademicMaterial(pdf(), 'scanned.pdf'); assert.equal(scanned.status, 'ocr_required'); assert.deepEqual(scanned.sections, [])
})
test('untrusted XML/ZIP, excess data and unsupported files never trigger invented content', async () => {
  await assert.rejects(extractAcademicMaterial(archive({ 'word/document.xml': '<!DOCTYPE foo [<!ENTITY x SYSTEM "https://private.invalid">]><w:p>&x;</w:p>' }), 'private.docx'), e => e.code === 'material_parse_failed' && !e.message.includes('private.invalid'))
  const bomb = archive({ 'word/document.xml': '<w:p>text</w:p>' }), view = new DataView(bomb.buffer, bomb.byteOffset, bomb.byteLength)
  for (let i = 0; i < bomb.length - 30; i++) if (view.getUint32(i, true) === 0x02014b50) { view.setUint32(i + 24, 0xffffffff, true); break }
  await assert.rejects(extractAcademicMaterial(bomb, 'large.docx'))
  await assert.rejects(extractAcademicMaterial(strToU8('private malformed document'), 'bad.pptx'))
  assert.equal((await extractAcademicMaterial(strToU8('Legacy content'), 'legacy.doc')).status, 'unsupported')
  assert.equal((await extractAcademicMaterial(strToU8('Teacher notes for a practical conversation'), 'notes.md')).sections[0].locator, 'text')
})
test('indexer authorizes before downloading, saves exact bytes hash and never returns private paths', async () => {
  let downloads = 0, saves = 0
  const bytes = syntheticPptx(), client = { rpc: async (name, args) => name === 'get_academic_material_source' ? { data: { file_path: 'teacher/private.pptx', fingerprint: 'version-1' } } : (saves++, assert.equal(args.p_status, 'ready'), assert.match(args.p_content_hash, /^[a-f0-9]{64}$/), { data: { id: 'saved', status: 'ready' } }), storage: { from: bucket => { assert.equal(bucket, 'materials'); return { download: async path => { downloads++; assert.equal(path, 'teacher/private.pptx'); return { data: new Blob([bytes]) } } } } } }
  const saved = await indexAcademicMaterial(client, 'synthetic-student', 'synthetic-material'); assert.equal(downloads, 1); assert.equal(saves, 1); assert.ok(!JSON.stringify(saved).includes('private.pptx'))
  client.rpc = async () => ({ error: { code: '42501' } }); await assert.rejects(indexAcademicMaterial(client, 'other-student', 'synthetic-material')); assert.equal(downloads, 1)
})

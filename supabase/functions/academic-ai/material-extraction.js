// Server-only, bounded local parsing. Private files never go to an AI provider.
import { unzipSync } from 'fflate'
import { XMLParser, XMLValidator } from 'fast-xml-parser'
import { AcademicAIError } from './core.js'
export const MATERIAL_PARSER_VERSION = 'academic-text-1'
const fail = () => { throw new AcademicAIError('material_parse_failed', 'Document could not be safely parsed. The original file is preserved.', 422) }
const decode = bytes => new TextDecoder('utf-8', { fatal: true }).decode(bytes)
const clean = value => String(value).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim()
function xml(bytes) {
  const text = decode(bytes)
  if (/<!\s*(DOCTYPE|ENTITY)/i.test(text) || XMLValidator.validate(text) !== true) fail()
  return new XMLParser({ preserveOrder: true, ignoreAttributes: false, processEntities: true, trimValues: false }).parse(text)
}
function texts(nodes, tag) {
  const found = []
  for (const node of nodes || []) for (const [key, value] of Object.entries(node)) {
    if (key === tag) found.push(value.map(x => x['#text'] ?? '').join(''))
    else if (Array.isArray(value)) found.push(...texts(value, tag))
  }
  return found
}
function sectionsFromZip(bytes, extension) {
  let count = 0, total = 0
  const files = unzipSync(bytes, { filter(entry) {
    if (++count > 1000 || entry.name.includes('..') || !Number.isSafeInteger(entry.originalSize) || entry.originalSize > 4000000) fail()
    const chosen = extension === 'docx' ? entry.name === 'word/document.xml'
      : extension === 'pptx' ? /^ppt\/(slides\/slide|notesSlides\/notesSlide)\d+\.xml$/.test(entry.name)
      : /^xl\/(sharedStrings|workbook|worksheets\/sheet\d+)\.xml$/.test(entry.name)
    if (chosen && (total += entry.originalSize) > 12000000) fail()
    return chosen
  } })
  const out = []
  if (extension === 'docx') {
    if (!files['word/document.xml']) fail()
    const paragraphs = []
    const walk = nodes => { for (const node of nodes) for (const [key, value] of Object.entries(node)) if (key === 'w:p') paragraphs.push(texts(value, 'w:t').join('')); else if (Array.isArray(value)) walk(value) }
    walk(xml(files['word/document.xml'])); paragraphs.forEach((text, i) => out.push({ locator: 'paragraph ' + (i + 1), text }))
  } else if (extension === 'pptx') {
    const slides = Object.keys(files).filter(p => /^ppt\/slides\//.test(p)).sort((a, b) => Number(a.match(/slide(\d+)/)[1]) - Number(b.match(/slide(\d+)/)[1]))
    if (!slides.length) fail()
    for (const file of slides) {
      const n = Number(file.match(/slide(\d+)/)[1]); out.push({ locator: 'slide ' + n, text: texts(xml(files[file]), 'a:t').join('\n') })
      const notes = files[`ppt/notesSlides/notesSlide${n}.xml`]
      if (notes) out.push({ locator: 'notes ' + n, text: texts(xml(notes), 'a:t').join('\n') })
    }
  } else {
    const strings = files['xl/sharedStrings.xml'] ? texts(xml(files['xl/sharedStrings.xml']), 'si').map(String) : []
    // Rich/shared strings contain nested t nodes; preserve their complete value.
    if (files['xl/sharedStrings.xml']) {
      strings.length = 0
      const walk = nodes => { for (const node of nodes) for (const [k, v] of Object.entries(node)) if (k === 'si') strings.push(texts(v, 't').join('')); else if (Array.isArray(v)) walk(v) }
      walk(xml(files['xl/sharedStrings.xml']))
    }
    const sheets = Object.keys(files).filter(p => /^xl\/worksheets\//.test(p)).sort()
    if (!sheets.length) fail()
    for (const file of sheets) {
      const rows = []
      const walk = nodes => { for (const node of nodes) for (const [k, v] of Object.entries(node)) if (k === 'row') {
        const cells = []
        for (const cell of v) if (cell.c) {
          const raw = texts(cell.c, 'v')[0] ?? texts(cell.c, 't').join('')
          // Cached formula values only; formulas, macros and links are never run.
          cells.push(cell[':@']?.['@_t'] === 's' ? strings[Number(raw)] || '' : raw)
        }
        rows.push(cells.join(' | '))
      } else if (Array.isArray(v)) walk(v) }
      walk(xml(files[file])); out.push({ locator: file.replace('xl/worksheets/', ''), text: rows.join('\n') })
    }
  }
  return out
}
export async function extractAcademicMaterial(bytes, name, { pdfLoader } = {}) {
  if (!(bytes instanceof Uint8Array) || !bytes.length || bytes.length > 10 * 1024 * 1024) fail()
  const extension = String(name).split('.').pop().toLowerCase()
  let sections
  try {
    if (['docx', 'pptx', 'xlsx'].includes(extension)) sections = sectionsFromZip(bytes, extension)
    else if (['txt', 'md', 'csv'].includes(extension)) sections = [{ locator: 'text', text: decode(bytes) }]
    else if (extension === 'pdf') {
      const { getDocumentProxy } = pdfLoader || await import('unpdf')
      const pdf = await getDocumentProxy(bytes.slice(), { verbosity: 0, isEvalSupported: false, useSystemFonts: false, useWorkerFetch: false, maxImageSize: 1 })
      try {
        if (pdf.numPages > 100) fail()
        sections = []
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i), content = await page.getTextContent()
          sections.push({ locator: 'page ' + i, text: content.items.map(x => x.str || '').join(' ') }); page.cleanup()
        }
      } finally { await pdf.cleanup?.(); await pdf.loadingTask?.destroy?.() }
    } else return { status: 'unsupported', sections: [] }
    sections = sections.map(s => ({ locator: s.locator, text: clean(s.text) })).filter(s => s.text)
    if (sections.length > 200 || JSON.stringify(sections).length > 80000) fail()
    return { status: sections.length ? 'ready' : extension === 'pdf' ? 'ocr_required' : 'unsupported', sections }
  } catch (error) { if (error instanceof AcademicAIError) throw error; fail() }
}
export async function indexAcademicMaterial(client, studentId, materialId) {
  const source = await client.rpc('get_academic_material_source', { p_student_id: studentId, p_material_id: materialId })
  if (source.error || !source.data) throw new AcademicAIError('forbidden', 'Authorized material unavailable.', 403)
  const m = source.data
  let bytes, name
  if (m.file_path) {
    const download = await client.storage.from('materials').download(m.file_path)
    if (download.error || !download.data || download.data.size > 10 * 1024 * 1024) throw new AcademicAIError('material_unavailable', 'Private file download failed.', 503)
    bytes = new Uint8Array(await download.data.arrayBuffer()); name = m.file_path
  } else { bytes = new TextEncoder().encode(m.description || ''); name = 'resource.txt' }
  const result = bytes.length ? await extractAcademicMaterial(bytes, name) : { status: 'unsupported', sections: [] }
  const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(n => n.toString(16).padStart(2, '0')).join('')
  const saved = await client.rpc('save_academic_material_text', { p_student_id: studentId, p_material_id: materialId, p_fingerprint: m.fingerprint, p_content_hash: hash, p_parser_version: MATERIAL_PARSER_VERSION, p_status: result.status, p_sections: result.sections })
  if (saved.error || !saved.data?.id) throw new AcademicAIError('material_changed', 'Extraction save was not confirmed. Reload and reprocess if the source changed.', 409)
  // Never return a path, signed URL or downloaded bytes to the browser.
  return saved.data
}

import { materialContentType } from '../lib/academicOperations.js'
import { uploadMaterialFile } from '../lib/materialStorage.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const esc = value => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;')
const FIELDS = ['id', 'teacher_id', 'student_id', 'audience', 'title', 'type', 'description', 'language', 'level', 'file_path']
const SELECT = FIELDS.join(',')
const ACCEPT = '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png,.webp,.mp3,.wav,.ogg,.mp4'

function plain(value, label, max) {
  if (typeof value !== 'string' || value.length > max) throw new Error(label + ' is too long.')
  return value.trim()
}
function validateFile(file) {
  if (!file || !Number.isFinite(file.size) || !materialContentType(file)) throw new Error('Choose a nonempty supported file up to 10 MB.')
}
async function digest(file) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', await file.arrayBuffer())), byte => byte.toString(16).padStart(2, '0')).join('')
}

export function createMaterialUploadEntry(file) {
  validateFile(file)
  return {
    id: crypto.randomUUID(),
    file,
    fileName: file.name,
    fileSize: file.size,
    fileHash: null,
    title: file.name.replace(/\.[^.]+$/, '').slice(0, 160) || 'Resource',
    teacherId: null,
    payload: null,
    path: null,
    uploadAttemptPath: null,
    uploadConfirmed: false,
    state: 'queued',
    error: '',
    record: null,
    inFlight: null
  }
}

function preparePayload(entry, teacherId, metadata) {
  if (!UUID.test(entry.id) || !UUID.test(teacherId)) throw new Error('A verified upload identity is required.')
  const studentId = metadata.studentId || null
  if (studentId && !UUID.test(studentId)) throw new Error('Choose a student from the list.')
  const title = plain(entry.title, 'Title', 160)
  if (!title) throw new Error('Add a title for this material.')
  const type = metadata.type || 'resource'
  if (!['class', 'practice', 'vocabulary', 'resource'].includes(type)) throw new Error('Choose a supported resource type.')
  return {
    id: entry.id,
    teacher_id: teacherId,
    student_id: studentId,
    audience: studentId ? 'student' : 'all',
    title,
    type,
    description: plain(metadata.description || '', 'Description', 3000) || null,
    language: plain(metadata.language || '', 'Language', 80) || null,
    level: plain(metadata.level || '', 'Level', 40) || null,
    file_path: null
  }
}

function matches(record, payload) {
  return record && FIELDS.every(key => (record[key] ?? null) === (payload[key] ?? null))
}

async function existingRecord(client, entry) {
  const result = await client.from('materials').select(SELECT).eq('id', entry.id).eq('teacher_id', entry.teacherId).maybeSingle()
  if (result.error) throw new Error('The saved status could not be checked. Keep this item and retry when connected.')
  if (!result.data) return null
  if (!matches(result.data, entry.payload)) throw new Error('This saved material changed. Reload the library before continuing.')
  return result.data
}

const missing = error => Number(error?.statusCode ?? error?.status) === 404

async function confirmObject(client, entry) {
  const result = await client.storage.from('materials').download(entry.uploadAttemptPath)
  if (result.error) {
    if (missing(result.error)) return false
    throw new Error('The private upload could not be checked. Its bytes have been preserved; retry when connected.')
  }
  if (!result.data || !entry.fileHash || await digest(result.data) !== entry.fileHash) throw new Error('The stored file could not be matched to this upload. Keep the item for review.')
  entry.path = entry.uploadAttemptPath
  entry.uploadConfirmed = true
  return true
}

async function uploadEntry(client, entry, onUpdate) {
  if (entry.uploadConfirmed && entry.path) return
  if (entry.uploadAttemptPath) {
    if (await confirmObject(client, entry)) return
    if (!entry.file) throw new Error('Re-select ' + entry.fileName + ' to resume this upload.')
    const result = await client.storage.from('materials').upload(entry.uploadAttemptPath, entry.file, { contentType: materialContentType(entry.file), upsert: false })
    if (result.error || result.data?.path !== entry.uploadAttemptPath) {
      if (await confirmObject(client, entry)) return
      throw new Error(result.error?.message || 'The file upload could not be confirmed.')
    }
    entry.path = entry.uploadAttemptPath
    entry.uploadConfirmed = true
    return
  }
  if (!entry.file) throw new Error('Re-select ' + entry.fileName + ' to resume this upload.')
  validateFile(entry.file)
  entry.fileHash = entry.fileHash || await digest(entry.file)
  const observed = {
    auth: client.auth,
    storage: {
      from: bucket => {
        const storage = client.storage.from(bucket)
        return {
          upload: (path, file, options) => {
            entry.uploadAttemptPath = path
            onUpdate?.(entry)
            return storage.upload(path, file, options)
          }
        }
      }
    }
  }
  const result = await uploadMaterialFile(observed, entry.file, { teacherId: entry.teacherId })
  entry.path = result.path
  entry.uploadConfirmed = true
}

export async function saveMaterialUploadEntry(client, entry, metadata, { teacherId, onUpdate } = {}) {
  if (entry.inFlight) return entry.inFlight
  if (entry.state === 'saved' && entry.record) return entry.record
  const run = async () => {
    try {
      const session = await client.auth.getUser()
      const user = session.data?.user?.id
      if (session.error || !user || teacherId && teacherId !== user || entry.teacherId && entry.teacherId !== user) throw new Error('Your upload session changed. Sign in with the original teacher account.')
      entry.teacherId = user
      if (!entry.payload) entry.payload = preparePayload(entry, user, metadata)
      if (entry.payload.teacher_id !== user || entry.payload.id !== entry.id) throw new Error('Upload identity mismatch.')
      entry.error = ''
      entry.state = 'checking'
      onUpdate?.(entry)
      const existing = await existingRecord(client, entry)
      if (existing) {
        entry.record = existing
        entry.state = 'saved'
        onUpdate?.(entry)
        return existing
      }
      entry.state = 'uploading'
      onUpdate?.(entry)
      await uploadEntry(client, entry, onUpdate)
      entry.payload.file_path = entry.path
      entry.state = 'saving'
      onUpdate?.(entry)
      let inserted
      try {
        inserted = await client.from('materials').insert(entry.payload).select(SELECT).single()
      } catch {
        inserted = { error: { message: 'Connection interrupted' } }
      }
      if (!inserted.error && matches(inserted.data, entry.payload)) {
        entry.record = inserted.data
        entry.state = 'saved'
        onUpdate?.(entry)
        return inserted.data
      }
      const confirmed = await existingRecord(client, entry)
      if (confirmed) {
        entry.record = confirmed
        entry.state = 'saved'
        onUpdate?.(entry)
        return confirmed
      }
      throw new Error(inserted.error?.message || 'The material save was not confirmed. Retry this item.')
    } catch (error) {
      entry.state = entry.uploadConfirmed ? 'save_failed' : entry.uploadAttemptPath ? 'upload_uncertain' : 'failed'
      entry.error = error.message || 'This item could not be saved.'
      onUpdate?.(entry)
      throw error
    }
  }
  entry.inFlight = run()
  try {
    return await entry.inFlight
  } finally {
    entry.inFlight = null
  }
}

export function materialUploadRecovery(entries) {
  return entries.filter(e => e.state !== 'saved' && e.uploadAttemptPath && e.payload).map(e => ({
    id: e.id,
    fileName: e.fileName,
    fileSize: e.fileSize,
    fileHash: e.fileHash,
    title: e.title,
    teacherId: e.teacherId,
    payload: e.payload,
    path: e.path,
    uploadAttemptPath: e.uploadAttemptPath,
    uploadConfirmed: e.uploadConfirmed,
    state: e.state,
    error: e.error
  }))
}

export function restoreMaterialUploads(records, teacherId) {
  if (!Array.isArray(records)) return []
  return records.filter(e => UUID.test(e?.id) && e.teacherId === teacherId && e.payload?.id === e.id && e.payload?.teacher_id === teacherId &&
    typeof e.uploadAttemptPath === 'string' && e.uploadAttemptPath.startsWith(teacherId + '/') && (!e.path || e.path === e.uploadAttemptPath) &&
    /^[a-f0-9]{64}$/.test(e.fileHash || '')).map(e => ({ ...e, file: null, record: null, inFlight: null, state: e.uploadConfirmed ? 'save_failed' : 'upload_uncertain' }))
}

export async function attachMaterialRetryFile(entry, file) {
  validateFile(file)
  if (file.name !== entry.fileName || file.size !== entry.fileSize || entry.fileHash && await digest(file) !== entry.fileHash) throw new Error('Choose the same original file to resume this item.')
  entry.file = file
  entry.error = ''
}

function fileBadgeMeta(filePath = '') {
  const ext = String(filePath || '').split('.').pop().toLowerCase()
  if (ext === 'pdf') return { label: 'PDF', theme: 'coral' }
  if (['doc', 'docx'].includes(ext)) return { label: 'DOCX', theme: 'indigo' }
  if (['ppt', 'pptx'].includes(ext)) return { label: 'PPTX', theme: 'gold' }
  if (['xls', 'xlsx'].includes(ext)) return { label: 'XLSX', theme: 'teal' }
  if (['mp3', 'wav', 'ogg', 'mp4'].includes(ext)) return { label: ext.toUpperCase(), theme: 'violet' }
  if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) return { label: 'IMG', theme: 'teal' }
  return { label: 'DOC', theme: 'indigo' }
}

export async function mountMaterialsStudio(panel, client) {
  const initial = panel.firstChild
  const auth = await client.auth.getUser()
  if (panel.firstChild !== initial) return
  const teacherId = auth.data?.user?.id
  if (auth.error || !teacherId) {
    panel.innerHTML = '<p role="alert">Sign in to manage materials.</p>'
    return
  }
  const studentsResult = await client.from('profiles').select('id,name,language,level').order('name').limit(1000)
  if (panel.firstChild !== initial) return
  if (studentsResult.error) {
    panel.innerHTML = '<p role="alert">Authorized students could not be loaded.</p>'
    return
  }
  const students = studentsResult.data || []
  const studentNames = new Map(students.map(s => [s.id, s.name]))
  const recoveryKey = 'vera-orbis-material-upload:' + teacherId
  let storage = null, entries = [], running = false, library = []
  try {
    storage = globalThis.sessionStorage
    entries = restoreMaterialUploads(JSON.parse(storage?.getItem(recoveryKey) || '[]'), teacherId)
  } catch {
    storage = null
  }

  panel.innerHTML = `<div class="materials-studio" data-materials-studio>
    <div class="vo-materials-studio-top-grid">
      <section class="teacher-form-card vo-materials-upload-card">
        <div class="vo-studio-header-bar">
          <div>
            <span class="teacher-label">BATCH UPLOAD STUDIO</span>
            <h3>Materials Studio</h3>
          </div>
          <span class="vo-pedagogy-pill">Private 10 MB Storage</span>
        </div>
        <p>Share practical resources for Listen -> Repeat -> Personalize -> Use.</p>
        <form data-material-batch>
          <div class="vo-form-grid-2">
            <label>Find student<input type="search" data-material-student-search placeholder="Search name or language"></label>
            <label>Recipient<select name="studentId" required><option value="">Choose a recipient</option><option value="all">All approved students</option>${students.map(s => `<option value="${esc(s.id)}" data-search="${esc((s.name + ' ' + (s.language || '')).toLowerCase())}">${esc(s.name)} - ${esc(s.language)}</option>`).join('')}</select></label>
          </div>
          <div class="materials-studio-fields">
            <label>Language<input name="language" maxlength="80" placeholder="e.g. English, French, Mandarin"></label>
            <label>Level<input name="level" maxlength="40" placeholder="e.g. B1 / HSK 2"></label>
            <label>Type<select name="type"><option value="resource">Resource</option><option value="class">Class</option><option value="practice">Practice</option><option value="vocabulary">Vocabulary</option></select></label>
          </div>
          <label>Description or practice instructions<textarea name="description" maxlength="3000" rows="2" placeholder="How should the student use this resource?"></textarea></label>
          <div data-material-drop role="group" aria-label="Add materials by dropping files or choosing files" tabindex="0" class="materials-studio-drop">
            <div class="vo-dropzone-badges">
              <span class="vo-format-chip is-coral">PDF</span>
              <span class="vo-format-chip is-indigo">DOCX</span>
              <span class="vo-format-chip is-gold">PPTX</span>
              <span class="vo-format-chip is-teal">XLSX</span>
              <span class="vo-format-chip is-violet">AUDIO / VIDEO</span>
            </div>
            <p class="vo-dropzone-title">Drop files here, or choose files below.</p>
            <label class="vo-file-picker-btn">Choose files<input type="file" multiple accept="${ACCEPT}" data-material-files></label>
            <p class="vo-dropzone-sub">PDF, Word, PowerPoint, Excel, JPG, PNG, WebP, MP3, WAV, OGG or MP4. Each file up to 10 MB. Up to 20 files per batch.</p>
          </div>
          <div class="vo-studio-step-footer">
            <button type="submit" class="teacher-primary-button" data-material-save>Upload and save batch</button>
          </div>
          <p data-material-status class="vo-studio-status-banner" role="status" aria-live="polite"></p>
        </form>
      </section>

      <section class="teacher-form-card vo-materials-queue-card">
        <div class="vo-studio-sidebar-head">
          <div>
            <span class="teacher-label">ACTIVE TRANSFER QUEUE</span>
            <h3>Upload queue</h3>
          </div>
          <button type="button" class="teacher-secondary-button" data-material-clear>Clear saved items</button>
        </div>
        <p>Retries keep the original title and recipient. Private uploaded files are retained until their saved status is confirmed.</p>
        <div data-material-queue class="vo-material-queue-stack"></div>
      </section>
    </div>

    <section class="teacher-form-card vo-materials-library-deck">
      <div class="vo-library-toolbar">
        <div>
          <span class="teacher-label">ACADEMIC DOCUMENT REPOSITORY</span>
          <h3>Saved materials</h3>
        </div>
        <div class="vo-library-controls">
          <label>Search saved materials<input type="search" data-material-search placeholder="Filter by title, language, level or student..."></label>
          <button type="button" class="teacher-secondary-button" data-material-refresh>Refresh library</button>
        </div>
      </div>
      <div data-material-library class="vo-materials-library-grid"></div>
    </section>
  </div>`

  const workspace = panel.querySelector('[data-materials-studio]')
  const form = workspace.querySelector('form')
  const status = message => { workspace.querySelector('[data-material-status]').textContent = message }
  function persist() {
    try { storage?.setItem(recoveryKey, JSON.stringify(materialUploadRecovery(entries))) } catch { /* Queue remains available in memory. */ }
  }
  const labels = {
    queued: 'Ready',
    checking: 'Checking saved status',
    uploading: 'Uploading private file',
    saving: 'Saving material',
    saved: 'Saved',
    save_failed: 'Save needs retry',
    upload_uncertain: 'Upload needs verification',
    failed: 'Not saved'
  }

  function renderQueue() {
    persist()
    workspace.querySelector('[data-material-clear]').disabled = running || !entries.some(e => e.state === 'saved')
    workspace.querySelector('[data-material-queue]').innerHTML = entries.map(e => {
      const badge = fileBadgeMeta(e.fileName)
      return `<article data-material-entry="${esc(e.id)}" class="materials-studio-item vo-queue-card">
        <div class="vo-queue-card-top">
          <span class="vo-format-chip is-${badge.theme}">${esc(badge.label)}</span>
          <p><strong>${esc(e.fileName)}</strong> - ${Math.ceil(e.fileSize / 1024)} KB - <span class="teacher-badge ${e.state === 'saved' ? 'badge-published' : 'badge-draft'}" role="status">${esc(labels[e.state] || e.state)}</span></p>
        </div>
        <label>Material title<input data-material-title maxlength="160" value="${esc(e.title)}" ${e.payload || running ? 'disabled' : ''}></label>
        ${e.payload ? `<p class="vo-queue-recipient">Recipient: ${esc(e.payload.audience === 'all' ? 'All approved students' : studentNames.get(e.payload.student_id) || 'Selected student')}</p>` : ''}
        ${e.error ? `<p role="alert">${esc(e.error)}</p>` : ''}
        <div class="teacher-inline-actions">
          ${e.state !== 'saved' ? `<button type="button" class="teacher-secondary-button" data-material-retry ${running ? 'disabled' : ''}>Retry this item</button>` : ''}
          ${!e.file && !e.uploadConfirmed ? `<label>Re-select original file<input type="file" accept="${ACCEPT}" data-material-resume ${running ? 'disabled' : ''}></label>` : ''}
          ${!e.uploadAttemptPath ? `<button type="button" class="teacher-danger-button" data-material-remove ${running ? 'disabled' : ''}>Remove from queue</button>` : ''}
        </div>
      </article>`
    }).join('') || '<p class="teacher-muted">No files queued. Drop PDF, DOCX, PPTX or XLSX files in the upload zone to begin.</p>'

    workspace.querySelectorAll('[data-material-entry]').forEach(row => {
      const entry = entries.find(e => e.id === row.dataset.materialEntry)
      row.querySelector('[data-material-title]').oninput = event => { entry.title = event.target.value }
      row.querySelector('[data-material-remove]')?.addEventListener('click', () => { entries = entries.filter(e => e !== entry); renderQueue() })
      row.querySelector('[data-material-retry]')?.addEventListener('click', () => run([entry]))
      row.querySelector('[data-material-resume]')?.addEventListener('change', async event => {
        try {
          await attachMaterialRetryFile(entry, event.target.files[0])
          renderQueue()
          status('Original file attached. Retry this item.')
        } catch (error) {
          status(error.message)
        }
      })
    })
  }

  function metadata() {
    return {
      studentId: form.elements.studentId.value === 'all' ? null : form.elements.studentId.value,
      type: form.elements.type.value,
      description: form.elements.description.value,
      language: form.elements.language.value,
      level: form.elements.level.value
    }
  }

  async function run(items) {
    if (running) return
    if (items.some(e => !e.payload) && !form.elements.studentId.value) {
      status('Choose a recipient before saving.')
      form.elements.studentId.focus()
      return
    }
    running = true
    const details = metadata()
    form.querySelectorAll('input,textarea,select,button').forEach(c => { c.disabled = true })
    renderQueue()
    let saved = 0, failed = 0
    for (const entry of items.filter(e => e.state !== 'saved')) {
      try {
        await saveMaterialUploadEntry(client, entry, details, { teacherId, onUpdate: renderQueue })
        saved++
      } catch {
        failed++
      }
    }
    running = false
    form.querySelectorAll('input,textarea,select,button').forEach(c => { c.disabled = false })
    renderQueue()
    status(saved + ' material(s) confirmed saved.' + (failed ? ' ' + failed + ' item(s) need attention.' : ''))
    await refreshLibrary()
  }

  function addFiles(files) {
    const errors = []
    for (const file of Array.from(files || [])) {
      if (entries.filter(e => e.state !== 'saved').length >= 20) {
        errors.push('The queue has reached 20 unsaved files.')
        break
      }
      try {
        entries.push(createMaterialUploadEntry(file))
      } catch (e) {
        errors.push(file.name + ': ' + e.message)
      }
    }
    renderQueue()
    status(errors.join(' ') || 'Files added. Review the titles and choose a recipient.')
  }

  const picker = workspace.querySelector('[data-material-files]')
  const drop = workspace.querySelector('[data-material-drop]')
  picker.onchange = () => { addFiles(picker.files); picker.value = '' }
  drop.ondragover = event => { event.preventDefault(); if (event.dataTransfer) event.dataTransfer.dropEffect = running ? 'none' : 'copy' }
  drop.ondrop = event => { event.preventDefault(); if (!running) addFiles(event.dataTransfer?.files) }
  drop.onkeydown = event => { if (event.target === drop && ['Enter', ' '].includes(event.key)) { event.preventDefault(); if (!running) picker.click() } }
  workspace.querySelector('[data-material-student-search]').oninput = event => {
    for (const option of form.elements.studentId.options) if (option.dataset.search) option.hidden = !option.dataset.search.includes(event.target.value.toLowerCase())
  }
  form.onsubmit = event => { event.preventDefault(); run(entries) }
  workspace.querySelector('[data-material-clear]').onclick = () => { entries = entries.filter(e => e.state !== 'saved'); renderQueue() }

  function renderLibrary() {
    const term = workspace.querySelector('[data-material-search]').value.toLowerCase()
    const visible = library.filter(m => [m.title, m.language, m.level, studentNames.get(m.student_id)].join(' ').toLowerCase().includes(term))
    workspace.querySelector('[data-material-library]').innerHTML = visible.map(m => {
      const badge = fileBadgeMeta(m.file_path)
      return `<article class="materials-studio-item vo-library-doc-card">
        <div class="vo-library-doc-top">
          <span class="vo-format-chip is-${badge.theme}">${esc(badge.label)}</span>
          <span class="teacher-badge ${m.audience === 'all' ? 'badge-global' : 'badge-individual'}">${esc(m.audience === 'all' ? 'All approved students' : studentNames.get(m.student_id) || 'Selected student')}</span>
        </div>
        <h4>${esc(m.title)}</h4>
        <p class="vo-library-doc-meta">${esc(m.language || 'General')} ${esc(m.level || '')} · ${esc((m.type || 'resource').toUpperCase())}</p>
        ${m.description ? `<p class="vo-library-doc-desc">${esc(m.description)}</p>` : ''}
        ${m.file_path ? `<div class="vo-library-doc-actions"><button type="button" class="teacher-primary-button" data-material-download="${esc(m.id)}">Prepare private download</button><span data-material-download-status="${esc(m.id)}" role="status"></span></div>` : ''}
      </article>`
    }).join('') || '<p class="teacher-muted">No matching saved materials.</p>'

    workspace.querySelectorAll('[data-material-download]').forEach(button => button.onclick = async () => {
      button.disabled = true
      const material = library.find(m => m.id === button.dataset.materialDownload)
      const message = workspace.querySelector('[data-material-download-status="' + material.id + '"]')
      try {
        const result = await client.storage.from('materials').createSignedUrl(material.file_path, 300)
        if (result.error || !/^https:\/\//i.test(result.data?.signedUrl || '')) throw new Error('The private download could not be prepared.')
        const link = document.createElement('a')
        link.href = result.data.signedUrl
        link.target = '_blank'
        link.rel = 'noopener noreferrer'
        link.textContent = 'Open file'
        message.replaceChildren(link)
      } catch (e) {
        message.textContent = e.message
      } finally {
        button.disabled = false
      }
    })
  }

  async function refreshLibrary() {
    const result = await client.from('materials').select('id,title,student_id,audience,description,language,level,type,file_path,created_at').order('created_at', { ascending: false }).limit(100)
    if (result.error) {
      workspace.querySelector('[data-material-library]').textContent = 'The materials library could not be loaded.'
      return
    }
    library = result.data || []
    renderLibrary()
  }

  workspace.querySelector('[data-material-search]').oninput = renderLibrary
  workspace.querySelector('[data-material-refresh]').onclick = refreshLibrary
  renderQueue()
  await refreshLibrary()
}

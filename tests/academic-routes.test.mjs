import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import * as routes from '../src/lib/academicRoutes.js'

const studentId = '11111111-1111-4111-8111-111111111111'
function browserAt(path) {
  const listeners = new Map()
  const entries = [new URL(path, 'https://preview.example.test')]
  let position = 0
  const browser = {
    pushes: [], listeners,
    get location() { return entries[position] },
    addEventListener(type, callback) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(callback) },
    removeEventListener(type, callback) { listeners.get(type)?.delete(callback) },
    emit(type) { for (const callback of listeners.get(type) || []) callback({ type }) },
    scrollTo() {}, matchMedia: () => ({ matches: true }),
    history: {
      pushState(_state, _title, path) {
        browser.pushes.push(path)
        entries.splice(position + 1)
        entries.push(new URL(path, entries[position])); position++
      },
      back() { if (position) { position--; browser.emit('popstate'); browser.emit('hashchange') } },
      forward() { if (position + 1 < entries.length) { position++; browser.emit('popstate'); browser.emit('hashchange') } }
    }
  }
  return browser
}
function node(dataset = {}) {
  const classes = new Set()
  return {
    dataset, innerHTML: '', textContent: '', attributes: {}, style: {},
    classList: {
      contains: value => classes.has(value),
      add: value => classes.add(value), remove: value => classes.delete(value),
      toggle(value, enabled) { if (enabled) classes.add(value); else classes.delete(value) }
    },
    setAttribute(name, value) { this.attributes[name] = value },
    removeAttribute(name) { delete this.attributes[name] },
    querySelector: () => null, querySelectorAll: () => [], addEventListener() {}
  }
}
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve() }

// Execute the actual page functions with injected local dependencies. Imports and
// automatic bootstrap are removed so these tests never load credentials or clients.
function pageContext(file, browser, document, dependencies = {}, buildEnvironment = {}) {
  let source = readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8')
    .replace(/^import\s+(?:['"][^'"]+['"]|[\s\S]*?\sfrom\s+['"][^'"]+['"])\s*\r?\n/gm, '')
    .replace(/^export /gm, '')
    .replaceAll('import.meta.env', `(${JSON.stringify(buildEnvironment)})`)
  if (file === 'platform-main.js') source = source.slice(0, source.lastIndexOf('\nsetupGlobalPlatformFunctions()'))
  if (file === 'teacher-main.js') source = source.slice(0, source.lastIndexOf('\nloadTeacherDashboard()'))
  const context = vm.createContext({
    window: browser, history: browser.history, document, URL, URLSearchParams, console,
    ...routes,
    readTeacherRoute: () => routes.readTeacherRoute(browser.location),
    readStudentRoute: () => routes.readStudentRoute(browser.location),
    writeTeacherModuleRoute: module => routes.writeTeacherModuleRoute(module, browser),
    writeStudentRoute: view => routes.writeStudentRoute(view, browser),
    watchAcademicLocation: callback => routes.watchAcademicLocation(callback, browser),
    ...dependencies
  })
  vm.runInContext(source, context, { filename: file })
  return context
}

test('teacher and student route names are explicitly allowlisted, with safe unknown defaults', () => {
  for (const module of routes.TEACHER_MODULE_IDS) {
    assert.equal(routes.readTeacherRoute(new URL(`https://preview.example.test/teacher.html?module=${module}`)).module, module)
  }
  for (const view of routes.STUDENT_VIEW_IDS) assert.equal(routes.readStudentRoute({ hash: `#${view}` }), view)
  for (const value of ['__proto__', 'constructor', 'https://evil.example', 'finals/../../admin', '', 'FINALs']) {
    assert.equal(routes.readTeacherRoute({ search: `?module=${encodeURIComponent(value)}` }).module, 'overview')
    assert.equal(routes.readStudentRoute({ hash: `#${value}` }), 'home')
  }
  assert.equal(routes.readStudentRoute({ hash: '#%66inals' }), 'home')
})

test('teacher profile UUID fragments survive module parsing while malformed identifiers select no profile', () => {
  assert.deepEqual(routes.readTeacherRoute({ search: '?module=finals', hash: `#student-${studentId}` }), { module: 'finals', studentId })
  for (const hash of ['#dashboard', '#student-undefined', '#student-../users', `#student-${studentId}-extra`]) {
    assert.equal(routes.readTeacherRoute({ hash }).studentId, null)
  }
})

test('history writes stay on this origin, preserve unrelated query options, and reject unknown routes', () => {
  const browser = browserAt(`/teacher.html?review=founder#student-${studentId}`)
  assert.equal(routes.writeTeacherModuleRoute('exercise-studio', browser), true)
  assert.equal(browser.location.pathname + browser.location.search + browser.location.hash, '/teacher.html?review=founder&module=exercise-studio')
  assert.equal(routes.writeTeacherModuleRoute('exercise-studio', browser), false)
  assert.equal(routes.writeTeacherModuleRoute('https://evil.example', browser), false)
  assert.equal(browser.pushes.length, 1)
  const student = browserAt('/platform.html?from=onboarding')
  assert.equal(routes.writeStudentRoute('finals', student), true)
  assert.equal(student.pushes[0], '/platform.html?from=onboarding#finals')
  assert.equal(routes.writeStudentRoute('constructor', student), false)
  student.history.pushState = () => { throw new Error('Restricted browser history') }
  assert.equal(routes.writeStudentRoute('calendar', student), false)
})

test('location observers install explicitly and unsubscribe both browser history event types', () => {
  const browser = browserAt('/platform.html#finals')
  const seen = []
  browser.emit('popstate')
  const stop = routes.watchAcademicLocation(() => seen.push(routes.readStudentRoute(browser.location)), browser)
  browser.emit('popstate'); browser.emit('hashchange'); stop(); browser.emit('popstate')
  assert.deepEqual(seen, ['finals', 'finals'])
})

test('actual teacher workspace opens the requested module, synchronizes tabs, and writes user navigation', async () => {
  const browser = browserAt('/teacher.html?module=finals')
  const calls = []
  const buttons = routes.TEACHER_MODULE_IDS.map(module => node({ teacherModule: module }))
  const nav = node()
  let click
  nav.addEventListener = (_type, callback) => { click = callback }
  nav.querySelectorAll = () => buttons
  const panel = node(), workspace = node()
  workspace.querySelector = () => panel
  const document = { querySelector: selector => selector === '.teacher-module-nav' ? nav : selector === '#teacher-workspace-panel' ? workspace : null }
  const context = pageContext('components/teacherWorkspace.js', browser, document, {
    mountFinalsStudio: async () => calls.push('finals'),
    mountMaterialsStudio: async () => calls.push('materials-studio'), supabase: {}
  })
  context.setupTeacherWorkspace()
  await flush()
  assert.deepEqual(calls, ['finals'])
  assert.equal(browser.pushes.length, 0, 'opening a bookmark does not create another history entry')
  assert.equal(buttons.find(item => item.dataset.teacherModule === 'finals').attributes['aria-pressed'], 'true')
  const target = buttons.find(item => item.dataset.teacherModule === 'materials-studio')
  click({ target: { closest: () => target } })
  await flush()
  assert.deepEqual(calls, ['finals', 'materials-studio'])
  assert.equal(browser.location.search, '?module=materials-studio')
  assert.equal(target.attributes['aria-pressed'], 'true')
  assert.equal(buttons.find(item => item.dataset.teacherModule === 'finals').attributes['aria-pressed'], 'false')
})

test('teacher profile bookmarks skip module fetching until their existing profile handler opens', () => {
  const browser = browserAt(`/teacher.html?module=finals#student-${studentId}`)
  const nav = node()
  const context = pageContext('components/teacherWorkspace.js', browser, { querySelector: () => nav })
  context.loadTeacherModule = () => { throw new Error('Profile bookmark must not fetch a module') }
  assert.doesNotThrow(() => context.setupTeacherWorkspace())
})

test('teacher route handlers are installed only after enrollment authorization and restore modules/profiles on history', async () => {
  const browser = browserAt('/teacher.html?module=finals')
  const app = node(), button = node({ teacherModule: 'finals' })
  const document = { querySelector: selector => selector === '#app' ? app : selector === '.teacher-module-nav .is-active' ? button : null }
  const calls = []
  let allowed = false
  const context = pageContext('teacher-main.js', browser, document, {
    getCurrentUser: async () => ({ id: 'teacher' }),
    readEnrollmentAccess: async () => ({ student_id: 'teacher', academic_access: allowed, role: 'teacher' }),
    renderEnrollmentGate: () => calls.push('gate'),
    supabase: { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: 'teacher' } }) }) }) }) },
    hasTeacherAccess: () => true,
    setupTeacherWorkspace: () => calls.push('workspace'), setupEnrollmentPanel() {},
    loadTeacherModule: (module, options) => { calls.push(module); button.dataset.teacherModule = module; assert.equal(options.updateHistory, false) }
  })
  vm.runInContext("renderMainDashboardContent = () => ''; loadStudents = () => {}; openStudentProfile = id => { activeStudentProfileId = id; profileCalls.push(id) }; returnToTeacherDashboard = () => { activeStudentProfileId = null; profileCalls.push('dashboard') }", Object.assign(context, { profileCalls: [] }))
  await context.loadTeacherDashboard()
  assert.deepEqual(calls, ['gate'])
  assert.equal(browser.listeners.size, 0)
  allowed = true
  await context.loadTeacherDashboard()
  assert.deepEqual(calls, ['gate', 'workspace'])
  routes.writeTeacherModuleRoute('calendar', browser); button.dataset.teacherModule = 'calendar'
  browser.history.back(); await flush()
  assert.equal(calls.at(-1), 'finals')
  browser.history.forward(); await flush()
  assert.equal(calls.at(-1), 'calendar')
  browser.history.pushState(null, '', `#student-${studentId}`); browser.emit('hashchange'); await flush()
  assert.deepEqual(context.profileCalls, [studentId])
  browser.history.back(); await flush()
  assert.deepEqual(context.profileCalls, [studentId, 'dashboard'])
})

function studentPage(path = '/platform.html#finals') {
  const browser = browserAt(path)
  const nodes = Object.fromEntries(['#platform-home', '#platform-internal-view', '#platform-view-content', '#platform-view-kicker', '.platform-nav'].map(selector => [selector, node()]))
  const links = routes.STUDENT_VIEW_IDS.map(view => node({ platformView: view }))
  const document = {
    querySelector: selector => nodes[selector] || null,
    querySelectorAll: selector => selector === '.platform-nav [data-platform-view]' ? links : []
  }
  const context = pageContext('platform-main.js', browser, document, { supabase: {}, setupInboxHandlers() {} })
  Object.assign(context, { refreshes: [], renders: [] })
  vm.runInContext(`
    refreshStudentView = async view => refreshes.push(view);
    renderPlatformView = view => { renders.push(view); return 'view:' + view };
    setupStudentAcademicView = () => {}; setupExerciseForms = () => {}; setupAcademicAIConsent = () => {};
    refreshNotificationBadge = () => {}; initializeDynamicPlatform = () => {};
  `, context)
  return { browser, nodes, links, context }
}

test('student fragments cannot load data or install handlers before the authorized platform is ready', async () => {
  const { context, browser } = studentPage()
  await context.setupPlatformRoutes()
  await context.openPlatformView('finals')
  assert.deepEqual(context.refreshes, [])
  assert.deepEqual(context.renders, [])
  assert.equal(browser.listeners.size, 0)
})

test('actual student navigation opens bookmarked views and restores browser back/forward without duplicate renders', async () => {
  const { context, browser, nodes, links } = studentPage()
  vm.runInContext("platformLoaded = true; currentStudent = { id: 'student' }", context)
  await context.setupPlatformRoutes()
  assert.equal(nodes['#platform-view-content'].innerHTML, 'view:finals')
  assert.equal(browser.pushes.length, 0)
  await context.openPlatformView('inbox')
  assert.equal(browser.location.hash, '#inbox')
  assert.equal(links.find(link => link.dataset.platformView === 'inbox').attributes['aria-current'], 'page')
  browser.history.back(); await flush()
  assert.equal(nodes['#platform-view-content'].innerHTML, 'view:finals')
  browser.history.forward(); await flush()
  assert.equal(nodes['#platform-view-content'].innerHTML, 'view:inbox')
  assert.deepEqual(context.renders, ['finals', 'inbox', 'finals', 'inbox'])
  context.closePlatformView()
  assert.equal(browser.location.hash, '#home')
  assert.equal(nodes['#platform-home'].attributes['aria-hidden'], 'false')
  assert.equal(nodes['#platform-internal-view'].attributes['aria-hidden'], 'true')
})

test('back navigation wins over an older student view refresh still in flight', async () => {
  const { context, nodes } = studentPage('/platform.html#home')
  let finish
  const pending = new Promise(resolve => { finish = resolve })
  Object.assign(context, { pending })
  vm.runInContext("platformLoaded = true; currentStudent = { id: 'student' }; refreshStudentView = view => view === 'finals' ? pending : Promise.resolve()", context)
  const opening = context.openPlatformView('finals')
  await context.openPlatformView('calendar')
  finish(); await opening
  assert.equal(nodes['#platform-view-content'].innerHTML, 'view:calendar')
  assert.deepEqual(context.renders, ['calendar'])
})

test('actual enrollment gate rejects a student bookmark before any academic query or route observer', async () => {
  const { context, browser } = studentPage()
  const calls = []
  Object.assign(context, {
    getCurrentUser: async () => ({ id: 'student' }),
    readEnrollmentAccess: async () => ({ student_id: 'student', academic_access: false }),
    renderEnrollmentGate: () => calls.push('gate'),
    supabase: { from: () => { throw new Error('Academic query before enrollment approval') } }
  })
  await context.loadPlatform()
  assert.deepEqual(calls, ['gate'])
  assert.deepEqual(context.refreshes, [])
  assert.equal(browser.listeners.size, 0)
})

test('a student profile response cannot replace the teacher dashboard after navigating back', async () => {
  const browser = browserAt(`/teacher.html?module=materials-studio#student-${studentId}`)
  const main = node()
  let finish
  const pending = new Promise(resolve => { finish = resolve })
  const query = {
    select() { return this }, eq() { return this }, or() { return this },
    order() { return this }, limit() { return this }, maybeSingle() { return this },
    then(resolve, reject) { return pending.then(resolve, reject) }
  }
  const context = pageContext('teacher-main.js', browser, { querySelector: selector => selector === '#teacher-main-container' ? main : null }, {
    supabase: { from: () => query }, setupTeacherWorkspace() {}, setupEnrollmentPanel() {}
  })
  vm.runInContext("renderMainDashboardContent = () => 'dashboard'; loadStudents = () => {}; renderStudentProfile = () => { throw new Error('Stale profile rendered') }; renderStudentProfileError = () => { throw new Error('Stale profile error rendered') }", context)
  const opening = context.openStudentProfile(studentId)
  context.returnToTeacherDashboard()
  finish({ data: null, error: null })
  await opening
  assert.equal(main.innerHTML, 'dashboard')
  assert.equal(browser.location.hash, '#dashboard')
  assert.equal(browser.location.search, '?module=materials-studio')
})

test('staging Voice ignores browser overrides, rejects the production service, and has no implicit backend', () => {
  const browser = browserAt('/platform.html')
  Object.defineProperty(browser, '__VERA_VOICE_URL__', { get() { throw new Error('Staging must not inspect browser Voice overrides') } })
  Object.defineProperty(browser, 'localStorage', { get() { throw new Error('Staging must not inspect localStorage Voice overrides') } })
  const context = pageContext('platform-main.js', browser, {}, {}, { MODE: 'staging' })
  assert.equal(context.getEffectiveVeraVoiceUrl(), '')
  assert.equal(context.isVeraVoiceConfiguredForEnv('https://vera-orbis.onrender.com'), false)
  for (const url of ['https://vera-orbis.onrender.com/', 'http://localhost:3000/', 'https://127.0.0.1/']) {
    const configured = pageContext('platform-main.js', browser, {}, {}, { MODE: 'staging', VITE_VERA_VOICE_URL: url })
    assert.equal(configured.getEffectiveVeraVoiceUrl(), '')
  }
  const isolated = pageContext('platform-main.js', browser, {}, {}, { MODE: 'staging', VITE_VERA_VOICE_URL: 'https://voice-staging.example.test/' })
  assert.equal(isolated.getEffectiveVeraVoiceUrl(), 'https://voice-staging.example.test/')
})

test('disabled staging Voice shows a useful message without opening a popup, iframe service, or Auth session', async () => {
  const browser = browserAt('/platform.html')
  browser.open = () => { throw new Error('Staging Voice must not open a popup') }
  const elements = Object.fromEntries(['#vera-voice-modal', '#vera-voice-frame', '#vera-voice-notice', '#vera-voice-loader', '#vera-voice-external-link'].map(selector => [selector, node()]))
  const status = node(), trigger = node(), card = node()
  card.querySelector = () => status
  trigger.closest = () => card
  const handlers = {}
  const document = {
    body: node(), querySelector: selector => elements[selector] || null,
    addEventListener: (type, callback) => { handlers[type] = callback }
  }
  const context = pageContext('platform-main.js', browser, document, {
    supabase: { auth: { getSession: () => { throw new Error('Disabled Voice must not read Auth') } } }
  }, { MODE: 'staging' })
  context.setupPlatformNavigation()
  let prevented = false
  handlers.click({
    target: { closest: selector => selector === '[data-vera-voice-link]' ? trigger : null },
    preventDefault() { prevented = true }, stopPropagation() {}
  })
  await flush()
  assert.equal(prevented, true, 'the existing link cannot follow its production href')
  assert.equal(elements['#vera-voice-frame'].src, 'about:blank')
  assert.equal(elements['#vera-voice-frame'].hidden, true)
  assert.match(status.textContent, /disabled in this staging preview/)
  assert.match(elements['#vera-voice-notice'].textContent, /separate staging service/)
  assert.equal(elements['#vera-voice-external-link'].style.display, 'none')
  assert.equal(trigger.attributes['aria-disabled'], 'true')
  assert.equal(browser.listeners.get('message')?.size || 0, 0)
})

test('production Voice retains its existing HTTPS fallback and browser override behavior', () => {
  const browser = browserAt('/platform.html')
  const context = pageContext('platform-main.js', browser, {}, {}, { MODE: 'production' })
  assert.equal(context.getEffectiveVeraVoiceUrl(), 'https://vera-orbis.onrender.com/')
  browser.__VERA_VOICE_URL__ = 'https://custom-voice.example.test/'
  assert.equal(context.getEffectiveVeraVoiceUrl(), 'https://custom-voice.example.test/')
})

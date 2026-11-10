// Route names select existing views only. Authorization remains with each page.
export const TEACHER_MODULE_IDS = Object.freeze([
  'overview', 'calendar', 'students', 'academic', 'materials-studio', 'exercise-studio', 'learning-plans',
  'challenges', 'finals', 'notifications', 'academic-ai', 'finance',
  'leads', 'culture', 'inbox'
])

export const STUDENT_VIEW_IDS = Object.freeze([
  'home', 'journey', 'materials', 'feedback', 'challenges', 'exercises',
  'notifications', 'inbox', 'learning-plans', 'finals', 'progress', 'calendar',
  'packages', 'culture', 'reports', 'settings'
])

const studentIdPattern = /^#student-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i
const currentBrowser = () => typeof window === 'undefined' ? null : window

export const isTeacherModule = value => TEACHER_MODULE_IDS.includes(value)
export const isStudentView = value => STUDENT_VIEW_IDS.includes(value)

export function readTeacherRoute(location = currentBrowser()?.location) {
  const requested = new URLSearchParams(location?.search || '').get('module')
  return {
    module: isTeacherModule(requested) ? requested : 'overview',
    studentId: (location?.hash || '').match(studentIdPattern)?.[1] || null
  }
}

export function readStudentRoute(location = currentBrowser()?.location) {
  const requested = (location?.hash || '').replace(/^#/, '')
  return isStudentView(requested) ? requested : 'home'
}

function writeLocation(browser, change) {
  if (!browser?.location || !browser.history?.pushState) return false
  try {
    const location = browser.location
    const next = new URL(location.href)
    change(next)
    const target = `${next.pathname}${next.search}${next.hash}`
    if (target === `${location.pathname}${location.search}${location.hash}`) return false
    // Relative destinations preserve the current origin and never navigate to a server.
    browser.history.pushState(null, '', target)
    return true
  } catch {
    // A restricted browser history must not prevent an authorized view from opening.
    return false
  }
}

export function writeTeacherModuleRoute(module, browser = currentBrowser()) {
  if (!isTeacherModule(module)) return false
  return writeLocation(browser, next => {
    next.searchParams.set('module', module)
    next.hash = ''
  })
}

export function writeStudentRoute(view, browser = currentBrowser()) {
  if (!isStudentView(view)) return false
  return writeLocation(browser, next => { next.hash = view })
}

// Install only after the page has passed its existing enrollment/role checks.
export function watchAcademicLocation(onChange, browser = currentBrowser()) {
  if (!browser?.addEventListener) return () => {}
  browser.addEventListener('popstate', onChange)
  browser.addEventListener('hashchange', onChange)
  return () => {
    browser.removeEventListener('popstate', onChange)
    browser.removeEventListener('hashchange', onChange)
  }
}

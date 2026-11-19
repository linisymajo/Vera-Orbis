import { listLearningPlanVersions } from './learningPlans.js'
const unavailable = new WeakSet()
export function journeyLessonState(lesson) {
  if (lesson.class?.completed === true || (lesson.progress?.completed === true && lesson.progress?.teacher_recorded === true)) return 'completed'
  if ((lesson.exercises || []).some(x => x.started || x.submitted)) return 'in_progress'
  return 'upcoming'
}
export function normalizeJourney(data) {
  const seen = new Set(), current = new Set()
  const plans = (data.plans || []).map(plan => ({ ...plan, lessons: (plan.lessons || []).filter(l => {
    const key = plan.course_key + ':' + l.objective_id
    if (seen.has(key)) return false
    seen.add(key); return true
  }).map(l => ({ ...l, state: journeyLessonState(l) })) }))
  for (const p of plans) for (const l of p.lessons) {
    if (!p.historical && l.state !== 'completed' && !current.has(p.course_key)) {
      current.add(p.course_key); if (l.state === 'upcoming') l.state = 'current'
    }
  }
  if (data.completed_classes?.length) plans.push({ id: 'actual-class-history', title: 'Verified past classes', course_key: 'unassociated-classes', historical: true, version: 'history', language: '', level: '', course: null,
    lessons: data.completed_classes.map((c, i) => ({ objective_id: c.id, number: i + 1, title: c.title, objective: 'Completed class with recorded attendance. Course and lesson topics require explicit teacher links.', state: 'completed', success_criteria: '', steps: [], power_expressions: [], activities: [], class: { ...c, status: 'completed', completed: true }, exercises: [], materials: [] })) })
  return { ...data, plans: plans.filter(p => p.lessons.length) }
}
export async function loadStudentJourney(client, studentId, { retry = false } = {}) {
  if (retry) unavailable.delete(client)
  if (import.meta.env?.MODE === 'production' && import.meta.env?.VITE_ACADEMIC_CONTEXT_READY !== 'true') unavailable.add(client)
  if (!unavailable.has(client)) {
    const r = await client.rpc('get_student_learning_journey', { p_student_id: studentId })
    if (!r.error && Array.isArray(r.data?.plans)) return normalizeJourney(r.data)
    if (!['PGRST202', '42883'].includes(r.error?.code)) throw Error('Your Journey could not be refreshed. Your saved work is safe.')
    unavailable.add(client)
  }
  // Compatible rollout: existing RLS still decides which approved versions the
  // student can see. Never infer attendance or exercise/lesson links from dates.
  const versions = await listLearningPlanVersions(client, studentId)
  const visible = versions.filter(v => v.status === 'approved' && (!v.content.architect || v.published_at))
  let events = []
  if (visible.length) {
    const r = await client.from('learning_plan_objective_events').select('version_id,objective_id,completed,actor_id,created_at,revision').in('version_id', visible.map(v => v.id)).order('created_at', { ascending: false }).limit(1000)
    if (r.error) throw Error('Recorded lesson completion could not be refreshed. Please try again.')
    events = r.data || []
  }
  const recorded = (v, objective) => {
    const family = new Set(); let node = v
    while (node && !family.has(node.id)) { family.add(node.id); node = visible.find(p => p.id === node.base_version_id) }
    const e = events.find(e => family.has(e.version_id) && e.objective_id === objective.id && e.actor_id === v.teacher_id)
    return e ? { completed: e.completed, teacher_recorded: true, updated_at: e.created_at } : null
  }
  const plans = visible.map(v => ({
    id: v.id, version: v.version_number, title: v.content.title, language: v.content.language, level: v.content.level,
    course_key: 'legacy', historical: false, course: null,
    lessons: v.content.objectives.map((o, i) => ({ objective_id: o.id, number: i + 1,
      title: v.content.architect?.sessions[i]?.title || o.title, objective: o.title, success_criteria: o.success_criteria, steps: o.steps,
      power_expressions: v.content.architect?.sessions[i]?.power_expressions || [], activities: v.content.architect?.sessions[i]?.activities || [],
      progress: recorded(v, o), exercises: [], materials: [] }))
  }))
  // Latest published plan plus completed historical objectives; no stale draft
  // can replace the student's visible roadmap during an edit.
  plans.forEach((p, i) => { p.historical = i > 0; if (i) p.lessons = p.lessons.filter(l => journeyLessonState(l) === 'completed') })
  return normalizeJourney({ plans, links_pending: true })
}
export async function saveJourneyBinding(client, versionId, binding, lessons) {
  const r = await client.rpc('save_learning_journey_binding', { p_version_id: versionId, p_expected_revision: binding.revision,
    p_package_assignment_id: binding.package_assignment_id || null, p_lessons: lessons })
  if (r.error || r.data?.revision !== binding.revision + 1) throw Error('Journey links were not saved. Reload the latest version before retrying.')
  return r.data
}

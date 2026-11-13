import { AcademicAIError } from './core.js'

const TARGETS = ['https://duinvkphfnugoyvvlbbq.supabase.co', 'https://iopgzmvaqobigjwibual.supabase.co']
const UUID = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i

export async function authorizeAdultArchitectTeacher(env, client, user) {
  if (!TARGETS.includes(env('SUPABASE_URL')) || env('ACADEMIC_AI_DATA_MODE') !== 'anonymous_pedagogy_v1'
    || env('ACADEMIC_AI_CLIENT_SCOPE') !== 'adult_teacher_only'
    || env('ACADEMIC_AI_ADULT_CLIENT_CONFIRMED') !== 'true') {
    throw new AcademicAIError('privacy_gate', 'The adult-only teacher client and anonymous pedagogical mode require administrator configuration.', 403)
  }
  // Administrator-maintained eligibility list, kept inside Supabase secrets.
  // User metadata, form checkboxes and the student's age cannot grant eligibility.
  const eligible = (env('ACADEMIC_AI_ADULT_TEACHER_IDS') || '').split(',').map(x => x.trim()).filter(Boolean)
  if (!user?.id || !eligible.length || eligible.length > 100 || eligible.some(x => !UUID.test(x)) || !eligible.includes(user.id)) {
    throw new AcademicAIError('adult_teacher_required', 'Generation is available only to administrator-approved adult teachers.', 403)
  }
  const [access, membership] = await Promise.all([
    client.rpc('get_my_enrollment'),
    client.from('teachers').select('id').eq('id', user.id).maybeSingle(),
  ])
  if (access.error || membership.error || membership.data?.id !== user.id
    || access.data?.student_id !== user.id || !['teacher', 'admin'].includes(access.data?.role)
    || access.data?.email_verified !== true || access.data?.academic_access !== true) {
    throw new AcademicAIError('adult_teacher_required', 'Verified teacher authorization is required for generation.', 403)
  }
}

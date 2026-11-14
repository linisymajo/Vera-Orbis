// Vera Orbis — Adult Teacher Authorization Guard
// Enforces server-side and client-side adult-only teacher validation.
// Strictly rejects students, minors, unverified accounts, and forged metadata.

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export class AdultAuthError extends Error {
  constructor(message, statusCode = 403, code = 'adult_teacher_required') {
    super(message)
    this.name = 'AdultAuthError'
    this.statusCode = statusCode
    this.code = code
  }
}

/**
 * Validates whether an authenticated user is a verified adult teacher.
 * Rejects student accounts, minors, unverified emails, and users lacking academic access.
 *
 * @param {object} client - Supabase client (scoped to user JWT)
 * @param {string[]} [eligibleAdultTeacherIds] - Optional administrator-maintained adult registry
 * @returns {Promise<{ teacherId: string, email: string, role: string, adultVerified: true }>}
 */
export async function verifyAdultTeacherAccess(client, eligibleAdultTeacherIds = null) {
  // 1. Get current authenticated user
  const { data: authData, error: authError } = await client.auth.getUser()
  if (authError || !authData?.user?.id) {
    throw new AdultAuthError('Authentication required. Sign in with your verified teacher credentials.', 401, 'unauthenticated')
  }

  const user = authData.user
  const userId = user.id

  if (!UUID_REGEX.test(userId)) {
    throw new AdultAuthError('Invalid authentication token credentials.', 401, 'invalid_credentials')
  }

  // 2. Query teachers table (RLS prevents non-teachers or students from having teacher membership)
  const { data: teacherRecord, error: teacherError } = await client
    .from('teachers')
    .select('id')
    .eq('id', userId)
    .maybeSingle()

  if (teacherError || !teacherRecord || teacherRecord.id !== userId) {
    throw new AdultAuthError('Access Denied: This portal is strictly restricted to verified teachers. Student accounts and non-instructional profiles are forbidden.', 403, 'student_or_non_teacher_rejected')
  }

  // 3. Query enrollment RPC to ensure academic access and teacher/admin role
  const { data: enrollment, error: enrollmentError } = await client.rpc('get_my_enrollment')
  if (enrollmentError || !enrollment) {
    throw new AdultAuthError('Could not verify instructor academic access.', 403, 'academic_access_unverified')
  }

  if (enrollment.student_id !== userId || !['teacher', 'admin'].includes(enrollment.role)) {
    throw new AdultAuthError('Access Denied: Instructor role required. Student credentials cannot access the AI Learning Architect.', 403, 'student_rejected')
  }

  if (enrollment.email_verified !== true) {
    throw new AdultAuthError('Instructor email address must be verified before accessing the AI Learning Architect.', 403, 'unverified_email')
  }

  if (enrollment.academic_access !== true) {
    throw new AdultAuthError('Instructor academic access has not been activated or is suspended.', 403, 'academic_access_inactive')
  }

  // 4. MANDATORY Administrator Adult Teacher Registry Check
  // An explicit non-empty registry of administrator-approved adult educator UUIDs is required.
  // If the registry is missing, empty, or the user is not explicitly registered, access is strictly denied.
  if (!Array.isArray(eligibleAdultTeacherIds) || eligibleAdultTeacherIds.length === 0) {
    throw new AdultAuthError('Access Denied: No valid adult educator eligibility registry is configured. Access denied by mandatory security policy.', 403, 'adult_registry_missing')
  }

  if (!eligibleAdultTeacherIds.includes(userId)) {
    throw new AdultAuthError('Access Denied: Instructor is not registered in the administrator-approved adult educator eligibility registry.', 403, 'adult_registry_unlisted')
  }

  return {
    teacherId: userId,
    email: user.email || '',
    role: enrollment.role,
    adultVerified: true
  }
}

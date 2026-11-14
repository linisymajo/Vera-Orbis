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
 * @param {string[]|object|null} [options] - Optional synthetic list for unit testing
 * @returns {Promise<{ teacherId: string, email: string, role: string, adultVerified: true }>}
 */
export async function verifyAdultTeacherAccess(client, options) {
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
  if (arguments.length >= 2) {
    // Explicit synthetic registry passed (unit testing or mock boundary)
    const list = Array.isArray(options) ? options : options?.eligibleAdultTeacherIds
    if (!Array.isArray(list) || list.length === 0) {
      throw new AdultAuthError('Access Denied: No valid adult educator eligibility registry is configured. Access denied by mandatory security policy.', 403, 'adult_registry_missing')
    }
    if (!list.includes(userId)) {
      throw new AdultAuthError('Access Denied: Instructor is not registered in the administrator-approved adult educator eligibility registry.', 403, 'adult_registry_unlisted')
    }
  } else {
    // Live Production Path: Server-Side Authorization Boundary
    // Executes verify_adult_teacher_eligibility() RPC on Supabase PostgreSQL backend
    const { data: serverVerification, error: rpcError } = await client.rpc('verify_adult_teacher_eligibility')
    if (rpcError) {
      const msg = rpcError.message || ''
      if (msg.includes('No valid adult educator eligibility registry')) {
        throw new AdultAuthError('Access Denied: No valid adult educator eligibility registry confirms this account.', 403, 'adult_registry_missing')
      }
      if (msg.includes('Instructor role required')) {
        throw new AdultAuthError('Access Denied: This portal is strictly restricted to verified teachers. Student accounts and non-instructional profiles are forbidden.', 403, 'student_or_non_teacher_rejected')
      }
      throw new AdultAuthError(msg || 'Server-side adult teacher verification failed.', 403, 'verification_failed')
    }
    if (!serverVerification || serverVerification.adult_verified !== true) {
      throw new AdultAuthError('Access Denied: Server-side eligibility registry did not verify this teacher.', 403, 'adult_registry_unlisted')
    }
  }

  return {
    teacherId: userId,
    email: user.email || '',
    role: enrollment.role,
    adultVerified: true
  }
}

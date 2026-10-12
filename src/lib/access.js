export function hasTeacherAccess(user, teacherRecord) {
  return Boolean(
    user?.id &&
    teacherRecord?.id &&
    user.id === teacherRecord.id
  )
}

export function hasRequiredProfileFields(profile) {
  return Boolean(profile?.id && typeof profile.id === 'string')
}

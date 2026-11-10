import { materialContentType } from './academicOperations.js'

// Storage RLS remains authoritative for teacher permissions and private downloads.
export async function uploadMaterialFile(client, file, { teacherId } = {}) {
  const contentType = materialContentType(file)
  if (!contentType || !Number.isFinite(file.size)) {
    throw new Error('Choose a nonempty supported file up to 10 MB.')
  }
  const session = await client.auth.getUser()
  const userId = session.data?.user?.id
  if (session.error || !userId) throw new Error('Your session has expired. Please log in again.')
  if (teacherId && teacherId !== userId) throw new Error('Upload identity does not match your current session.')
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-180)
  const path = `${userId}/${globalThis.crypto.randomUUID()}-${safeName}`
  const result = await client.storage.from('materials').upload(path, file, { contentType, upsert: false })
  if (result.error) throw new Error(result.error.message || 'The file could not be uploaded.')
  if (result.data?.path !== path) {
    throw new Error('Storage did not confirm the uploaded file. Refresh your materials before retrying.')
  }
  return { path }
}


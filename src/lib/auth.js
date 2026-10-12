import { supabase } from './supabase.js'


export async function getCurrentUser() {
  const {
    data: { user },
    error
  } = await supabase.auth.getUser()

  if (error) {
    console.error('Unable to read the current session.')
    return null
  }

  return user
}


export async function getStudentProfile() {

  const user = await getCurrentUser()

  if (!user) {
    return null
  }

  const {
    data,
    error
  } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (error) {
    console.error('Unable to load the student profile.')
    return null
  }

  if (!data) {
    return null
  }

  return data
}
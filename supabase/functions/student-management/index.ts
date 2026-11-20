import { createClient } from 'npm:@supabase/supabase-js@2.117.3'
import { createStudentManagementHandler } from './handler.js'
Deno.serve(createStudentManagementHandler({ env: (name: string) => Deno.env.get(name), createClient }))

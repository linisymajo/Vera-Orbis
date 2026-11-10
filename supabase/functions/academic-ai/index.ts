import { createClient } from 'npm:@supabase/supabase-js@2.117.3'
import { createAcademicAIHandler } from './handler.js'

Deno.serve(createAcademicAIHandler({ env: (name: string) => Deno.env.get(name), createClient }))

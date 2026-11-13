import { createClient } from 'npm:@supabase/supabase-js@2.117.3'
import { createAcademicAIHandler } from './handler.js'
import { GoogleGenAI } from 'npm:@google/genai@3.0.0'

Deno.serve(createAcademicAIHandler({ env: (name: string) => Deno.env.get(name), createClient, GoogleGenAI }))

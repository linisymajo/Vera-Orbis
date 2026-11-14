// Vera Orbis — Adult Teacher AI Learning Architect Server
// Standalone server with server-side adult authorization and generic pedagogical isolation.
// Rejects student accounts and unverified users with HTTP 403.
// Gated pending Google minor-accessible API Client written clarification.

import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { verifyAdultTeacherAccess, AdultAuthError } from '../src/lib/adultTeacherAuth.js'
import { generateCurriculumCourse, generateCurriculumSession } from '../src/lib/curriculumEngine.js'
import { validateArchitectRequest, validateArchitectCourse, architectCourseToPlan } from '../supabase/functions/academic-ai/learning-architect.js'
import { validateLearningPlan } from '../src/lib/learningPlans.js'
import { generalizedPedagogy } from '../supabase/functions/academic-ai/pedagogy.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT_DIR = path.resolve(__dirname, '..')

const PORT = Number(process.env.ARCHITECT_PORT || 3002)
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://iopgzmvaqobigjwibual.supabase.co'
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_hDTskzaFPX9OXUu219hDqQ_Fajz24MG'

const ADULT_TEACHER_IDS = (process.env.ACADEMIC_AI_ADULT_TEACHER_IDS || '')
  .split(',')
  .map(x => x.trim())
  .filter(Boolean)

const IS_PROVIDER_CONFIRMED = process.env.ACADEMIC_AI_ADULT_CLIENT_CONFIRMED === 'true'

function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  })
  res.end(JSON.stringify(data))
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', chunk => {
      body += chunk
      if (body.length > 1e6) {
        req.destroy()
        reject(new Error('Payload too large'))
      }
    })
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {})
      } catch (err) {
        reject(new Error('Invalid JSON payload'))
      }
    })
    req.on('error', reject)
  })
}

export function createArchitectApp() {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)

    // CORS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
      })
      res.end()
      return
    }

    try {
      // 1. Status / Health endpoint
      if (req.method === 'GET' && (url.pathname === '/health' || url.pathname === '/api/architect/status')) {
        sendJSON(res, 200, {
          ok: true,
          service: 'Vera Orbis AI Learning Architect',
          version: '3.0.0-adult',
          scope: 'adult_teacher_only',
          adult_minimum_age: 18,
          provider_terms_status: IS_PROVIDER_CONFIRMED
            ? 'live_gemini_active'
            : 'gated_pending_google_terms_confirmation',
          decoupled_export_import_enabled: true,
          supported_languages: ['English', 'French', 'Mandarin'],
          cefr_levels: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
        })
        return
      }

      // Helper to authenticate teacher token from header or body
      async function authenticateTeacher(req, body = {}) {
        const authHeader = req.headers.authorization || ''
        const token = authHeader.startsWith('Bearer ')
          ? authHeader.slice(7)
          : body.token || null

        if (!token) {
          throw new AdultAuthError('Authorization token required.', 401, 'unauthenticated')
        }

        const scopedClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
          auth: { persistSession: false, autoRefreshToken: false },
          global: { headers: { Authorization: `Bearer ${token}` } }
        })

        return verifyAdultTeacherAccess(scopedClient, ADULT_TEACHER_IDS.length ? ADULT_TEACHER_IDS : null)
      }

      // 2. Verify adult teacher session endpoint
      if (req.method === 'POST' && url.pathname === '/api/architect/verify') {
        const body = await parseBody(req)
        const teacher = await authenticateTeacher(req, body)
        sendJSON(res, 200, { ok: true, teacher })
        return
      }

      // 3. Generate 12-class plan endpoint
      if (req.method === 'POST' && url.pathname === '/api/architect/generate') {
        const body = await parseBody(req)
        const teacher = await authenticateTeacher(req, body)

        // Validate generic pedagogical parameters (no student PII accepted)
        const syntheticStudentId = '20000000-0000-4000-8000-000000000001'
        const requestId = crypto.randomUUID()

        const request = validateArchitectRequest({
          mode: 'learning_architect',
          studentId: syntheticStudentId,
          requestId,
          language: body.language,
          level: body.level,
          goal: body.goal,
          classes: body.classes || 12,
          duration: body.duration || 60,
          regenerate: null
        })

        // Enforce generic allowlist projection
        generalizedPedagogy(request)

        // Generate complete course
        const course = generateCurriculumCourse(request)
        const plan = architectCourseToPlan(course, request, {})
        validateLearningPlan(plan, { complete: true })

        sendJSON(res, 200, {
          ok: true,
          teacherId: teacher.teacherId,
          course,
          plan,
          providerStatus: IS_PROVIDER_CONFIRMED ? 'gemini_active' : 'gated_decoupled'
        })
        return
      }

      // 4. Regenerate individual session endpoint
      if (req.method === 'POST' && url.pathname === '/api/architect/regenerate') {
        const body = await parseBody(req)
        const teacher = await authenticateTeacher(req, body)

        const syntheticStudentId = '20000000-0000-4000-8000-000000000001'
        const requestId = crypto.randomUUID()
        const sessionIndex = Number(body.session ?? 0)

        const request = validateArchitectRequest({
          mode: 'learning_architect',
          studentId: syntheticStudentId,
          requestId,
          language: body.language,
          level: body.level,
          goal: body.goal,
          classes: body.classes || 12,
          duration: body.duration || 60,
          regenerate: {
            versionId: crypto.randomUUID(),
            revision: 1,
            session: sessionIndex
          }
        })

        generalizedPedagogy(request)
        const session = generateCurriculumSession(request)

        sendJSON(res, 200, {
          ok: true,
          teacherId: teacher.teacherId,
          sessionIndex,
          session
        })
        return
      }

      // 5. Static file fallback for standalone portal
      let filePath = path.join(ROOT_DIR, url.pathname === '/' ? 'architect/index.html' : url.pathname)
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase()
        const mimeTypes = {
          '.html': 'text/html; charset=utf-8',
          '.js': 'application/javascript; charset=utf-8',
          '.css': 'text/css; charset=utf-8',
          '.json': 'application/json; charset=utf-8',
          '.png': 'image/png',
          '.svg': 'image/svg+xml'
        }
        res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' })
        fs.createReadStream(filePath).pipe(res)
        return
      }

      sendJSON(res, 404, { ok: false, error: 'Endpoint not found' })
    } catch (err) {
      const statusCode = err instanceof AdultAuthError ? err.statusCode : 400
      sendJSON(res, statusCode, {
        ok: false,
        error: err.message,
        code: err.code || 'bad_request'
      })
    }
  })
}

if (process.argv[1] && process.argv[1] === fileURLToPath(import.meta.url)) {
  const server = createArchitectApp()
  server.listen(PORT, () => {
    console.log(`================================================================`)
    console.log(`✦ VERA ORBIS — ADULT TEACHER AI LEARNING ARCHITECT`)
    console.log(`================================================================`)
    console.log(`Portal URL: http://localhost:${PORT}/architect/index.html`)
    console.log(`API Mount:  http://localhost:${PORT}/api/architect/status`)
    console.log(`Security:   Strict Adult Teacher Only (18+) · Server Enforced`)
    console.log(`Provider:   Gemini Developer API Free Tier`)
    console.log(`Status:     ${IS_PROVIDER_CONFIRMED ? 'Live Gemini Active' : 'Gated Pending Written Google API Terms Confirmation (Decoupled Mode Active)'}`)
    console.log(`================================================================`)
  })
}

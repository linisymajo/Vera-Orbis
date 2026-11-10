import { resolve } from 'node:path'

export const STAGING_PROJECT_REF = 'duinvkphfnugoyvvlbbq'
export const STAGING_SUPABASE_URL = `https://${STAGING_PROJECT_REF}.supabase.co`

export class StagingDevConfigurationError extends Error {
  constructor(code, message) { super(message); this.name = 'StagingDevConfigurationError'; this.code = code }
}

function refuse(code, message) { throw new StagingDevConfigurationError(code, message) }
function decodeJwtObject(segment) {
  if (!/^[A-Za-z0-9_-]+$/.test(segment)) throw new Error('Invalid encoding')
  const bytes = Buffer.from(segment, 'base64url')
  if (bytes.toString('base64url') !== segment) throw new Error('Invalid encoding')
  const value = JSON.parse(bytes.toString('utf8'))
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid object')
  return value
}

// This checks a legacy key's claims, not its signature. Supabase authenticates the
// key when the browser connects; no signing secret is needed by this launcher.
function validateBrowserKey(value) {
  if (typeof value !== 'string' || !value.trim() || value.length > 8192) {
    refuse('STAGING_KEY_REQUIRED', 'Set VERA_STAGING_PUBLISHABLE_KEY in your terminal environment to the isolated staging browser publishable key (or legacy anon key). Existing VITE_* values and .env files are not used.')
  }
  const key = value.trim()
  if (/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) return key
  if (key.startsWith('sb_')) refuse('STAGING_KEY_TYPE', 'Only a browser publishable key or a legacy anon JWT is allowed. Secret, privileged, and unknown key types are refused.')
  try {
    const parts = key.split('.')
    if (parts.length !== 3 || !/^[A-Za-z0-9_-]+$/.test(parts[2])) throw new Error('Invalid JWT')
    const header = decodeJwtObject(parts[0]), claims = decodeJwtObject(parts[1])
    if (header.alg !== 'HS256' || (header.typ !== undefined && header.typ !== 'JWT') || claims.iss !== 'supabase' || claims.role !== 'anon') throw new Error('Not an anonymous key')
    if (claims.ref !== STAGING_PROJECT_REF) {
      refuse('STAGING_KEY_PROJECT', 'The legacy anon key does not belong to the isolated staging project duinvkphfnugoyvvlbbq.')
    }
    return key
  } catch (error) {
    if (error instanceof StagingDevConfigurationError) throw error
    refuse('STAGING_KEY_TYPE', 'Only a browser publishable key or a legacy anon JWT with the matching staging project is allowed. Secret, privileged, malformed, and unknown key types are refused.')
  }
}

export function validateStagingDevEnvironment(environment = {}) {
  const ref = environment.VERA_STAGING_PROJECT_REF
  if (ref !== undefined && ref !== '' && ref !== STAGING_PROJECT_REF) {
    refuse('STAGING_PROJECT_MISMATCH', 'Local staging development is restricted to project duinvkphfnugoyvvlbbq.')
  }
  const suppliedUrl = environment.VERA_STAGING_SUPABASE_URL
  let url
  try {
    url = new URL(suppliedUrl === undefined || suppliedUrl === '' ? STAGING_SUPABASE_URL : suppliedUrl)
    if (url.origin !== STAGING_SUPABASE_URL || url.pathname !== '/' || url.search || url.hash || url.username || url.password) throw new Error('Unexpected staging origin')
  } catch {
    refuse('STAGING_URL_MISMATCH', 'VERA_STAGING_SUPABASE_URL must be https://duinvkphfnugoyvvlbbq.supabase.co, without credentials, paths, or query parameters. Omit it to use that staging URL.')
  }
  const publishableKey = validateBrowserKey(environment.VERA_STAGING_PUBLISHABLE_KEY)
  return Object.freeze({
    projectRef: STAGING_PROJECT_REF,
    supabaseUrl: STAGING_SUPABASE_URL,
    publishableKey,
    publicEnvironment: Object.freeze({
      VITE_SUPABASE_URL: STAGING_SUPABASE_URL,
      VITE_SUPABASE_PUBLISHABLE_KEY: publishableKey,
      VITE_ACADEMIC_AI_ENABLED: 'false'
    })
  })
}

export function applyStagingDevEnvironment(environment, configuration) {
  // Do not inherit production redirects, alternate API keys, or arbitrary VITE_*
  // values. The server exposes only this explicit browser configuration.
  for (const name of Object.keys(environment)) if (name.startsWith('VITE_')) delete environment[name]
  Object.assign(environment, configuration.publicEnvironment)
  environment.NODE_ENV = 'development'
  // Vite's verbose DEBUG namespaces can print its resolved environment. Keep
  // them disabled before dynamically importing Vite, even if inherited.
  delete environment.DEBUG
  return environment
}

export function parseStagingDevArguments(args = []) {
  const server = {}
  for (let index = 0; index < args.length; index++) {
    const argument = args[index]
    if (argument === '--strictPort') { server.strictPort = true; continue }
    if (argument === '--host' || argument.startsWith('--host=')) {
      let host = argument.startsWith('--host=') ? argument.slice(7) : undefined
      if (host === undefined && args[index + 1] && !args[index + 1].startsWith('--')) host = args[++index]
      if (host === undefined) server.host = true
      else {
        if (!host || !/^[A-Za-z0-9_.:\[\]-]+$/.test(host)) refuse('DEV_ARGUMENTS', 'Use --host with a valid hostname or IP address.')
        server.host = host
      }
      continue
    }
    if (argument === '--port' || argument.startsWith('--port=')) {
      const port = argument.startsWith('--port=') ? argument.slice(7) : args[++index]
      if (typeof port !== 'string' || !/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) refuse('DEV_ARGUMENTS', 'Use --port with an integer between 1 and 65535.')
      server.port = Number(port)
      continue
    }
    refuse('DEV_ARGUMENTS', 'Supported staging options are --host [hostname], --port NUMBER, and --strictPort. Environment and mode overrides are refused.')
  }
  return server
}

export function stagingViteOptions(projectRoot, server = {}, customLogger) {
  return {
    root: projectRoot,
    configFile: resolve(projectRoot, 'vite.config.js'),
    mode: 'staging',
    envDir: false,
    envPrefix: 'VITE_',
    ...(Object.keys(server).length ? { server } : {}),
    ...(customLogger ? { customLogger } : {})
  }
}

export function createStagingDevLogger(publishableKey, output = console) {
  const warned = new Set(), errors = new WeakSet()
  const redact = value => String(value).split(publishableKey).join('[redacted]')
    .replace(/\bsb_(?:publishable|secret)_[A-Za-z0-9_-]+/g, '[redacted]')
    .replace(/\beyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[redacted]')
  const write = (method, message) => (output[method] || output.log).call(output, redact(message))
  const logger = {
    hasWarned: false,
    info(message) { write('info', message) },
    warn(message) { logger.hasWarned = true; write('warn', message) },
    warnOnce(message) { if (!warned.has(message)) { warned.add(message); logger.warn(message) } },
    error(message, options) {
      if (options?.error && typeof options.error === 'object') errors.add(options.error)
      write('error', message)
    },
    clearScreen() {},
    hasErrorLogged(error) { return !!error && typeof error === 'object' && errors.has(error) }
  }
  return logger
}

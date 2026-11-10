import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import { createReadStream, createWriteStream } from 'node:fs'
import { appendFile, open, stat } from 'node:fs/promises'
import { Readable, Transform } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { spawn } from 'node:child_process'

// The Windows bridge receives key bytes only through stdin. No command-line
// argument, log, environment file or plaintext key file contains the key.
export async function windowsProtect(bytes, { decrypt = false, entropy }) {
  const script = `Add-Type -AssemblyName System.Security; try { $v=ConvertFrom-Json ([Console]::In.ReadToEnd()); $b=[Convert]::FromBase64String($v.data); $e=[Convert]::FromBase64String($v.entropy); $r=[Security.Cryptography.ProtectedData]::${decrypt ? 'Unprotect' : 'Protect'}($b,$e,[Security.Cryptography.DataProtectionScope]::CurrentUser); [Console]::Out.Write([Convert]::ToBase64String($r)) } catch { exit 1 }`
  const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] })
  const chunks = []; let length = 0
  child.stdout.on('data', chunk => { length += chunk.length; if (length > 65536) child.kill(); else chunks.push(chunk) })
  child.stderr.resume()
  const done = new Promise((resolve, reject) => { child.once('error', () => reject(new Error('KEY_PROTECTION_FAILED'))); child.once('close', code => code === 0 ? resolve() : reject(new Error('KEY_PROTECTION_FAILED'))) })
  child.stdin.on('error', () => {})
  child.stdin.end(JSON.stringify({data:bytes.toString('base64'),entropy:Buffer.from(entropy).toString('base64')}))
  await done
  return Buffer.from(Buffer.concat(chunks).toString('utf8').trim(), 'base64')
}

export async function encryptBackup(readable, destination, { context, protect = windowsProtect }) {
  const key = randomBytes(32), iv = randomBytes(12)
  try {
    const wrapped = await protect(key, { entropy: context })
    const header = Buffer.from(JSON.stringify({ format: 'vera-encrypted-backup-v1', encryption: 'AES-256-GCM', key_protection: 'DPAPI-CurrentUser', context, wrapped_key: wrapped.toString('base64'), iv: iv.toString('base64') }) + '\n')
    const output = createWriteStream(destination, { flags: 'wx', mode: 0o600 })
    output.write(header)
    const cipher = createCipheriv('aes-256-gcm', key, iv); cipher.setAAD(header)
    const hash = createHash('sha256'); let bytes = 0
    await pipeline(typeof readable === 'function' ? readable() : readable, new Transform({ transform(chunk, _, done) { bytes += chunk.length; hash.update(chunk); done(null, chunk) } }), cipher, output)
    await appendFile(destination, cipher.getAuthTag())
    return { bytes, plaintext_sha256: hash.digest('hex'), encrypted_bytes: (await stat(destination)).size }
  } finally { key.fill(0) }
}

export async function decryptedBackup(source, { context, protect = windowsProtect }) {
  const handle = await open(source, 'r')
  let header, tag, size
  try {
    size = (await handle.stat()).size
    const prefix = Buffer.alloc(Math.min(size, 16384)); await handle.read(prefix, 0, prefix.length, 0)
    const end = prefix.indexOf(10)
    if (end < 1 || size < end + 17) throw new Error('BACKUP_HEADER_INVALID')
    header = prefix.subarray(0, end + 1)
    tag = Buffer.alloc(16); await handle.read(tag, 0, 16, size - 16)
  } finally { await handle.close() }
  const parsed = JSON.parse(header.toString('utf8'))
  if (parsed.format !== 'vera-encrypted-backup-v1' || parsed.encryption !== 'AES-256-GCM' || parsed.context !== context) throw new Error('BACKUP_CONTEXT_INVALID')
  const key = await protect(Buffer.from(parsed.wrapped_key, 'base64'), { decrypt: true, entropy: context })
  if (key.length !== 32) throw new Error('BACKUP_KEY_INVALID')
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(parsed.iv, 'base64'))
  decipher.setAAD(header); decipher.setAuthTag(tag); key.fill(0)
  // The async generator propagates both source and authentication failures.
  return Readable.from((async function* () {
    const sourceStream = size === header.length + 16 ? Readable.from([]) : createReadStream(source, { start: header.length, end: size - 17 })
    const pipe = pipeline(sourceStream, decipher)
    try { for await (const chunk of decipher) yield chunk; await pipe }
    finally { sourceStream.destroy(); await pipe.catch(() => {}) }
  })())
}

export async function verifyEncryptedBackup(source, options, expected) {
  const hash = createHash('sha256'); let bytes = 0
  for await (const chunk of await decryptedBackup(source, options)) { bytes += chunk.length; hash.update(chunk) }
  if (bytes !== expected.bytes || hash.digest('hex') !== expected.plaintext_sha256) throw new Error('BACKUP_ROUNDTRIP_MISMATCH')
  return true
}

// COPY text represents embedded newlines as escapes, so one physical data line
// is one row. Do not retain or log the fields, including Auth hashes/tokens.
export function copyCounter() {
  const counts = new Map(); let active = null, remainder = ''
  function line(value) {
    if (active) { if (value === '\\.') active = null; else counts.set(active, counts.get(active) + 1); return }
    const match = value.match(/^COPY (?:(?:"([^"]+)"|([a-z_][a-z0-9_]*)))\.(?:"([^"]+)"|([a-z_][a-z0-9_]*)) .* FROM stdin;$/)
    if (match) { active = (match[1] || match[2]) + '.' + (match[3] || match[4]); counts.set(active, 0) }
  }
  return { write(chunk) { remainder += chunk.toString('utf8'); let end; while ((end = remainder.indexOf('\n')) >= 0) { line(remainder.slice(0, end).replace(/\r$/, '')); remainder = remainder.slice(end + 1) } if (remainder.length > 64 * 1024 * 1024) throw new Error('BACKUP_ROW_LIMIT') },
    finish() { if (remainder) line(remainder); if (active) throw new Error('BACKUP_COPY_INCOMPLETE'); return counts } }
}

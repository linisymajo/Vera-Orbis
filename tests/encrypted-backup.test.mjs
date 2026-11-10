import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve, sep } from 'node:path'
import { Readable } from 'node:stream'
import { encryptBackup, decryptedBackup, verifyEncryptedBackup, copyCounter } from '../scripts/encrypted-backup-core.mjs'

test('encrypted stream roundtrip preserves binary bytes; wrong context or modified ciphertext fails without a plaintext file', async () => {
  const directory = await mkdtemp(resolve(tmpdir(), 'vera-backup-test-'))
  const protect = async bytes => Buffer.from(bytes) // In-memory test key wrapper only.
  const options = { context: 'isolated-unit-test', protect }
  const payload = Buffer.concat([Buffer.from('private synthetic Auth data\n'),Buffer.from([0,255,128,10])])
  try {
    const file = resolve(directory, 'backup.enc')
    const expected = await encryptBackup(Readable.from([payload]),file,options)
    assert.equal(await verifyEncryptedBackup(file,options,expected),true)
    const empty=resolve(directory,'empty.enc')
    const emptyMetadata=await encryptBackup(Readable.from([]),empty,options)
    assert.equal(await verifyEncryptedBackup(empty,options,emptyMetadata),true)
    const encrypted = await readFile(file)
    assert.equal(encrypted.includes(payload),false)
    await assert.rejects(decryptedBackup(file,{...options,context:'wrong-project'}))
    encrypted[encrypted.length-17] ^= 1; await writeFile(file,encrypted)
    await assert.rejects(verifyEncryptedBackup(file,options,expected))
  } finally {
    assert.ok(resolve(directory).startsWith(resolve(tmpdir())+sep+'vera-backup-test-'))
    await rm(directory,{recursive:true,force:true})
  }
})

test('archive COPY verification counts escaped records without retaining sensitive field values', () => {
  const counter = copyCounter()
  counter.write(Buffer.from('COPY auth.users (id, email) FROM stdin;\n1\tprivate\\nvalue\n2\tsecond\n\\.\nCOPY public."Mixed" (id) FROM stdin;\n'))
  counter.write(Buffer.from('3\n\\.\n'))
  assert.deepEqual([...counter.finish()],[['auth.users',2],['public.Mixed',1]])
  const truncated=copyCounter();truncated.write(Buffer.from('COPY auth.users (id) FROM stdin;\n1\n'))
  assert.throws(()=>truncated.finish(),/INCOMPLETE/)
})

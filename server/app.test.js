import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { once } from 'node:events'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { createApp } from './app.js'

async function withServer(distDir, fn) {
  const server = createServer(createApp({ distDir }))
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const { port } = server.address()
  try {
    await fn(`http://127.0.0.1:${port}`)
  } finally {
    server.close()
    await once(server, 'close')
  }
}

async function fixture() {
  const dir = await mkdtemp(path.join(tmpdir(), 'bff-server-'))
  await mkdir(path.join(dir, 'assets'))
  await writeFile(path.join(dir, 'index.html'), '<!doctype html><title>BFF</title>')
  await writeFile(path.join(dir, 'client-metadata.json'), '{"client_name":"BFF"}\n')
  await writeFile(path.join(dir, 'assets', 'app.js'), 'console.log("bff")\n')
  return dir
}

test('health and unknown API routes are JSON', async () => {
  const dir = await fixture()
  try {
    await withServer(dir, async (base) => {
      const health = await fetch(`${base}/api/health`)
      assert.equal(health.status, 200)
      assert.equal(health.headers.get('content-type'), 'application/json; charset=utf-8')
      assert.deepEqual(await health.json(), { ok: true })

      const missing = await fetch(`${base}/api/nope`)
      assert.equal(missing.status, 404)
      assert.deepEqual(await missing.json(), { error: 'not found' })

      const posted = await fetch(`${base}/api/health`, { method: 'POST' })
      assert.equal(posted.status, 405)
    })
  } finally {
    await rm(dir, { recursive: true })
  }
})

test('serves files, client routes, and refuses to leave dist', async () => {
  const dir = await fixture()
  const outside = path.join(path.dirname(dir), 'secret.txt')
  await writeFile(outside, 'nope')
  try {
    await withServer(dir, async (base) => {
      const root = await fetch(base)
      assert.equal(root.status, 200)
      assert.match(await root.text(), /BFF/)

      const clientRoute = await fetch(`${base}/you`)
      assert.equal(clientRoute.status, 200)
      assert.match(await clientRoute.text(), /BFF/)

      const metadata = await fetch(`${base}/client-metadata.json`)
      assert.equal(metadata.status, 200)
      assert.equal((await metadata.json()).client_name, 'BFF')

      const asset = await fetch(`${base}/assets/app.js`)
      assert.equal(asset.status, 200)
      assert.match(asset.headers.get('content-type'), /javascript/)
      assert.match(await asset.text(), /bff/)

      const missingAsset = await fetch(`${base}/assets/missing.js`)
      assert.equal(missingAsset.status, 404)

      const escaped = await fetch(`${base}/assets/..%2f..%2fsecret.txt`)
      assert.notEqual(escaped.status, 200)
      const body = await escaped.text()
      assert.equal(body.includes('nope'), false)
    })
  } finally {
    await rm(dir, { recursive: true })
    await rm(outside, { force: true })
  }
})

test('reports a missing build instead of an empty SPA', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'bff-server-empty-'))
  try {
    await withServer(dir, async (base) => {
      const res = await fetch(`${base}/login`)
      assert.equal(res.status, 503)
    })
  } finally {
    await rm(dir, { recursive: true })
  }
})

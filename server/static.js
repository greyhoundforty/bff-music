import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import path from 'node:path'
import { pipeline } from 'node:stream/promises'

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
}

export async function handleStatic(req, res, pathname, distDir) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    sendText(res, 405, 'method not allowed', req.method, { Allow: 'GET, HEAD' })
    return
  }

  const root = path.resolve(distDir)
  const filePath = safeJoin(root, pathname)
  if (!filePath) {
    sendText(res, 400, 'bad path', req.method)
    return
  }

  const found = await openFile(filePath)
  if (found) {
    await sendFile(res, found.path, found.stat, req.method)
    return
  }

  // Missing assets must 404. Extensionless paths are client routes.
  if (path.extname(pathname)) {
    sendText(res, 404, 'not found', req.method)
    return
  }

  const spa = await openFile(path.join(root, 'index.html'))
  if (!spa) {
    sendText(res, 503, 'app build not found', req.method)
    return
  }
  await sendFile(res, spa.path, spa.stat, req.method)
}

function safeJoin(root, pathname) {
  let decoded
  try {
    decoded = decodeURIComponent(pathname)
  } catch {
    return null
  }
  const rel = decoded.replace(/^\/+/, '')
  const full = path.resolve(root, rel)
  if (full !== root && !full.startsWith(root + path.sep)) return null
  return full
}

async function openFile(filePath) {
  const info = await statOrNull(filePath)
  if (info?.isFile()) return { path: filePath, stat: info }
  if (info?.isDirectory()) {
    const indexPath = path.join(filePath, 'index.html')
    const indexInfo = await statOrNull(indexPath)
    if (indexInfo?.isFile()) return { path: indexPath, stat: indexInfo }
  }
  return null
}

async function statOrNull(filePath) {
  try {
    return await stat(filePath)
  } catch (err) {
    if (err && err.code === 'ENOENT') return null
    throw err
  }
}

function contentType(filePath) {
  return TYPES[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream'
}

async function sendFile(res, filePath, info, method) {
  res.writeHead(200, {
    'Content-Type': contentType(filePath),
    'Content-Length': info.size,
    'X-Content-Type-Options': 'nosniff',
  })
  if (method === 'HEAD') {
    res.end()
    return
  }
  await pipeline(createReadStream(filePath), res)
}

function sendText(res, status, body, method, extraHeaders = {}) {
  res.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'X-Content-Type-Options': 'nosniff',
    ...extraHeaders,
  })
  res.end(method === 'HEAD' ? undefined : body)
}

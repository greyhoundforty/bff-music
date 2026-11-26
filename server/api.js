// JSON routes live under /api so they never fall through to the SPA shell.
// Discover stays a client fan-out until an AppView exists; do not stub one here.

export function handleApi(req, res, pathname) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    sendJson(res, 405, { error: 'method not allowed' }, req.method)
    return true
  }

  if (pathname === '/api/health') {
    sendJson(res, 200, { ok: true }, req.method)
    return true
  }

  sendJson(res, 404, { error: 'not found' }, req.method)
  return true
}

export function sendJson(res, status, body, method) {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    'X-Content-Type-Options': 'nosniff',
    ...(status === 405 ? { Allow: 'GET, HEAD' } : {}),
  })
  res.end(method === 'HEAD' ? undefined : payload)
}

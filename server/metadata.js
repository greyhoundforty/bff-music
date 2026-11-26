// AT Protocol OAuth client metadata, built per request so one image works at
// any URL. The authorization server fetches this document from the client_id
// URL itself, so the host it sees is the host the app is really served from.
// Set APP_URL to pin the origin instead of deriving it from the request.

import { sendJson } from './api.js'

const HOST_RE = /^[A-Za-z0-9.-]+(:\d{1,5})?$/

export function requestOrigin(req, appUrl = process.env.APP_URL) {
  if (appUrl) return new URL(appUrl).origin

  // Code Engine (and most proxies) terminate TLS and forward the original
  // scheme and host. Take the first value when a proxy chain appends more.
  const first = (value) => (Array.isArray(value) ? value[0] : value)?.split(',')[0].trim()
  const proto = first(req.headers['x-forwarded-proto']) === 'https' ? 'https' : 'http'
  const host = first(req.headers['x-forwarded-host']) || first(req.headers.host)
  if (!host || !HOST_RE.test(host)) return null
  return `${proto}://${host}`
}

export function clientMetadata(origin) {
  return {
    client_id: `${origin}/client-metadata.json`,
    client_name: 'Best · Favorite · First',
    client_uri: origin,
    redirect_uris: [`${origin}/callback`],
    scope: 'atproto transition:generic',
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    token_endpoint_auth_method: 'none',
    application_type: 'web',
    dpop_bound_access_tokens: true,
  }
}

export function handleClientMetadata(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    sendJson(res, 405, { error: 'method not allowed' }, req.method)
    return
  }
  const origin = requestOrigin(req)
  if (!origin) {
    sendJson(res, 400, { error: 'bad host' }, req.method)
    return
  }
  sendJson(res, 200, clientMetadata(origin), req.method)
}

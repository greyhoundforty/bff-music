import { handleApi } from './api.js'
import { handleClientMetadata } from './metadata.js'
import { handleStatic } from './static.js'

export function createApp({ distDir }) {
  return async function app(req, res) {
    try {
      const url = new URL(req.url ?? '/', 'http://127.0.0.1')
      const pathname = url.pathname

      if (pathname === '/api' || pathname.startsWith('/api/')) {
        handleApi(req, res, pathname)
        return
      }

      if (pathname === '/client-metadata.json') {
        handleClientMetadata(req, res)
        return
      }

      await handleStatic(req, res, pathname, distDir)
    } catch (err) {
      console.error(err)
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' })
        res.end('internal error')
      }
    }
  }
}

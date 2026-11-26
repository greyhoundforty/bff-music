import { createServer } from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createApp } from './app.js'

const here = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.resolve(process.env.BFF_DIST ?? path.join(here, '../starter/dist'))
const host = process.env.HOST ?? '0.0.0.0'
const port = Number(process.env.PORT ?? 8080)

if (!Number.isInteger(port) || port <= 0 || port > 65535) {
  console.error('PORT must be an integer from 1 to 65535')
  process.exit(1)
}

const server = createServer(createApp({ distDir }))
server.listen(port, host, () => {
  console.log(`bff listening on http://${host}:${port}`)
  console.log(`serving ${distDir}`)
})

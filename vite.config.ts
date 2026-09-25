import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import type { IncomingMessage } from 'node:http'

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (c) => (data += c))
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}

/**
 * Runs the same /api/ai logic as the Vercel function inside the Vite dev server,
 * so `npm run dev` works without the Vercel CLI. Keys are read from .env on the server side only.
 */
function devApi(): Plugin {
  return {
    name: 'studyduel-dev-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/ai', async (req, res) => {
        res.setHeader('content-type', 'application/json')
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end(JSON.stringify({ ok: false, error: 'Method not allowed' }))
          return
        }
        try {
          const body = JSON.parse((await readBody(req)) || '{}')
          const mod = await server.ssrLoadModule('/api/_lib/runner.ts')
          const result = await mod.runAiRequest(body)
          res.statusCode = result.status
          res.end(JSON.stringify(result.body))
        } catch (e) {
          res.statusCode = 500
          res.end(JSON.stringify({ ok: false, error: (e as Error).message }))
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  // Expose non-VITE_ variables to the dev API middleware only (never to the client bundle).
  const env = loadEnv(mode, process.cwd(), '')
  for (const [k, v] of Object.entries(env)) if (!(k in process.env)) process.env[k] = v

  return {
    plugins: [react(), devApi()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '@shared': fileURLToPath(new URL('./shared', import.meta.url)),
      },
    },
    build: { chunkSizeWarningLimit: 2000 },
  }
})

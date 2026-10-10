import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import { createReadStream } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const devPort = Number(process.env.VITE_DEV_PORT ?? 5173)
const repo = fileURLToPath(new URL('../../', import.meta.url))
const reviewFiles = [
  'renders.html', 'model-home.html', 'explorations.html', 'house-design-review.html', 'interior-design-guide.html', 'mineral-walnut-budget.html', 'mineral-walnut-roadmap.html', 'mineral-walnut-stone-studies.html',
  'room-design-book.html', 'daylight-modern-build-guide.html', 'bedroom-personalities-r03-preview.jpg',
  'stone-linen.html', 'stone-linen-build-book.html', 'cocoa-chrome.html', 'cocoa-chrome-build-book.html',
  'floor-one-design-review.html', 'floor-two-design-review.html',
  'floor-three-design-review.html', 'floor-four-design-review.html',
]
const reviewDirectories = ['design-review-assets', 'design-library-assets', 'stone-linen-assets', 'cocoa-chrome-assets', 'interior-guide-assets', 'mineral-walnut-stone-assets']

// Serve the same saved review pages in development and in the deployed app.
// Only public review documents and their media are exposed, not the whole docs directory.
function designLibrary(): Plugin {
  let output = ''
  return {
    name: 'home-design-library',
    configResolved(config) { if (config.command === 'build') output = path.resolve(config.root, config.build.outDir) },
    async buildStart() {
      await promisify(execFile)(process.execPath, [path.join(repo, 'scripts/build-design-library.mjs')])
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        let requested: string
        try { requested = decodeURIComponent(new URL(req.url ?? '/', 'http://local').pathname).slice(1) } catch { return next() }
        if (!reviewFiles.includes(requested) && !reviewDirectories.some(dir => requested.startsWith(`${dir}/`))) return next()
        if (requested.split('/').some(part => part === '..' || part === '.') || requested.includes('\\')) { res.statusCode = 400; res.end(); return }
        const file = path.join(repo, 'docs', requested)
        try {
          const stat = await fs.stat(file)
          if (!stat.isFile()) { res.statusCode = 404; res.end(); return }
          const types: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.pdf': 'application/pdf' }
          res.setHeader('Content-Type', types[path.extname(file)] ?? 'application/octet-stream')
          res.setHeader('Content-Length', stat.size)
          res.setHeader('Cache-Control', 'no-cache')
          if (req.method === 'HEAD') res.end()
          else createReadStream(file).on('error', () => res.destroy()).pipe(res)
        } catch { res.statusCode = 404; res.end('Review file not found') }
      })
    },
    async closeBundle() {
      if (!output) return
      for (const file of reviewFiles) await fs.copyFile(path.join(repo, 'docs', file), path.join(output, file))
      for (const dir of reviewDirectories) await fs.cp(path.join(repo, 'docs', dir), path.join(output, dir), { recursive: true })
    },
  }
}

export default defineConfig({
  plugins: [vue(), designLibrary()],
  server: {
    host: '127.0.0.1',
    port: devPort,
    strictPort: true,
  },
  build: { sourcemap: true },
})

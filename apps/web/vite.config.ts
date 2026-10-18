import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import { createReadStream } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { createReleaseVersion, stampReleaseVersion } from './release-version'
import { stampLibraryNavigation } from './library-navigation'

const devPort = Number(process.env.VITE_DEV_PORT ?? 5173)
const repo = fileURLToPath(new URL('../../', import.meta.url))
const reviewFiles = [
  'renders.html', 'current-furniture.html', 'model-home.html', 'mineral-walnut.html', 'cocoa-chrome-overview.html', 'explorations.html', 'house-design-review.html', 'interior-design-guide.html', 'mineral-walnut-budget.html', 'mineral-walnut-roadmap.html', 'mineral-walnut-stone-studies.html',
  'room-design-book.html', 'daylight-modern-build-guide.html', 'bedroom-personalities-r03-preview.jpg',
  'stone-linen.html', 'stone-linen-build-book.html', 'cocoa-chrome.html', 'cocoa-chrome-build-book.html',
  'floor-one-design-review.html', 'floor-two-design-review.html',
  'floor-three-design-review.html', 'floor-four-design-review.html',
]
const reviewDirectories = ['design-review-assets', 'design-library-assets', 'current-furniture-assets', 'stone-linen-assets', 'cocoa-chrome-assets', 'interior-guide-assets', 'mineral-walnut-stone-assets']
const collectedMineralFiles = ['collected-mineral.html', 'collected-mineral-overview.html', 'collected-mineral-build-book.html', 'collected-mineral-furniture.html']
const cocoaChromeOwnedFiles = ['cocoa-chrome-furniture.html']
async function cocoaChromeOwnedReady() {
  try {
    const design = JSON.parse(await fs.readFile(path.join(repo, 'docs/cocoa-chrome-owned-design.json'), 'utf8')) as { status?: string }
    const gallery = await fs.readFile(path.join(repo, 'docs/cocoa-chrome.html'), 'utf8')
    return design.status === 'complete' && gallery.includes('<meta name="home-708-option-status" content="complete">') && gallery.includes('<meta name="home-708-option-id" content="cocoa-chrome-owned">')
  } catch { return false }
}
async function collectedMineralReady() {
  try {
    const design = JSON.parse(await fs.readFile(path.join(repo, 'docs/collected-mineral-design.json'), 'utf8')) as { status?: string }
    const gallery = await fs.readFile(path.join(repo, 'docs/collected-mineral.html'), 'utf8')
    return design.status === 'complete' && gallery.includes('<meta name="home-708-option-status" content="complete">')
  } catch { return false }
}

// Serve the same saved review pages in development and in the deployed app.
// Only public review documents and their media are exposed, not the whole docs directory.
function designLibrary(): Plugin {
  let output = ''
  const release = createReleaseVersion(repo)
  const headerPath = path.join(repo, 'scripts/design-library/library-header.html')
  async function decorateLibraryPage(html: string, pagePath: string) {
    const header = await fs.readFile(headerPath, 'utf8')
    return stampReleaseVersion(stampLibraryNavigation(html, pagePath, header), release)
  }
  return {
    name: 'home-design-library',
    configResolved(config) { if (config.command === 'build') output = path.resolve(config.root, config.build.outDir) },
    transformIndexHtml: {
      order: 'post',
      handler(html) { return stampReleaseVersion(html, release) },
    },
    async buildStart() {
      await promisify(execFile)(process.execPath, [path.join(repo, 'scripts/build-design-library.mjs')])
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        let requested: string
        try { requested = decodeURIComponent(new URL(req.url ?? '/', 'http://local').pathname).slice(1) } catch { return next() }
        if (requested === 'version.json') {
          const body = JSON.stringify(release, null, 2) + '\n'
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.setHeader('Cache-Control', 'no-cache')
          res.setHeader('Content-Length', Buffer.byteLength(body))
          if (req.method === 'HEAD') res.end()
          else res.end(body)
          return
        }
        const isCollectedMineral = collectedMineralFiles.includes(requested) || requested.startsWith('collected-mineral-assets/')
        const isCocoaChromeOwned = cocoaChromeOwnedFiles.includes(requested) || requested.startsWith('cocoa-chrome-owned-assets/')
        const isReview = reviewFiles.includes(requested) || reviewDirectories.some(dir => requested.startsWith(`${dir}/`)) || (isCollectedMineral && await collectedMineralReady()) || (isCocoaChromeOwned && await cocoaChromeOwnedReady())
        if (isCollectedMineral && !isReview) { res.statusCode = 404; res.end('Option preparation is not public.'); return }
        if (isCocoaChromeOwned && !isReview) { res.statusCode = 404; res.end('Option preparation is not public.'); return }
        const isPublicHtml = path.extname(requested).toLowerCase() === '.html' && Boolean(server.config.publicDir)
        if (!isReview && !isPublicHtml) return next()
        if (requested.split('/').some(part => part === '..' || part === '.') || requested.includes('\\')) { res.statusCode = 400; res.end(); return }
        const file = isReview ? path.join(repo, 'docs', requested) : path.join(server.config.publicDir, requested)
        try {
          const stat = await fs.stat(file)
          if (!stat.isFile()) { res.statusCode = 404; res.end(); return }
          const types: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.pdf': 'application/pdf' }
          res.setHeader('Content-Type', types[path.extname(file)] ?? 'application/octet-stream')
          res.setHeader('Cache-Control', 'no-cache')
          if (path.extname(file).toLowerCase() === '.html') {
            const body = await decorateLibraryPage(await fs.readFile(file, 'utf8'), requested)
            res.setHeader('Content-Length', Buffer.byteLength(body))
            if (req.method === 'HEAD') res.end()
            else res.end(body)
          } else {
            res.setHeader('Content-Length', stat.size)
            if (req.method === 'HEAD') res.end()
            else createReadStream(file).on('error', () => res.destroy()).pipe(res)
          }
        } catch {
          if (!isReview) return next()
          res.statusCode = 404
          res.end('Review file not found')
        }
      })
    },
    async closeBundle() {
      if (!output) return
      for (const file of reviewFiles) await fs.copyFile(path.join(repo, 'docs', file), path.join(output, file))
      for (const dir of reviewDirectories) await fs.cp(path.join(repo, 'docs', dir), path.join(output, dir), { recursive: true })
      if (await cocoaChromeOwnedReady()) {
        for (const file of cocoaChromeOwnedFiles) await fs.copyFile(path.join(repo, 'docs', file), path.join(output, file))
        await fs.cp(path.join(repo, 'docs/cocoa-chrome-owned-assets'), path.join(output, 'cocoa-chrome-owned-assets'), { recursive: true })
      }
      if (await collectedMineralReady()) {
        for (const file of collectedMineralFiles) await fs.copyFile(path.join(repo, 'docs', file), path.join(output, file))
        await fs.cp(path.join(repo, 'docs/collected-mineral-assets'), path.join(output, 'collected-mineral-assets'), { recursive: true })
      }
      async function stampDirectory(directory: string) {
        for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
          const file = path.join(directory, entry.name)
          if (entry.isDirectory()) await stampDirectory(file)
          else if (entry.isFile() && path.extname(entry.name).toLowerCase() === '.html') {
            const relative = path.relative(output, file).split(path.sep).join('/')
            const html = await fs.readFile(file, 'utf8')
            await fs.writeFile(file, relative === 'index.html' ? stampReleaseVersion(html, release) : await decorateLibraryPage(html, relative))
          }
        }
      }
      await stampDirectory(output)
      await fs.writeFile(path.join(output, 'version.json'), JSON.stringify(release, null, 2) + '\n')
    },
  }
}

// Stream raw footage from `assets/footage/` on the dev server only. The files are
// gigabytes, git-ignored and never deployed; production uses the hosted address
// in `assets/walkthrough.json`.
function footagePreview(): Plugin {
  const footageDir = path.join(repo, 'assets/footage')
  const types: Record<string, string> = { '.mp4': 'video/mp4', '.m4v': 'video/mp4', '.mov': 'video/quicktime', '.webm': 'video/webm' }
  return {
    name: 'home-footage-preview',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        let pathname: string
        try { pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://local').pathname) } catch { return next() }
        if (!pathname.startsWith('/footage/')) return next()
        const name = pathname.slice('/footage/'.length)
        if (!name || name.includes('/') || name.includes('\\') || name.startsWith('.')) { res.statusCode = 404; res.end(); return }
        const file = path.join(footageDir, name)
        let size: number
        try {
          const stat = await fs.stat(file)
          if (!stat.isFile()) throw new Error('not a file')
          size = stat.size
        } catch { res.statusCode = 404; res.end('Footage not found'); return }
        res.setHeader('Content-Type', types[path.extname(name).toLowerCase()] ?? 'application/octet-stream')
        res.setHeader('Accept-Ranges', 'bytes')
        res.setHeader('Cache-Control', 'no-cache')
        const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? '')
        let start = 0
        let end = size - 1
        if (range) {
          if (range[1]) start = Number(range[1])
          if (range[2]) end = range[1] ? Math.min(Number(range[2]), size - 1) : size - 1
          if (!range[1] && range[2]) start = Math.max(size - Number(range[2]), 0)
          if (start > end || start >= size) { res.statusCode = 416; res.setHeader('Content-Range', `bytes */${size}`); res.end(); return }
          res.statusCode = 206
          res.setHeader('Content-Range', `bytes ${start}-${end}/${size}`)
        }
        res.setHeader('Content-Length', end - start + 1)
        if (req.method === 'HEAD') { res.end(); return }
        createReadStream(file, { start, end }).on('error', () => res.destroy()).pipe(res)
      })
    },
  }
}

export default defineConfig({
  plugins: [vue(), designLibrary(), footagePreview()],
  server: {
    host: '127.0.0.1',
    port: devPort,
    strictPort: true,
  },
  build: { sourcemap: true },
})

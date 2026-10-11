import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'

export interface ReleaseVersion {
  releaseId: string
  appVersion: string
  revision: string
  shortRevision: string
  builtAt: string
  display: string
}

/** Resolve once per Vite run so every route and saved review page shares one release. */
export function createReleaseVersion(repo: string, now = new Date()): ReleaseVersion {
  const { version: appVersion } = JSON.parse(readFileSync(path.join(repo, 'package.json'), 'utf8')) as { version: string }
  let revision = 'unknown'
  try {
    revision = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
  } catch { /* The timestamp still identifies builds made without a Git checkout. */ }
  const shortRevision = revision === 'unknown' ? revision : revision.slice(0, 8)
  const builtAt = now.toISOString()
  const buildId = builtAt.replace(/[-:.]/g, '')
  return {
    releaseId: `${appVersion}-${buildId}-${shortRevision}`,
    appVersion,
    revision,
    shortRevision,
    builtAt,
    display: `v${appVersion}`,
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!))
}

function insertBeforeClosingTag(html: string, tag: string, content: string): string {
  const matches = [...html.matchAll(new RegExp(`</${tag}\\s*>`, 'gi'))]
  const last = matches.at(-1)
  return last?.index !== undefined ? html.slice(0, last.index) + content + html.slice(last.index) : html + content
}

/** Idempotently stamp build output or a dev response; never change saved source documents. */
export function stampReleaseVersion(html: string, release: ReleaseVersion): string {
  let stamped = html.replace(/<!-- home-708-version:start -->[\s\S]*?<!-- home-708-version:end -->\s*/g, '')
  const head = `<!-- home-708-version:start --><meta name="home-708-release" content="${escapeHtml(release.releaseId)}"><style id="home-708-version-style">#home-708-version{position:fixed;z-index:2147483000;left:max(8px,env(safe-area-inset-left));bottom:max(7px,env(safe-area-inset-bottom));max-width:calc(100vw - 16px);padding:5px 8px;border:1px solid rgba(255,255,255,.16);border-radius:5px;background:rgba(32,36,33,.88);color:#fff;font:10px/1.4 ui-monospace,SFMono-Regular,Consolas,monospace;letter-spacing:0;white-space:nowrap;pointer-events:none;box-shadow:0 2px 8px rgba(0,0,0,.12)}@media(max-width:600px){#home-708-version{font-size:9px;padding:4px 6px}}@media print{#home-708-version{position:static;display:inline-block;margin-top:15px;box-shadow:none}}</style><!-- home-708-version:end -->`
  const label = `Home 708 release ${release.display}`
  const badge = `<!-- home-708-version:start --><aside id="home-708-version" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}" data-release-id="${escapeHtml(release.releaseId)}">Version ${escapeHtml(release.display)}</aside><!-- home-708-version:end -->`
  stamped = insertBeforeClosingTag(stamped, 'head', head)
  return insertBeforeClosingTag(stamped, 'body', badge)
}

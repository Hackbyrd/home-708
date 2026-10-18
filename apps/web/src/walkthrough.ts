// The filmed walkthrough is far too large to ship with the site, so it is
// hosted separately and only its address lives in `assets/walkthrough.json`.
// In development the raw footage in `assets/footage/` is streamed by Vite so
// the player can be checked before the video is published anywhere.
import config from '../../../assets/walkthrough.json'

export interface WalkthroughConfig {
  title: string
  description: string
  /** Direct MP4 or HLS address once the video is hosted. */
  src: string
  /** Player page to embed instead, such as a YouTube, Vimeo or Cloudflare Stream iframe URL. */
  embed: string
  /** File name under `assets/footage/` used only on the local dev server. */
  localFile: string
  durationSeconds: number
}

export interface Walkthrough extends WalkthroughConfig {
  available: boolean
  durationLabel: string
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return ''
  if (seconds < 60) return `${Math.round(seconds)} sec`
  return `${Math.round(seconds / 60)} min`
}

export function resolveWalkthrough(value: Partial<WalkthroughConfig>, dev: boolean): Walkthrough {
  const localFile = value.localFile ?? ''
  const src = value.src || (dev && localFile ? `/footage/${encodeURIComponent(localFile)}` : '')
  const embed = value.src ? '' : (value.embed ?? '')
  return {
    title: value.title || 'Video walkthrough',
    description: value.description ?? '',
    src,
    embed,
    localFile,
    durationSeconds: value.durationSeconds ?? 0,
    available: Boolean(src || embed),
    durationLabel: formatDuration(value.durationSeconds ?? 0),
  }
}

export const WALKTHROUGH = resolveWalkthrough(config, import.meta.env.DEV)

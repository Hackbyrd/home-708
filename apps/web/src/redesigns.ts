import catalog from './redesign-catalog.json'
// Whole-house redesign gallery data: the 15 design looks, the 19 rendered rooms,
// the first-floor cost table, and the resolver that maps a room/look pair to its
// web-sized render in `assets/renders-web/` (built by `npm run build:renders`).
//
// Room `status` summarizes the complete set. The gallery uses render-qa.json
// to identify retained earlier variants among the currently selected looks.

import { REFERENCE_PHOTOS, type ReferencePhoto } from './reference'
import reviewedRenders from './render-qa.json'

export type FloorKey = 'first-floor' | 'second-floor' | 'third-floor' | 'penthouse'
export type LookGroup = 'Modern, budget' | 'Five-star hotel' | 'New directions'
export type RoomStatus = 'draft' | 'final'
/** 'rendered' looks have images in assets/renders-web; 'concept' looks await generation. */
export type LookStatus = 'rendered' | 'concept'

export interface LookStory {
  /** Why this direction exists — the reasoning behind choosing it for this house. */
  why: string
  /** How it should make the owners and guests feel. */
  feel: string
  /** The signature moves a design-build firm would price and execute. */
  signature: string
  /** Practical build notes: where the money goes, how to phase it. */
  build: string
}

export interface RedesignLook {
  key: string
  name: string
  group: LookGroup
  swatch: string
  description: string
  status: LookStatus
  story: LookStory
}

export interface RedesignRoom {
  key: string
  floor: FloorKey
  name: string
  dims: string
  note: string
  /** id of the model-home photo in reference.ts, or null when none exists (Bath #3). */
  photoId: string | null
  /** portrait rooms use a 2:3 tile instead of 3:2. */
  portrait?: boolean
  status: RoomStatus
}

export const FLOORS: Array<{ key: FloorKey; label: string }> = catalog.FLOORS as Array<{ key: FloorKey; label: string }>

export const LOOKS: RedesignLook[] = catalog.LOOKS as RedesignLook[]

export const LOOK_GROUPS: LookGroup[] = catalog.LOOK_GROUPS as LookGroup[]
/** Looks that have generated renders on disk. */
export const RENDERED_LOOKS: RedesignLook[] = LOOKS.filter((look) => look.status === 'rendered')

export const ROOMS: RedesignRoom[] = catalog.ROOMS as RedesignRoom[]

export interface CostRow {
  item: string
  good: string
  better: string
}

export const FIRST_FLOOR_COSTS: { caption: string; rows: CostRow[]; total: CostRow } = catalog.FIRST_FLOOR_COSTS as { caption: string; rows: CostRow[]; total: CostRow }

// Vite bundles every web render; keys are source paths, values hashed URLs.
const renderModules = import.meta.glob<string>(
  '../../../assets/renders-web/*/*.webp',
  { eager: true, query: '?url', import: 'default' },
)

const renderIndex = new Map<string, string>()
for (const [path, src] of Object.entries(renderModules)) {
  const parts = path.split('/')
  const file = parts.pop() ?? ''
  const floor = parts.pop() ?? ''
  renderIndex.set(`${floor}/${file.replace(/\.webp$/i, '')}`, src)
}

/** URL of the web render for a room/look pair, or undefined when it is missing. */
export function renderSrc(floor: FloorKey, roomKey: string, lookKey: string): string | undefined {
  return renderIndex.get(`${floor}/${roomKey}-${lookKey}`)
}

const reviewedRenderIndex = new Set(reviewedRenders)
export function isRenderReviewed(floor: FloorKey, roomKey: string, lookKey: string): boolean {
  return reviewedRenderIndex.has(`${floor}/${roomKey}-${lookKey}`)
}

export function roomsOnFloor(floor: FloorKey): RedesignRoom[] {
  return ROOMS.filter((room) => room.floor === floor)
}

/** The model-home photo for a room, resolved against the bundled reference photos. */
export function modelPhoto(room: RedesignRoom): ReferencePhoto | null {
  if (!room.photoId) return null
  return REFERENCE_PHOTOS.find((photo) => photo.id === room.photoId) ?? null
}

export const RENDER_COUNT = ROOMS.length * RENDERED_LOOKS.length

const videoModules = import.meta.glob<string>(
  '../../../assets/renders-video/*/*.mp4',
  { eager: true, query: '?url', import: 'default' },
)

/** Local, approved clips are optional when only the image bundle is installed. */
export function videoSrc(floor: FloorKey, roomKey: string, lookKey = 'modern'): string | undefined {
  return videoModules[`../../../assets/renders-video/${floor}/${roomKey}-${lookKey}.mp4`]
}

export const TOUR_ORDER: Record<FloorKey, string[]> = {
  'first-floor': ['entry', 'office', 'media', 'gym', 'bath'],
  'second-floor': ['dining', 'kitchen', 'sunroom', 'great', 'stair2'],
  'third-floor': ['ownerbed', 'retreat', 'ownerbath', 'bed3', 'sharedbath', 'laundry'],
  penthouse: ['loft', 'bed5', 'terrace'],
}

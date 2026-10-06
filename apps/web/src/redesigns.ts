// Whole-house redesign gallery data: the 9 design looks, the 19 rendered rooms,
// the first-floor cost table, and the resolver that maps a room/look pair to its
// web-sized render in `assets/renders-web/` (built by `npm run build:renders`).
//
// Room `status` drives the "Draft renders" badge: every room starts as 'draft'
// until its renders are regenerated against docs/render-audit.md — flip a room
// to 'final' here once its redo lands.

import { REFERENCE_PHOTOS, type ReferencePhoto } from './reference'

export type FloorKey = 'first-floor' | 'second-floor' | 'third-floor' | 'penthouse'
export type LookGroup = 'Modern, budget' | 'Five-star hotel'
export type RoomStatus = 'draft' | 'final'

export interface RedesignLook {
  key: string
  name: string
  group: LookGroup
  swatch: string
  description: string
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

export const FLOORS: Array<{ key: FloorKey; label: string }> = [
  { key: 'first-floor', label: 'Entry level' },
  { key: 'second-floor', label: 'Main level' },
  { key: 'third-floor', label: 'Bedroom level' },
  { key: 'penthouse', label: 'Penthouse' },
]

export const LOOKS: RedesignLook[] = [
  { key: 'modern', name: 'Modern home', group: 'Modern, budget', swatch: '#c9b79a', description: 'Engineered white oak, warm white paint, matte black hardware, stone-look porcelain, oak veneer cabinetry.' },
  { key: 'blackwalnut', name: 'Black & walnut', group: 'Modern, budget', swatch: '#4a3326', description: 'Crisp white walls, walnut cabinetry and furniture, matte black accents, graphic black and white tile.' },
  { key: 'sageclay', name: 'Sage & clay', group: 'Modern, budget', swatch: '#8fa088', description: 'Sage painted cabinets, terracotta and clay textiles, zellige-look tile, light oak, aged brass.' },
  { key: 'navybrass', name: 'Navy & brass', group: 'Modern, budget', swatch: '#22314f', description: 'Navy cabinetry and accent walls, white oak, brushed brass, marble-look quartz. Tailored and classic.' },
  { key: 'scandi', name: 'Scandi light', group: 'Modern, budget', swatch: '#e4e1da', description: 'All-white walls, pale ash and birch, light grey and oatmeal textiles. The brightest option.' },
  { key: 'aman', name: 'Aman warm minimal', group: 'Five-star hotel', swatch: '#d8c6a6', description: 'Pale oak, travertine, sand limewash plaster, bronze, linen. Quiet and spa-like.' },
  { key: 'rosewood', name: 'Rosewood dark moody', group: 'Five-star hotel', swatch: '#2b211b', description: 'Smoked oak, black marble, brushed brass, velvet. Dramatic evening light.' },
  { key: 'parkhyatt', name: 'Park Hyatt Tokyo', group: 'Five-star hotel', swatch: '#3c3a37', description: 'Walnut, charcoal plaster, basalt, black steel, gallery lighting. Disciplined and masculine.' },
  { key: 'bulgari', name: 'Bulgari Italian', group: 'Five-star hotel', swatch: '#b89a5e', description: 'Calacatta marble, dark eucalyptus wood, polished brass. Tailored glamour.' },
]

export const LOOK_GROUPS: LookGroup[] = ['Modern, budget', 'Five-star hotel']

export const ROOMS: RedesignRoom[] = [
  // Entry level
  { key: 'entry', floor: 'first-floor', name: 'Entrance gallery', dims: 'Two-story, open to above', photoId: 'first-floor-entrance-gallery-and-spiral-staircase', portrait: true, status: 'draft', note: 'Facing glass double doors to the office and studio, the arch into the center hall, curved stair beyond, balcony overhead. The polka-dot wallpaper, cherry floor and white spindles go.' },
  { key: 'gym', floor: 'first-floor', name: 'Studio gym', dims: "11'-11\" × 13'-1\"", photoId: 'first-floor-studio-room', status: 'draft', note: 'Wine wall and ladder come out for a full mirror wall, rack and dumbbells. Rubber floor takes dropped weights; 9\' ceiling means a wall-mount folding rack.' },
  { key: 'media', floor: 'first-floor', name: 'Media room', dims: "15'-1\" × 11'-1\"", photoId: 'first-floor-media-room', status: 'draft', note: 'Keeps the tray ceiling, street window and U-sectional. The right wall becomes the TV wall with in-ceiling or in-wall Sonos.' },
  { key: 'office', floor: 'first-floor', name: 'Home office', dims: "15'-5\" × 12'-11\"", photoId: 'first-floor-home-office', status: 'draft', note: 'Corner windows stay. The left wall becomes the full built-in the plan already shows as an option.' },
  { key: 'bath', floor: 'first-floor', name: 'Bath #3', dims: "Full bath, approx. 6' × 9'", photoId: null, portrait: true, status: 'draft', note: 'No model-home photo; built from the plan. Vanity and toilet on the garage-side wall, corner shower with a bench.' },
  // Main level
  { key: 'great', floor: 'second-floor', name: 'Great room', dims: 'Fireplace, balcony doors', photoId: 'second-floor-great-room', status: 'draft', note: 'French doors to the balcony, linear gas fireplace and the high transom window stay. The fireplace surround is where each look spends its money.' },
  { key: 'kitchen', floor: 'second-floor', name: 'Kitchen', dims: 'Waterfall island, 4 stools', photoId: 'second-floor-main-kitchen-2', status: 'draft', note: 'Same footprint and island. New cabinet fronts, counters, backsplash, hood and pendants; the appliances get replaced too.' },
  { key: 'dining', floor: 'second-floor', name: 'Formal dining', dims: 'Seats eight', photoId: 'second-floor-formal-dining', status: 'draft', note: 'Arched window and corner windows stay. Table, chandelier and sideboard change with each look.' },
  { key: 'sunroom', floor: 'second-floor', name: 'Sun room', dims: 'Breakfast nook', photoId: 'second-floor-sun-room', status: 'draft', note: 'Wraparound windows and the wall-oven column stay; the column gets new fronts to match the kitchen.' },
  { key: 'stair2', floor: 'second-floor', name: 'Stair hall', dims: 'Curved stair', photoId: 'second-floor-spiral-staircase', status: 'draft', note: 'Same curved stair. New treads, handrail and balusters or paint, plus runner and lighting.' },
  // Bedroom level
  { key: 'ownerbed', floor: 'third-floor', name: "Owner's bedroom", dims: 'Row of windows', photoId: 'third-floor-master-bedroom', status: 'draft', note: 'Window wall and bed wall stay; carpet comes out for wood in every look.' },
  { key: 'retreat', floor: 'third-floor', name: "Owner's retreat", dims: 'Coffee + wine bar', photoId: 'third-floor-master-bedroom-owners-retreat', status: 'draft', note: 'The existing coffee bar with sink and wine fridge stays in place with new cabinets and counter.' },
  { key: 'ownerbath', floor: 'third-floor', name: "Owner's bath", dims: 'Tub, walk-in shower, double vanity', photoId: 'third-floor-master-bedroom-bath', status: 'draft', note: 'Freestanding tub on the feature wall, glass shower, long double vanity. Heated floor in every look.' },
  { key: 'bed3', floor: 'third-floor', name: 'Bedroom 3', dims: 'Corner windows', photoId: 'third-floor-bedroom-3', status: 'draft', note: 'Corner windows stay; the magenta valance and drapes go.' },
  { key: 'sharedbath', floor: 'third-floor', name: 'Shared bath', dims: 'Jack-and-Jill, bedrooms 2 + 3', photoId: 'third-floor-shared-bath-bedroom-2-3', status: 'draft', note: 'Double vanity between bedrooms 2 and 3. Heated floor planned here too.' },
  { key: 'laundry', floor: 'third-floor', name: 'Laundry', dims: 'New washer + dryer', photoId: 'third-floor-laundry-room', status: 'draft', note: 'Sink run and windows stay. New side-by-side front-loaders with a folding counter over them.' },
  // Penthouse
  { key: 'loft', floor: 'penthouse', name: 'Penthouse loft', dims: 'Wet bar, terrace doors', photoId: 'fourth-floor-penthouse-loft', status: 'draft', note: 'Tray ceiling, wet bar and both sets of terrace doors stay.' },
  { key: 'bed5', floor: 'penthouse', name: 'Bedroom 5', dims: 'New build', photoId: 'fourth-floor-penthouse-bedroom-5', status: 'draft', note: '708 has no Bedroom 5 yet. The photo is the version Wormald built in the model home; the renders show how it could look once added.' },
  { key: 'terrace', floor: 'penthouse', name: 'Roof terrace', dims: 'Pergola, fire feature', photoId: 'fourth-floor-outdoor-living-terrace-and-sun-terrace-3', status: 'draft', note: 'Pergola, railings and the fire wall stay. Each look translated into outdoor materials, with deck speakers planned.' },
]

export interface CostRow {
  item: string
  good: string
  better: string
}

export const FIRST_FLOOR_COSTS: { caption: string; rows: CostRow[]; total: CostRow } = {
  caption: 'Finishes and built-ins, labor included, DC-area rough ranges. Excludes furniture being moved over, whole-house Sonos and Apple Home work, and gym equipment (about $4 to 8K). Get two or three contractor bids before treating any number as real. Hotel looks run roughly 2 to 3 times the Better column.',
  rows: [
    { item: 'Floors, about 700 sq ft (gallery, halls, office, media)', good: 'Quality LVP, $4-5K', better: 'Engineered white oak, $7-10K' },
    { item: 'Wallpaper off, paint the whole floor incl. two-story gallery', good: 'One warm white, $5-7K', better: 'Plus a limewash accent wall, $7-9K' },
    { item: 'Stair and balcony', good: 'Paint spindles black, new oak handrail, $1.5-3K', better: 'New metal balusters, $6-10K' },
    { item: 'Lighting: gallery pendant, 2700K cans, dimmers, sconces', good: '$3-5K', better: '$6-9K' },
    { item: 'Studio gym: wine wall out, rubber floor, mirror wall', good: '$3-4K', better: '$4-6K' },
    { item: 'Media wall: floating console and shelves', good: 'Semi-custom or IKEA-based with oak fronts, $2-4K', better: 'Custom oak veneer, $6-10K' },
    { item: 'Office built-ins, about 13 ft wall', good: 'IKEA-based, painted, $3-6K', better: 'Custom painted cabinetry, $8-14K' },
    { item: 'Bath #3: porcelain tile, floating vanity, glass panel, new fixtures', good: 'Keep layout, $12-16K', better: 'Bigger tile, wall-hung toilet, niche, $18-25K' },
  ],
  total: { item: 'First floor total', good: '$34-50K', better: '$62-93K' },
}

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

export function roomsOnFloor(floor: FloorKey): RedesignRoom[] {
  return ROOMS.filter((room) => room.floor === floor)
}

/** The model-home photo for a room, resolved against the bundled reference photos. */
export function modelPhoto(room: RedesignRoom): ReferencePhoto | null {
  if (!room.photoId) return null
  return REFERENCE_PHOTOS.find((photo) => photo.id === room.photoId) ?? null
}

export const RENDER_COUNT = ROOMS.length * LOOKS.length

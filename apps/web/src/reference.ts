// Reference material bundled from the repository's root `assets/` folder.
// Vite serves these files in development and emits them as hashed assets in
// production builds, so nothing is copied or duplicated in the repository.
import blueprintUrl from '../../../assets/cf_city_home_with_georgetown_pkg.pdf?url'

export interface ReferencePhoto {
  id: string
  src: string
  title: string
  group: string
}

export interface ReferencePhotoGroup {
  group: string
  photos: ReferencePhoto[]
}

export const BLUEPRINT_URL = blueprintUrl
export const BLUEPRINT_TITLE = 'City Home with Georgetown package'

const GROUPS: Array<{ match: RegExp; label: string; order: number }> = [
  { match: /^first-floor-/, label: '01 · Ground floor', order: 1 },
  { match: /^second-floor-/, label: '02 · Main floor', order: 2 },
  { match: /^third-floor-/, label: '03 · Upper floor', order: 3 },
  { match: /^fourth-floor-/, label: '04 · Penthouse', order: 4 },
]

const photoModules = import.meta.glob<string>(
  '../../../assets/Crown Georgetown Photos/*.webp',
  { eager: true, query: '?url', import: 'default' },
)

function humanize(slug: string): string {
  const words = slug.replace(/-/g, ' ').trim()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

export function describePhoto(path: string): ReferencePhoto {
  const file = path.split('/').pop() ?? path
  const id = file.replace(/\.jpg\.webp$|\.webp$/i, '')
  const groupMatch = GROUPS.find((entry) => entry.match.test(id))
  const slug = groupMatch ? id.replace(groupMatch.match, '') : id
  return {
    id,
    src: '',
    title: humanize(slug),
    group: groupMatch?.label ?? 'Exterior & grounds',
  }
}

function groupOrder(label: string): number {
  return GROUPS.find((entry) => entry.label === label)?.order ?? 0
}

export function groupPhotos(photos: ReferencePhoto[]): ReferencePhotoGroup[] {
  const groups = new Map<string, ReferencePhoto[]>()
  for (const photo of photos) groups.set(photo.group, [...(groups.get(photo.group) ?? []), photo])
  return [...groups.entries()]
    .map(([group, entries]) => ({ group, photos: entries }))
    .sort((a, b) => groupOrder(a.group) - groupOrder(b.group))
}

export const REFERENCE_PHOTOS: ReferencePhoto[] = Object.entries(photoModules)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([path, src]) => ({ ...describePhoto(path), src }))

export const REFERENCE_PHOTO_GROUPS = groupPhotos(REFERENCE_PHOTOS)

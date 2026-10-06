import { describe, expect, it } from 'vitest'
import { REFERENCE_PHOTOS } from '../apps/web/src/reference'
import {
  FIRST_FLOOR_COSTS,
  FLOORS,
  LOOKS,
  LOOK_GROUPS,
  RENDERED_LOOKS,
  RENDER_COUNT,
  ROOMS,
  modelPhoto,
  renderSrc,
  roomsOnFloor,
} from '../apps/web/src/redesigns'

describe('redesign gallery data', () => {
  it('defines 19 rooms across 4 floors, 9 rendered looks and 5 concepts', () => {
    expect(ROOMS).toHaveLength(19)
    expect(LOOKS).toHaveLength(14)
    expect(RENDERED_LOOKS).toHaveLength(9)
    expect(FLOORS).toHaveLength(4)
    expect(RENDER_COUNT).toBe(171)
    expect(roomsOnFloor('first-floor')).toHaveLength(5)
    expect(roomsOnFloor('second-floor')).toHaveLength(5)
    expect(roomsOnFloor('third-floor')).toHaveLength(6)
    expect(roomsOnFloor('penthouse')).toHaveLength(3)
  })

  it('resolves every room/rendered-look pair to a bundled webp render (19 x 9 = 171)', () => {
    let resolved = 0
    for (const room of ROOMS) {
      for (const look of RENDERED_LOOKS) {
        const src = renderSrc(room.floor, room.key, look.key)
        expect(src, `${room.floor}/${room.key}-${look.key}`).toBeTruthy()
        expect(src).toMatch(/\.webp$/)
        resolved += 1
      }
    }
    expect(resolved).toBe(171)
  })

  it('links every photographed room to a bundled model-home photo', () => {
    for (const room of ROOMS) {
      if (!room.photoId) continue
      expect(
        REFERENCE_PHOTOS.some((photo) => photo.id === room.photoId),
        `${room.key} -> ${room.photoId}`,
      ).toBe(true)
      expect(modelPhoto(room)?.src).toMatch(/\.webp$/)
    }
    // Bath #3 is the only room built from the plan alone.
    expect(ROOMS.filter((room) => !room.photoId).map((room) => room.key)).toEqual(['bath'])
  })

  it('keeps looks unique, grouped, and fully storied', () => {
    expect(new Set(LOOKS.map((look) => look.key)).size).toBe(14)
    expect(LOOKS.filter((look) => look.group === 'Modern, budget')).toHaveLength(5)
    expect(LOOKS.filter((look) => look.group === 'Five-star hotel')).toHaveLength(4)
    expect(LOOKS.filter((look) => look.group === 'New directions')).toHaveLength(5)
    expect(LOOK_GROUPS).toHaveLength(3)
    for (const look of LOOKS) {
      expect(look.swatch).toMatch(/^#[0-9a-f]{6}$/i)
      // every look carries its full design narrative for the design-build binder
      for (const field of ['why', 'feel', 'signature', 'build'] as const) {
        expect(look.story[field].length, `${look.key}.story.${field}`).toBeGreaterThan(40)
      }
    }
    // concept looks have no renders yet, by design
    for (const look of LOOKS.filter((entry) => entry.status === 'concept')) {
      expect(renderSrc('first-floor', 'entry', look.key)).toBeUndefined()
    }
  })

  it('ships the first-floor cost table', () => {
    expect(FIRST_FLOOR_COSTS.rows).toHaveLength(8)
    expect(FIRST_FLOOR_COSTS.total.good).toContain('$34-50K')
    expect(FIRST_FLOOR_COSTS.caption).toContain('contractor bids')
  })
})

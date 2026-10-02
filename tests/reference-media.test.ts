import { describe, expect, it } from 'vitest'
import {
  BLUEPRINT_URL,
  REFERENCE_PHOTOS,
  REFERENCE_PHOTO_GROUPS,
  describePhoto,
  groupPhotos,
} from '../apps/web/src/reference'

describe('reference media', () => {
  it('bundles every Crown Georgetown photo with a readable title', () => {
    expect(REFERENCE_PHOTOS.length).toBeGreaterThanOrEqual(27)
    for (const photo of REFERENCE_PHOTOS) {
      expect(photo.src).toMatch(/\.webp$/)
      expect(photo.title).not.toMatch(/-|\.webp/)
    }
  })

  it('derives floor groups and titles from file names', () => {
    expect(describePhoto('x/first-floor-home-office.jpg.webp')).toMatchObject({
      id: 'first-floor-home-office',
      title: 'Home office',
      group: '01 · Ground floor',
    })
    expect(describePhoto('x/outdoor-spiral-staircase.jpg.webp')).toMatchObject({
      title: 'Outdoor spiral staircase',
      group: 'Exterior & grounds',
    })
  })

  it('orders groups from the exterior up through the penthouse', () => {
    const groups = groupPhotos([
      describePhoto('fourth-floor-penthouse-loft.jpg.webp'),
      describePhoto('second-floor-great-room.jpg.webp'),
      describePhoto('city-homes-at-crown.jpg.webp'),
    ]).map((group) => group.group)
    expect(groups).toEqual(['Exterior & grounds', '02 · Main floor', '04 · Penthouse'])
    expect(REFERENCE_PHOTO_GROUPS.map((group) => group.group)).toEqual([
      'Exterior & grounds',
      '01 · Ground floor',
      '02 · Main floor',
      '03 · Upper floor',
      '04 · Penthouse',
    ])
  })

  it('exposes the blueprint PDF', () => {
    expect(BLUEPRINT_URL).toMatch(/cf_city_home_with_georgetown_pkg.*\.pdf$/)
  })
})

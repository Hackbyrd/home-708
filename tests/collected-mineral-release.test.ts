import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildCollectedMineral, releaseErrors } from '../scripts/build-collected-mineral.mjs'

function releaseFixture() {
  const roomIds = [
    ['entry', 'office', 'media', 'gym', 'bath'],
    ['great', 'kitchen', 'dining', 'living', 'sunroom', 'stair2'],
    ['ownerbed', 'retreat', 'ownerbath', 'ownercloset', 'bed2', 'bed3', 'sharedbath', 'laundry', 'stair3'],
    ['loft', 'bed5', 'bath4', 'terrace'],
  ]
  const inventory = {
    items: Array.from({ length: 29 }, (_, index) => ({
      id: `owned-${index + 1}`,
      name: `Owned piece ${index + 1}`,
      quantity: index < 10 ? 2 : 1,
    })),
  }
  let ordinal = 0
  const floors = roomIds.map((ids, floorIndex) => ({
    number: floorIndex + 1,
    id: `floor-${floorIndex + 1}`,
    title: `Floor ${floorIndex + 1}`,
    plan: `collected-mineral-assets/plan-${floorIndex + 1}.webp`,
    rooms: ids.map(id => {
      const cameras = ordinal++ < 21 ? 2 : 1
      const views = Array.from({ length: cameras }, (_, camera) => ({
        code: `${id}-${camera + 1}`,
        jobId: `day-job-${id}-${camera + 1}`,
        src: `collected-mineral-assets/${id}-${camera + 1}-day.webp`,
        evidenceType: 'Source-camera interpretation',
        evidence: 'The room photograph and blueprint control the existing enclosure.',
        qaNote: 'Camera, visible openings and selected furniture reviewed.',
        qa: { approved: true },
      }))
      return {
        id,
        title: id,
        views,
        nights: views.map(day => ({
          ...day,
          code: `${day.code}-night`,
          jobId: `${day.jobId}-night`,
          src: day.src.replace('-day.webp', '-night.webp'),
          sourceCode: day.code,
          sourceJobId: day.jobId,
        })),
        ownedFurniture: id === 'entry' ? inventory.items.map(item => ({
          inventoryId: item.id,
          quantity: item.quantity,
          unitIds: Array.from({ length: item.quantity }, (_, unit) => `${item.id}-unit-${unit + 1}`),
        })) : [],
        newFurniture: [],
      }
    }),
  }))
  return { design: { status: 'complete', floors }, production: { jobs: [] }, inventory }
}

async function temporaryInputs(fixture: ReturnType<typeof releaseFixture>) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'home-708-release-test-'))
  const docs = path.join(root, 'docs')
  await fs.mkdir(docs, { recursive: true })
  await Promise.all([
    ['collected-mineral-design.json', fixture.design],
    ['collected-mineral-production.json', fixture.production],
    ['current-furniture.json', fixture.inventory],
  ].map(([filename, data]) => fs.writeFile(path.join(docs, String(filename)), JSON.stringify(data))))
  return { root, docs }
}

describe('Collected Mineral production release gate', () => {
  it('accepts all 24 spaces, 45 exact day/night pairs and 39 individually allocated units', () => {
    const { design, production, inventory } = releaseFixture()
    expect(releaseErrors(design, production, inventory)).toEqual([])
  })

  it('rejects a night image derived from an earlier day revision, even when both images are approved', () => {
    const { design, production, inventory } = releaseFixture()
    design.floors[0].rooms[0].nights[0].sourceJobId = 'superseded-day-job'
    expect(releaseErrors(design, production, inventory)).toContain('entry/entry-1: night must use this exact approved day job.')
  })

  it('rejects duplicate owned units even when type totals and quantity totals still agree', () => {
    const { design, production, inventory } = releaseFixture()
    const allocations = design.floors[0].rooms[0].ownedFurniture
    allocations[1].unitIds[0] = allocations[0].unitIds[0]
    expect(releaseErrors(design, production, inventory)).toContain('Owned unit owned-1-unit-1 has more than one allocation.')
  })

  it('requires individual IDs rather than accepting quantity totals alone', () => {
    const { design, production, inventory } = releaseFixture()
    design.floors[0].rooms[0].ownedFurniture[0].unitIds = []
    expect(releaseErrors(design, production, inventory)).toContain('owned-1: every owned unit requires a nonempty individual allocation ID.')
  })

  it('rejects a missing room rather than publishing a partial option', () => {
    const { design, production, inventory } = releaseFixture()
    design.floors[3].rooms = design.floors[3].rooms.filter(room => room.id !== 'bath4')
    expect(releaseErrors(design, production, inventory)).toContain('All 24 expected room IDs must occur exactly once.')
  })

  it('does not create public pages for a design still in preparation', async () => {
    const fixture = releaseFixture()
    fixture.design.status = 'in_preparation'
    const { root, docs } = await temporaryInputs(fixture)
    try {
      await expect(buildCollectedMineral({ root })).resolves.toMatchObject({ ready: false })
      await expect(fs.access(path.join(docs, 'collected-mineral.html'))).rejects.toMatchObject({ code: 'ENOENT' })
    } finally {
      await fs.rm(root, { recursive: true, force: true })
    }
  })

  it('rejects missing public media before writing any completed gallery', async () => {
    const fixture = releaseFixture()
    const { root, docs } = await temporaryInputs(fixture)
    try {
      const firstPlan = path.join(docs, fixture.design.floors[0].plan)
      await fs.mkdir(path.dirname(firstPlan), { recursive: true })
      await fs.writeFile(firstPlan, 'fixture blueprint')
      // Inline approvals and correct pairing cannot substitute for an actual shipped image.
      await expect(buildCollectedMineral({ root })).rejects.toMatchObject({ code: 'ENOENT' })
      await expect(fs.access(path.join(docs, 'collected-mineral.html'))).rejects.toMatchObject({ code: 'ENOENT' })
    } finally {
      await fs.rm(root, { recursive: true, force: true })
    }
  })
})

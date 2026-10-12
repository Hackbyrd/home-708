import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { buildCocoaChromeOwned, cocoaChromeReleaseErrors } from '../scripts/build-cocoa-chrome-owned.mjs'

const repo = fileURLToPath(new URL('../', import.meta.url))
const seed = JSON.parse(await fs.readFile(path.join(repo, 'docs/cocoa-chrome-owned-design.json'), 'utf8'))
const owned = JSON.parse(await fs.readFile(path.join(repo, 'docs/current-furniture.json'), 'utf8'))
const pages = ['cocoa-chrome.html', 'cocoa-chrome-overview.html', 'cocoa-chrome-build-book.html', 'cocoa-chrome-furniture.html']

function readyFixture() {
  const design = structuredClone(seed)
  design.status = 'complete'
  for (const room of design.floors.flatMap((floor: any) => floor.rooms)) {
    room.materials = [{ surface: 'Walls', finish: 'Warm taupe paint', substratePreparation: 'Prepare the measured substrate', installation: 'Approve finish sample before painting', sampleApproval: 'Physical sample', care: 'Manufacturer guidance' }]
    room.lighting = { day: 'Daylight and glare control', night: 'Warm separately controlled lights' }
    room.windowTreatment = { recommendation: 'Room-specific privacy treatment', why: 'Protect the measured privacy sightline' }
    room.contractorSequence = ['Measure the existing enclosure', 'Coordinate services before finishes']
    for (const day of room.views) {
      day.jobId = `new-cocoa-day-${room.id}-${day.code}`
      day.qa = { approved: true }
      day.evidenceType ||= 'Photograph and blueprint interpretation'
      day.evidence ||= 'Source enclosure and selected product forms reviewed'
      day.qaNote ||= 'Architecture, furniture and Cocoa & Chrome style approved'
      const night = room.nights.find((view: any) => view.sourceCode === day.code)
      night.sourceJobId = day.jobId
      night.jobId = `${day.jobId}-night`
      night.qa = { approved: true }
      night.evidenceType ||= 'Exact source-camera night interpretation'
      night.evidence ||= 'Same furniture, architecture and closed privacy layers'
      night.qaNote ||= 'Night pair approved'
    }
  }
  return { design, inventory: structuredClone(owned), production: { jobs: [] } }
}

async function inputs(fixture: ReturnType<typeof readyFixture>, includeMedia = false) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'home-708-cocoa-test-'))
  const docs = path.join(root, 'docs')
  await fs.mkdir(docs, { recursive: true })
  await Promise.all([
    ['cocoa-chrome-owned-design.json', fixture.design],
    ['cocoa-chrome-owned-production.json', fixture.production],
    ['current-furniture.json', fixture.inventory],
  ].map(([name, data]) => fs.writeFile(path.join(docs, String(name)), JSON.stringify(data))))
  if (includeMedia) {
    const byId = new Map(fixture.inventory.items.map((item: any) => [item.id, item]))
    const products = fixture.design.floors.flatMap((floor: any) => floor.rooms.flatMap((room: any) => [...room.ownedFurniture.map((item: any) => ({ ...byId.get(item.inventoryId || item.id) as any, ...item })), ...room.newFurniture]))
    const sources: string[] = [...fixture.design.floors.flatMap((floor: any) => [floor.plan, ...floor.rooms.flatMap((room: any) => [...room.views, ...room.nights, ...room.originalPhotos || []].flatMap((view: any) => [view.src, view.thumb]))]), ...products.map((item: any) => item.imageUrl || item.image)].filter((source: string) => Boolean(source) && !/^(?:https?:)?\/\//.test(source))
    for (const source of sources) {
      const file = path.join(docs, source.replace(/^\//, ''))
      await fs.mkdir(path.dirname(file), { recursive: true })
      await fs.writeFile(file, 'public media fixture')
    }
    const scripts = path.join(root, 'scripts/design-library')
    await fs.mkdir(scripts, { recursive: true })
    for (const file of ['house-review.js', 'house-review.css', 'cocoa-chrome-owned.js', 'cocoa-chrome-owned.css', 'collected-mineral.css']) await fs.copyFile(path.join(repo, 'scripts/design-library', file), path.join(scripts, file))
  }
  return { root, docs }
}

describe('Cocoa & Chrome owned-furniture release', () => {
  it('accepts complete new Cocoa cameras, exact night mates and the 39-unit allocation', () => {
    const { design, production, inventory } = readyFixture()
    expect(cocoaChromeReleaseErrors(design, production, inventory)).toEqual([])
  })

  it('rejects a sibling option identity even with valid image and inventory coverage', () => {
    const { design, production, inventory } = readyFixture()
    design.styleId = 'collected-mineral'
    expect(cocoaChromeReleaseErrors(design, production, inventory)).toContain('Option 2 must identify the Cocoa & Chrome style; sibling-option branding is not allowed.')
  })

  it('rejects a walnut/brass style contract rather than silently borrowing Option 1 finishes', () => {
    const { design, production, inventory } = readyFixture()
    design.styleContract.wood = 'walnut'
    design.styleContract.metal = 'aged brass'
    expect(cocoaChromeReleaseErrors(design, production, inventory)).toContain('Cocoa & Chrome requires brown oak and polished stainless steel; a walnut/mineral or alternate metal style contract cannot ship.')
  })

  it('rejects a sibling-option room image even when its job is visually approved', () => {
    const { design, production, inventory } = readyFixture()
    design.floors[0].rooms[0].views[0].src = 'collected-mineral-assets/entry-E1-day.webp'
    expect(cocoaChromeReleaseErrors(design, production, inventory)).toContain('entry/E1: final Option 2 media must use cocoa-chrome-owned-assets, never another option\'s image.')
  })

  it('rejects a night derived from a superseded day job', () => {
    const { design, production, inventory } = readyFixture()
    design.floors[0].rooms[0].nights[0].sourceJobId = 'old-cocoa-day-job'
    expect(cocoaChromeReleaseErrors(design, production, inventory)).toContain('entry/E1: night must use this exact approved day job.')
  })

  it('rejects reusing the day job as its night render or sharing one image between cameras', () => {
    const { design, production, inventory } = readyFixture()
    const room = design.floors[0].rooms[0]
    room.nights[0].jobId = room.views[0].jobId
    room.nights[0].src = room.views[0].src
    expect(cocoaChromeReleaseErrors(design, production, inventory)).toContain(`${room.id}/${room.nights[0].code}: every Cocoa day/night camera requires its own generation job.`)
    expect(cocoaChromeReleaseErrors(design, production, inventory)).toContain(`${room.id}/${room.nights[0].code}: every Cocoa day/night camera requires its own public image.`)
  })

  it('rejects paths that normalize from the Cocoa prefix into a sibling image directory', () => {
    const { design, production, inventory } = readyFixture()
    design.floors[0].rooms[0].views[0].src = 'cocoa-chrome-owned-assets/../collected-mineral-assets/entry-day.webp'
    expect(cocoaChromeReleaseErrors(design, production, inventory)).toContain('entry/E1: the public image path must be normalized within the Cocoa namespace.')
  })

  it('rejects duplicate owned unit IDs despite matching quantities', () => {
    const { design, production, inventory } = readyFixture()
    const allocations = design.floors.flatMap((floor: any) => floor.rooms.flatMap((room: any) => room.ownedFurniture))
    const first = allocations[0].unitIds[0]
    allocations[1].unitIds[0] = first
    expect(cocoaChromeReleaseErrors(design, production, inventory)).toContain(`Owned unit ${first} has more than one allocation.`)
  })

  it('rejects an empty room build specification', () => {
    const { design, production, inventory } = readyFixture()
    design.floors[0].rooms[0].materials = []
    expect(cocoaChromeReleaseErrors(design, production, inventory)).toContain('entry: room-specific material specifications are required for the full build book.')
  })

  it('preserves existing Option 2 pages while its replacement is in preparation', async () => {
    const fixture = readyFixture()
    fixture.design.status = 'in_preparation'
    const { root, docs } = await inputs(fixture)
    try {
      for (const page of pages) await fs.writeFile(path.join(docs, page), `Existing ${page}`)
      await expect(buildCocoaChromeOwned({ root })).resolves.toMatchObject({ ready: false })
      for (const page of pages) expect(await fs.readFile(path.join(docs, page), 'utf8')).toBe(`Existing ${page}`)
    } finally { await fs.rm(root, { recursive: true, force: true }) }
  })

  it('builds from checked-in JSON and public media without ignored generation candidates', async () => {
    const fixture = readyFixture()
    fixture.design.floors[0].rooms[0].supportingTextiles = [{ id: 'entry-test-rug', name: 'Unselected neutral textile study', quantity: 1, ownership: 'new_unselected', price: null, scope: 'Measure first; actual retail SKU and stock remain pending.' }]
    fixture.design.floors[0].rooms[0].buildOuts.push({ name: 'Curved entry cabinet concept', quantity: 1, ownership: 'new_custom', scope: 'Measured contractor quote required.' })
    const { root, docs } = await inputs(fixture, true)
    try {
      await fs.writeFile(path.join(docs, 'house-design-review.html'), 'Protected Option 1')
      await fs.writeFile(path.join(docs, 'collected-mineral.html'), 'Protected Option 3')
      await expect(buildCocoaChromeOwned({ root })).resolves.toMatchObject({ ready: true, roomCount: 24, pairCount: 45, ownedUnits: 39 })
      const gallery = await fs.readFile(path.join(docs, 'cocoa-chrome.html'), 'utf8')
      expect(gallery).toContain('home-708-option-id" content="cocoa-chrome-owned"')
      expect(gallery.match(/role="tab"/g)).toHaveLength(4)
      expect(gallery).toContain('cocoa-chrome-furniture.html')
      expect(gallery).toContain('aria-labelledby="zoom-title" aria-describedby="zoom-hint"')
      expect(gallery).toContain('measureCocoaChromeHeader()')
      const furniture = await fs.readFile(path.join(docs, 'cocoa-chrome-furniture.html'), 'utf8')
      expect(furniture).toContain('OWNED · keep &amp; place'.replace('&amp;', '&'))
      expect(furniture).toContain('New custom &amp; supporting allowances'.replace('&amp;', '&'))
      expect(furniture).toContain('Unselected neutral textile study')
      expect(furniture).toContain('Curved entry cabinet concept')
      expect(furniture).toContain('Prices and stock are unconfirmed.')
      expect(await fs.readFile(path.join(docs, 'cocoa-chrome-build-book.html'), 'utf8')).toContain('Unselected neutral textile study')
      expect(await fs.readFile(path.join(docs, 'house-design-review.html'), 'utf8')).toBe('Protected Option 1')
      expect(await fs.readFile(path.join(docs, 'collected-mineral.html'), 'utf8')).toBe('Protected Option 3')
      await expect(fs.access(path.join(root, 'assets/render-candidates'))).rejects.toMatchObject({ code: 'ENOENT' })
    } finally { await fs.rm(root, { recursive: true, force: true }) }
  })

  it('rejects missing public images before replacing the legacy gallery', async () => {
    const { root, docs } = await inputs(readyFixture())
    try {
      await fs.writeFile(path.join(docs, 'cocoa-chrome.html'), 'Existing complete gallery')
      await expect(buildCocoaChromeOwned({ root })).rejects.toMatchObject({ code: 'ENOENT' })
      expect(await fs.readFile(path.join(docs, 'cocoa-chrome.html'), 'utf8')).toBe('Existing complete gallery')
    } finally { await fs.rm(root, { recursive: true, force: true }) }
  })

  it('rejects a missing local catalogue photograph before publishing a furniture page', async () => {
    const fixture = readyFixture()
    fixture.design.floors[0].rooms[0].newFurniture.push({ id: 'missing-photo-study', name: 'Photo completeness study', quantity: 1, imageUrl: 'cocoa-chrome-owned-assets/products/required-photo.webp' })
    const { root, docs } = await inputs(fixture, true)
    try {
      await fs.unlink(path.join(docs, 'cocoa-chrome-owned-assets/products/required-photo.webp'))
      await fs.writeFile(path.join(docs, 'cocoa-chrome.html'), 'Existing complete gallery')
      await expect(buildCocoaChromeOwned({ root })).rejects.toMatchObject({ code: 'ENOENT' })
      expect(await fs.readFile(path.join(docs, 'cocoa-chrome.html'), 'utf8')).toBe('Existing complete gallery')
      await expect(fs.access(path.join(docs, 'cocoa-chrome-furniture.html'))).rejects.toMatchObject({ code: 'ENOENT' })
    } finally { await fs.rm(root, { recursive: true, force: true }) }
  })
})

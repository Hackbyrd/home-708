import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { distinctNewFurniture, expandMaterialSpecifications, mergeCocoaRoomSpecifications, publicReviewNote, reviewedCameraSelections, syncCocoaChromeOwned } from '../scripts/sync-cocoa-chrome-owned.mjs'

const repo = fileURLToPath(new URL('../', import.meta.url))
const seed = JSON.parse(await fs.readFile(path.join(repo, 'docs/cocoa-chrome-owned-design.json'), 'utf8'))
const specs = JSON.parse(await fs.readFile(path.join(repo, 'docs/cocoa-chrome-owned-build-specs.json'), 'utf8'))
const inventory = JSON.parse(await fs.readFile(path.join(repo, 'docs/current-furniture.json'), 'utf8'))
const day = { room: 'sunroom', code: 'S1', job_id: 'reviewed-new-cocoa-day', index: 1003, file: 'assets/render-candidates/cocoa-chrome-owned/r08/day.png', qa: { approved: true }, qaNote: 'Source camera, owned set and Cocoa palette reviewed.' }
const night = { room: 'sunroom', sourceCode: 'S1', sourceJobId: day.job_id, job_id: 'reviewed-new-cocoa-night', index: 2003, file: 'assets/render-candidates/cocoa-chrome-owned/r08/night.png', qa: { approved: true }, qaNote: 'Exact day camera/furniture and closed privacy layers reviewed.' }

async function inputs(nightRecords: any[] = [night]) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'home-708-cocoa-sync-'))
  await fs.mkdir(path.join(root, 'docs'), { recursive: true })
  const raw = path.join(root, 'assets/render-candidates/cocoa-chrome-owned/r08')
  await fs.mkdir(raw, { recursive: true })
  await fs.writeFile(path.join(root, 'docs/cocoa-chrome-owned-design.json'), JSON.stringify(seed))
  await fs.writeFile(path.join(root, 'docs/cocoa-chrome-owned-build-specs.json'), JSON.stringify(specs))
  await fs.writeFile(path.join(root, 'docs/current-furniture.json'), JSON.stringify(inventory))
  await fs.writeFile(path.join(raw, 'approved-days.json'), JSON.stringify([day, { ...day, code: 'S2', file: 'unreviewed-and-missing.png', qa: { approved: false } }]))
  await fs.writeFile(path.join(raw, 'approved-nights.json'), JSON.stringify(nightRecords))
  for (const file of ['day.png', 'night.png']) await sharp({ create: { width: 1600, height: 1066, channels: 3, background: '#c7beb2' } }).png().toFile(path.join(raw, file))
  return root
}

describe('Cocoa & Chrome reviewed-data sync', () => {
  it('expands finish references into usable contractor fields without inventing a chosen SKU', () => {
    const result = expandMaterialSpecifications(specs.rooms.office, specs.finishSchema)
    const wall = result.find((item: any) => item.finishId === 'CC-W1')
    expect(wall).toMatchObject({ surface: 'General dry walls', finish: specs.finishSchema['CC-W1'].appearance, substratePreparation: specs.finishSchema['CC-W1'].substrate, installation: specs.finishSchema['CC-W1'].approach })
    expect(wall.care).toContain('selected manufacturer')
    expect(wall.installation).toContain('competing large-board color candidates')
  })

  it('rejects unknown finish references and sibling-option build data', () => {
    expect(() => expandMaterialSpecifications({ finishRefs: ['MW-unknown'] }, specs.finishSchema)).toThrow('Unknown Cocoa & Chrome finish reference')
    expect(() => mergeCocoaRoomSpecifications(seed, { ...specs, optionId: 'collected-mineral' })).toThrow('Only the Cocoa & Chrome finish schema')
    expect(() => mergeCocoaRoomSpecifications(seed, specs, null, { designOption: { id: 'collected-mineral' }, rooms: [] })).toThrow('A sibling option purchase brief')
  })

  it('preserves all owned allocations while merging room specs and explicit new items', () => {
    const modifiedSpecs = structuredClone(specs)
    modifiedSpecs.rooms.sunroom.ownedAllocations = [{ inventoryId: 'wrong', quantity: 100 }]
    const social = { optionId: 'cocoa-chrome', supportingTextiles: [{ id: 'office-rug-concept', room: 'office', name: 'Ivory low-pile rug', ownership: 'new_unselected', stockStatus: 'unselected_no_stock_claim', price: null }], rooms: { office: { designIntent: 'New Cocoa office intent', newFurniture: [{ id: 'desk-new', name: 'Selected desk', quantity: 1 }] }, sunroom: { newFurniture: [] } } }
    const merged = mergeCocoaRoomSpecifications(seed, modifiedSpecs, social)
    const before = seed.floors.flatMap((floor: any) => floor.rooms).map((room: any) => room.ownedFurniture)
    const after = merged.floors.flatMap((floor: any) => floor.rooms).map((room: any) => room.ownedFurniture)
    expect(after).toEqual(before)
    const office = merged.floors[0].rooms.find((room: any) => room.id === 'office')
    expect(office.intent).toBe('New Cocoa office intent')
    expect(office.newFurniture).toHaveLength(1)
    expect(office.supportingTextiles).toEqual(expect.arrayContaining(social.supportingTextiles))
    expect(office.windowTreatment.recommendation).toContain('every upper and lower sash')
    expect(office.contractorSequence.length).toBeGreaterThan(0)
  })

  it('does not add duplicate product quantities from differently named companion records', () => {
    const common = { name: 'Same configured chair', url: 'https://supplier.example/chair', finish: 'Brown oak', fabric: 'White', size: '22-inch' }
    const result = distinctNewFurniture([[{ ...common, id: 'private-chair', quantity: 2 }], [{ ...common, id: 'social-chair', quantity: 4 }]])
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ id: 'social-chair', quantity: 4 })
    expect(() => distinctNewFurniture([[{ ...common, ownership: 'owned', quantity: 4 }]])).toThrow('Owned furniture cannot')
  })

  it('accepts per-room private newItems without replacing rich GC materials or owned units', () => {
    const privateSpecs = { rooms: [{ id: 'bed3', ownedItems: [{ inventoryId: 'wrong-allocation', unitIds: ['wrong-1'] }], materials: { dryFloor: 'Generic shared recipe must not replace room-specific GC fields' }, windowTreatment: { day: 'Three real window groups with separate blackout layers.', night: 'Close the real exterior openings only.' }, newItems: [{ id: 'new-bed', name: 'Gather Queen', quantity: 1, currentPrice: { amount: 1399.91, kind: 'clearance', checkedAt: '2026-10-12', finalSale: true }, imageFile: 'docs/cocoa-chrome-owned-assets/products/private-gather.jpg', availability: { status: 'stocked_fabric_delivery_pending' } }] }] }
    const result = mergeCocoaRoomSpecifications(seed, specs, null, privateSpecs)
    const room = result.floors[2].rooms.find((item: any) => item.id === 'bed3')
    const original = seed.floors[2].rooms.find((item: any) => item.id === 'bed3')
    expect(room.ownedFurniture).toEqual(original.ownedFurniture)
    expect(room.materials).toEqual(expandMaterialSpecifications(specs.rooms.bed3, specs.finishSchema))
    expect(room.materials.every((item: any) => item.substratePreparation && item.installation && item.sampleApproval)).toBe(true)
    expect(room.windowTreatment.day).toBe(privateSpecs.rooms[0].windowTreatment.day)
    expect(room.newFurniture[0]).toMatchObject({ quantity: 1, imageUrl: 'cocoa-chrome-owned-assets/products/private-gather.jpg', unitPrice: { low: 1399.91, high: 1399.91, kind: 'clearance', checkedAt: '2026-10-12' } })
    expect(room.newFurniture[0].purchaseNotes.join(' ')).toContain('final sale')
  })

  it('rejects stale night provenance before importing it', () => {
    expect(() => reviewedCameraSelections(seed, [day], [{ ...night, sourceJobId: 'prior-day-job' }])).toThrow('Stale or missing night source')
    expect(() => reviewedCameraSelections(seed, [day], [{ ...night, sourceJobId: undefined }])).toThrow('Stale or missing night source')
  })

  it('uses the latest approved night record before checking its exact day provenance', () => {
    const selected = reviewedCameraSelections(seed, [day], [{ ...night, sourceJobId: 'superseded-day', job_id: 'superseded-night' }, night])
    expect(selected.nightMap.get('sunroom/S1').job_id).toBe(night.job_id)
  })

  it('keeps public QA qualifications readable instead of copying production shorthand', () => {
    expect(publicReviewNote({ qaNote: 'Sourcefireplace/highwindows held; TWOnewWHITEEmerytrack-arm.' }, { title: 'Great room' })).toContain('Great room: the source camera')
    expect(publicReviewNote({ qaNote: 'Actual camera and fixture locations retained; measured fit still requires verification.' }, { title: 'Great room' })).toBe('Actual camera and fixture locations retained; measured fit still requires verification.')
  })

  it('publishes only reviewed own-namespace media and keeps incomplete coverage in preparation', async () => {
    const root = await inputs()
    try {
      await expect(syncCocoaChromeOwned({ root })).resolves.toMatchObject({ status: 'in_preparation', approvedDays: 1, approvedNights: 1, rooms: 24 })
      const design = JSON.parse(await fs.readFile(path.join(root, 'docs/cocoa-chrome-owned-design.json'), 'utf8'))
      const room = design.floors[1].rooms.find((room: any) => room.id === 'sunroom')
      expect(room.views[0]).toMatchObject({ jobId: day.job_id, qa: { approved: true }, geometrySource: seed.floors[1].rooms.find((room: any) => room.id === 'sunroom').views[0].geometrySource })
      expect(room.nights[0].sourceJobId).toBe(day.job_id)
      await expect(fs.access(path.join(root, 'docs/cocoa-chrome-owned-assets/sunroom-S1-r08-day.webp'))).resolves.toBeUndefined()
      await expect(fs.access(path.join(root, 'docs/cocoa-chrome-owned-assets/sunroom-S2-r08-day.webp'))).rejects.toMatchObject({ code: 'ENOENT' })
      expect(design.floors.flatMap((floor: any) => floor.rooms).map((room: any) => room.ownedFurniture)).toEqual(seed.floors.flatMap((floor: any) => floor.rooms).map((room: any) => room.ownedFurniture))
      expect(design.status).toBe('in_preparation')
    } finally { await fs.rm(root, { recursive: true, force: true }) }
  })

  it('leaves the seed and canonical assets untouched when a stale night is supplied', async () => {
    const root = await inputs([{ ...night, sourceJobId: 'old-day' }])
    try {
      const file = path.join(root, 'docs/cocoa-chrome-owned-design.json')
      const before = await fs.readFile(file, 'utf8')
      await expect(syncCocoaChromeOwned({ root })).rejects.toThrow('Stale or missing night source')
      expect(await fs.readFile(file, 'utf8')).toBe(before)
      await expect(fs.access(path.join(root, 'docs/cocoa-chrome-owned-assets/sunroom-S1-r08-day.webp'))).rejects.toMatchObject({ code: 'ENOENT' })
    } finally { await fs.rm(root, { recursive: true, force: true }) }
  })
})

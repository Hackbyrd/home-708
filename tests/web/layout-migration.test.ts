import { describe, expect, it } from 'vitest'
import { emptyLayout, parseLocalLayout } from '../../apps/web/src/stores'

describe('local layout migration', () => {
  it('normalizes incomplete legacy documents to v2', () => {
    const result = parseLocalLayout(JSON.stringify({
      name: 'Legacy draft',
      edits: { sofa: { x: 4, z: 8 } },
    }))

    expect(result).toEqual({
      version: 2,
      name: 'Legacy draft',
      edits: { sofa: { x: 4, z: 8 } },
      added: [],
      rooms: {},
      walls: {},
    })
  })

  it('rejects corrupt local data', () => {
    expect(parseLocalLayout('{nope')).toBeNull()
    expect(parseLocalLayout(null)).toBeNull()
  })

  it('creates isolated empty layouts', () => {
    const first = emptyLayout()
    const second = emptyLayout()
    first.edits.changed = {}
    expect(second.edits).toEqual({})
  })
})

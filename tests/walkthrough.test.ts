import { describe, expect, it } from 'vitest'
import { formatDuration, resolveWalkthrough } from '../apps/web/src/walkthrough'

describe('walkthrough video configuration', () => {
  it('prefers the hosted address and ignores the local file in production', () => {
    const video = resolveWalkthrough({ src: 'https://cdn.example/house.mp4', localFile: 'house-walkthrough.MP4' }, false)
    expect(video.src).toBe('https://cdn.example/house.mp4')
    expect(video.available).toBe(true)
  })

  it('streams the local footage only on the development server', () => {
    const config = { src: '', embed: '', localFile: 'house walkthrough.MP4' }
    expect(resolveWalkthrough(config, true).src).toBe('/footage/house%20walkthrough.MP4')
    const production = resolveWalkthrough(config, false)
    expect(production.src).toBe('')
    expect(production.available).toBe(false)
  })

  it('falls back to an embedded player page when no direct file is hosted', () => {
    const video = resolveWalkthrough({ src: '', embed: 'https://www.youtube.com/embed/abc', localFile: '' }, false)
    expect(video.embed).toBe('https://www.youtube.com/embed/abc')
    expect(video.available).toBe(true)
    expect(resolveWalkthrough({ src: 'https://cdn.example/a.mp4', embed: 'https://www.youtube.com/embed/abc' }, false).embed).toBe('')
  })

  it('labels the running time in minutes', () => {
    expect(formatDuration(1129)).toBe('19 min')
    expect(formatDuration(40)).toBe('40 sec')
    expect(formatDuration(0)).toBe('')
  })
})

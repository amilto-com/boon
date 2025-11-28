import { describe, expect, it } from 'vitest'
import { decodeStreamSync, encode } from '../src'

describe('decodeStreamSync', () => {
  it('streams header event', () => {
    const encoded = encode({ test: true })
    const events = Array.from(decodeStreamSync(encoded))

    expect(events[0]).toEqual({ type: 'header', version: 1 })
  })

  it('streams primitive null', () => {
    const encoded = encode(null)
    const events = Array.from(decodeStreamSync(encoded))

    expect(events).toContainEqual({ type: 'primitive', value: null })
  })

  it('streams primitive string', () => {
    const encoded = encode('hello')
    const events = Array.from(decodeStreamSync(encoded))

    expect(events).toContainEqual({ type: 'primitive', value: 'hello' })
  })

  it('streams primitive number', () => {
    const encoded = encode(42)
    const events = Array.from(decodeStreamSync(encoded))

    expect(events).toContainEqual({ type: 'primitive', value: 42 })
  })

  it('streams object events', () => {
    const encoded = encode({ name: 'Alice', age: 30 })
    const events = Array.from(decodeStreamSync(encoded))

    expect(events).toEqual([
      { type: 'header', version: 1 },
      { type: 'startObject', keyCount: 2 },
      { type: 'key', key: 'name' },
      { type: 'primitive', value: 'Alice' },
      { type: 'key', key: 'age' },
      { type: 'primitive', value: 30 },
      { type: 'endObject' },
    ])
  })

  it('streams array events', () => {
    const encoded = encode([1, 2, 3])
    const events = Array.from(decodeStreamSync(encoded))

    expect(events).toEqual([
      { type: 'header', version: 1 },
      { type: 'startArray', length: 3 },
      { type: 'primitive', value: 1 },
      { type: 'primitive', value: 2 },
      { type: 'primitive', value: 3 },
      { type: 'endArray' },
    ])
  })

  it('streams nested object events', () => {
    const encoded = encode({ outer: { inner: 'value' } })
    const events = Array.from(decodeStreamSync(encoded))

    expect(events).toEqual([
      { type: 'header', version: 1 },
      { type: 'startObject', keyCount: 1 },
      { type: 'key', key: 'outer' },
      { type: 'startObject', keyCount: 1 },
      { type: 'key', key: 'inner' },
      { type: 'primitive', value: 'value' },
      { type: 'endObject' },
      { type: 'endObject' },
    ])
  })

  it('streams array of objects events', () => {
    const encoded = encode([{ id: 1 }, { id: 2 }])
    const events = Array.from(decodeStreamSync(encoded))

    expect(events).toEqual([
      { type: 'header', version: 1 },
      { type: 'startArray', length: 2 },
      { type: 'startObject', keyCount: 1 },
      { type: 'key', key: 'id' },
      { type: 'primitive', value: 1 },
      { type: 'endObject' },
      { type: 'startObject', keyCount: 1 },
      { type: 'key', key: 'id' },
      { type: 'primitive', value: 2 },
      { type: 'endObject' },
      { type: 'endArray' },
    ])
  })

  it('streams without header when expectHeader is false', () => {
    const encoded = encode({ test: true }, { includeHeader: false })
    const events = Array.from(decodeStreamSync(encoded, { expectHeader: false }))

    expect(events[0]).toEqual({ type: 'startObject', keyCount: 1 })
  })
})

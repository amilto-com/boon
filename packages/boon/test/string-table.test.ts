import { describe, expect, it } from 'vitest'
import { decode, encode } from '../src/index'

describe('string Table Optimization', () => {
  it('should roundtrip correctly with string table enabled', () => {
    const data = {
      users: [
        { id: 1, name: 'Alice', email: 'alice@example.com', active: true },
        { id: 2, name: 'Bob', email: 'bob@example.com', active: false },
        { id: 3, name: 'Charlie', email: 'charlie@example.com', active: true },
      ],
    }

    const encoded = encode(data, { useStringTable: true })
    const decoded = decode(encoded)

    expect(decoded).toEqual(data)
  })

  it('should reduce size for repetitive data', () => {
    const data = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      name: `User${i}`,
      email: `user${i}@example.com`,
      role: 'member',
    }))

    const standard = encode(data, { useStringTable: false })
    const optimized = encode(data, { useStringTable: true })

    // String table should be significantly smaller
    expect(optimized.byteLength).toBeLessThan(standard.byteLength)

    // Should save at least 5% (less than before due to common keys dict reducing baseline)
    const reduction = (standard.byteLength - optimized.byteLength) / standard.byteLength
    expect(reduction).toBeGreaterThan(0.05)
  })

  it('should decode both formats correctly', () => {
    const data = { a: 1, b: 2, c: 3 }

    const standard = encode(data, { useStringTable: false })
    const optimized = encode(data, { useStringTable: true })

    expect(decode(standard)).toEqual(data)
    expect(decode(optimized)).toEqual(data)
  })

  it('should handle nested structures with string table', () => {
    const data = {
      config: {
        theme: 'dark',
        language: 'en',
        notifications: true,
      },
      users: [
        { theme: 'dark', language: 'en' },
        { theme: 'light', language: 'fr' },
      ],
    }

    const encoded = encode(data, { useStringTable: true })
    const decoded = decode(encoded)

    expect(decoded).toEqual(data)
  })

  it('should work without header', () => {
    const data = { test: 'value', foo: 'bar' }

    const encoded = encode(data, { useStringTable: true, includeHeader: false })
    const decoded = decode(encoded, { expectHeader: false })

    expect(decoded).toEqual(data)
  })
})

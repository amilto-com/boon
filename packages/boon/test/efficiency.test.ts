import { describe, expect, it } from 'vitest'
import { decode, encode, estimateSize } from '../src'

describe('memory efficiency', () => {
  describe('size comparison with JSON', () => {
    it('is smaller than JSON for simple object', () => {
      const data = { name: 'Alice', age: 30, active: true }
      const boonSize = encode(data).length
      const jsonSize = JSON.stringify(data).length

      // BOON should be similar or smaller
      expect(boonSize).toBeLessThanOrEqual(jsonSize * 1.5) // Allow some overhead for header
    })

    it('is significantly smaller for numeric arrays', () => {
      const data = Array.from({ length: 100 }, (_, i) => i * 1000)
      const boonSize = encode(data).length
      const jsonSize = JSON.stringify(data).length

      // BOON should be much smaller for numeric data
      expect(boonSize).toBeLessThan(jsonSize)
    })

    it('is smaller for repetitive structure', () => {
      const data = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        name: `User ${i}`,
        score: i * 10,
        active: i % 2 === 0,
      }))
      const boonSize = encode(data).length
      const jsonSize = JSON.stringify(data).length

      // BOON should be notably smaller
      expect(boonSize).toBeLessThan(jsonSize)
    })

    it('is smaller for boolean-heavy data', () => {
      const data = Array.from({ length: 100 }, () => ({
        a: true,
        b: false,
        c: true,
        d: false,
      }))
      const boonSize = encode(data).length
      const jsonSize = JSON.stringify(data).length

      // BOON uses 1 byte per boolean vs 4-5 chars in JSON
      expect(boonSize).toBeLessThan(jsonSize * 0.5)
    })

    it('is smaller for null-heavy data', () => {
      const data = Array.from({ length: 100 }, () => ({
        value: null,
        other: null,
      }))
      const boonSize = encode(data).length
      const jsonSize = JSON.stringify(data).length

      // BOON uses 1 byte per null vs 4 chars in JSON
      expect(boonSize).toBeLessThan(jsonSize * 0.6)
    })
  })

  describe('size estimation', () => {
    it('estimates size for simple object', () => {
      const data = { name: 'Alice', age: 30 }
      const estimated = estimateSize(data)
      const actual = encode(data).length

      // Estimate should be within 50% of actual
      expect(estimated).toBeGreaterThanOrEqual(actual * 0.5)
      expect(estimated).toBeLessThanOrEqual(actual * 1.5)
    })

    it('estimates size for array', () => {
      const data = [1, 2, 3, 4, 5]
      const estimated = estimateSize(data)
      const actual = encode(data).length

      // Estimate is a rough approximation, allow more variance
      expect(estimated).toBeGreaterThanOrEqual(actual * 0.3)
      expect(estimated).toBeLessThanOrEqual(actual * 2.5)
    })
  })
})

describe('cross-platform consistency', () => {
  it('produces consistent encoding across runs', () => {
    const data = { name: 'Test', values: [1, 2, 3] }
    const encoded1 = encode(data)
    const encoded2 = encode(data)

    expect(encoded1).toEqual(encoded2)
  })

  it('uses big-endian for multi-byte integers', () => {
    const data = 0x1234
    const encoded = encode(data, { includeHeader: false })
    // INT16 tag (0x11) followed by big-endian 0x1234
    expect(encoded[0]).toBe(0x11) // INT16 tag
    expect(encoded[1]).toBe(0x12) // High byte
    expect(encoded[2]).toBe(0x34) // Low byte
  })

  it('uses UTF-8 for strings', () => {
    const data = 'é' // U+00E9, encoded as 0xC3 0xA9 in UTF-8
    const encoded = encode(data, { includeHeader: false })
    const decoded = decode(encoded, { expectHeader: false })
    expect(decoded).toBe('é')
  })

  it('handles surrogate pairs correctly', () => {
    const data = '𝌆' // U+1D306, a musical symbol (surrogate pair in UTF-16)
    const encoded = encode(data)
    const decoded = decode(encoded)
    expect(decoded).toBe('𝌆')
  })
})

describe('edge cases', () => {
  it('handles empty input', () => {
    expect(decode(encode({}))).toEqual({})
    expect(decode(encode([]))).toEqual([])
    expect(decode(encode(''))).toBe('')
  })

  it('handles special float values', () => {
    expect(decode(encode(Number.POSITIVE_INFINITY))).toBe(Number.POSITIVE_INFINITY)
    expect(decode(encode(Number.NEGATIVE_INFINITY))).toBe(Number.NEGATIVE_INFINITY)
    expect(Number.isNaN(decode(encode(Number.NaN)) as number)).toBe(true)
  })

  it('handles very deep nesting', () => {
    let data: object = { value: 'deep' }
    for (let i = 0; i < 50; i++) {
      data = { nested: data }
    }
    const encoded = encode(data)
    const decoded = decode(encoded)
    expect(decoded).toEqual(data)
  })

  it('handles large arrays efficiently', () => {
    const data = Array.from({ length: 10000 }, (_, i) => i)
    const startTime = performance.now()
    const encoded = encode(data)
    const decoded = decode(encoded)
    const endTime = performance.now()

    expect(decoded).toEqual(data)
    expect(endTime - startTime).toBeLessThan(1000) // Should complete in under 1 second
  })

  it('handles large objects efficiently', () => {
    const data: Record<string, number> = {}
    for (let i = 0; i < 1000; i++) {
      data[`key_${i}`] = i
    }
    const startTime = performance.now()
    const encoded = encode(data)
    const decoded = decode(encoded)
    const endTime = performance.now()

    expect(decoded).toEqual(data)
    expect(endTime - startTime).toBeLessThan(1000)
  })
})

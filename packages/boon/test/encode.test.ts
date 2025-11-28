import { describe, expect, it } from 'vitest'
import { decode, encode, FORMAT_VERSION, MAGIC_NUMBER } from '../src'

describe('encode', () => {
  describe('primitives', () => {
    it('encodes null', () => {
      const encoded = encode(null)
      expect(decode(encoded)).toBe(null)
    })

    it('encodes undefined as null', () => {
      const encoded = encode(undefined)
      expect(decode(encoded)).toBe(null)
    })

    it('encodes true', () => {
      const encoded = encode(true)
      expect(decode(encoded)).toBe(true)
    })

    it('encodes false', () => {
      const encoded = encode(false)
      expect(decode(encoded)).toBe(false)
    })

    it('encodes empty string', () => {
      const encoded = encode('')
      expect(decode(encoded)).toBe('')
    })

    it('encodes short string', () => {
      const encoded = encode('hello')
      expect(decode(encoded)).toBe('hello')
    })

    it('encodes unicode string', () => {
      const encoded = encode('こんにちは')
      expect(decode(encoded)).toBe('こんにちは')
    })

    it('encodes emoji string', () => {
      const encoded = encode('Hello 👋 World 🌍')
      expect(decode(encoded)).toBe('Hello 👋 World 🌍')
    })

    it('encodes long string', () => {
      const longString = 'a'.repeat(1000)
      const encoded = encode(longString)
      expect(decode(encoded)).toBe(longString)
    })

    it('encodes zero', () => {
      const encoded = encode(0)
      expect(decode(encoded)).toBe(0)
    })

    it('encodes small positive integer', () => {
      const encoded = encode(42)
      expect(decode(encoded)).toBe(42)
    })

    it('encodes small negative integer', () => {
      const encoded = encode(-42)
      expect(decode(encoded)).toBe(-42)
    })

    it('encodes int16 range', () => {
      const encoded = encode(1000)
      expect(decode(encoded)).toBe(1000)
    })

    it('encodes int32 range', () => {
      const encoded = encode(100000)
      expect(decode(encoded)).toBe(100000)
    })

    it('encodes large integer', () => {
      const encoded = encode(2147483647) // INT32_MAX
      expect(decode(encoded)).toBe(2147483647)
    })

    it('encodes float', () => {
      const encoded = encode(3.14159)
      expect(decode(encoded)).toBeCloseTo(3.14159, 5)
    })

    it('encodes negative float', () => {
      const encoded = encode(-123.456)
      expect(decode(encoded)).toBeCloseTo(-123.456, 5)
    })

    it('encodes very small float', () => {
      const encoded = encode(0.000001)
      expect(decode(encoded)).toBeCloseTo(0.000001, 10)
    })

    it('encodes Infinity', () => {
      const encoded = encode(Number.POSITIVE_INFINITY)
      expect(decode(encoded)).toBe(Number.POSITIVE_INFINITY)
    })

    it('encodes negative Infinity', () => {
      const encoded = encode(Number.NEGATIVE_INFINITY)
      expect(decode(encoded)).toBe(Number.NEGATIVE_INFINITY)
    })
  })

  describe('arrays', () => {
    it('encodes empty array', () => {
      const encoded = encode([])
      expect(decode(encoded)).toEqual([])
    })

    it('encodes single element array', () => {
      const encoded = encode([1])
      expect(decode(encoded)).toEqual([1])
    })

    it('encodes array of primitives', () => {
      const encoded = encode([1, 'two', true, null])
      expect(decode(encoded)).toEqual([1, 'two', true, null])
    })

    it('encodes array of 15 items (tiny)', () => {
      const arr = Array.from({ length: 15 }, (_, i) => i)
      const encoded = encode(arr)
      expect(decode(encoded)).toEqual(arr)
    })

    it('encodes array of 100 items (short)', () => {
      const arr = Array.from({ length: 100 }, (_, i) => i)
      const encoded = encode(arr)
      expect(decode(encoded)).toEqual(arr)
    })

    it('encodes array of 300 items (medium)', () => {
      const arr = Array.from({ length: 300 }, (_, i) => i)
      const encoded = encode(arr)
      expect(decode(encoded)).toEqual(arr)
    })

    it('encodes nested arrays', () => {
      const encoded = encode([[1, 2], [3, 4], [5, 6]])
      expect(decode(encoded)).toEqual([[1, 2], [3, 4], [5, 6]])
    })

    it('encodes deeply nested arrays', () => {
      const encoded = encode([[[1, 2], [3, 4]], [[5, 6], [7, 8]]])
      expect(decode(encoded)).toEqual([[[1, 2], [3, 4]], [[5, 6], [7, 8]]])
    })
  })

  describe('objects', () => {
    it('encodes empty object', () => {
      const encoded = encode({})
      expect(decode(encoded)).toEqual({})
    })

    it('encodes single key object', () => {
      const encoded = encode({ name: 'Alice' })
      expect(decode(encoded)).toEqual({ name: 'Alice' })
    })

    it('encodes object with multiple primitive values', () => {
      const obj = { name: 'Alice', age: 30, active: true }
      const encoded = encode(obj)
      expect(decode(encoded)).toEqual(obj)
    })

    it('encodes object with 15 keys (tiny)', () => {
      const obj: Record<string, number> = {}
      for (let i = 0; i < 15; i++) {
        obj[`key${i}`] = i
      }
      const encoded = encode(obj)
      expect(decode(encoded)).toEqual(obj)
    })

    it('encodes object with 100 keys (short)', () => {
      const obj: Record<string, number> = {}
      for (let i = 0; i < 100; i++) {
        obj[`key${i}`] = i
      }
      const encoded = encode(obj)
      expect(decode(encoded)).toEqual(obj)
    })

    it('encodes nested objects', () => {
      const obj = {
        user: {
          name: 'Alice',
          address: {
            city: 'Wonderland',
            zip: '12345',
          },
        },
      }
      const encoded = encode(obj)
      expect(decode(encoded)).toEqual(obj)
    })

    it('encodes object with array values', () => {
      const obj = {
        name: 'Alice',
        scores: [95, 87, 92],
        tags: ['developer', 'ai'],
      }
      const encoded = encode(obj)
      expect(decode(encoded)).toEqual(obj)
    })

    it('encodes object with unicode keys', () => {
      const obj = { 日本語: 'Japanese', émoji: '🎉' }
      const encoded = encode(obj)
      expect(decode(encoded)).toEqual(obj)
    })

    it('strips undefined values', () => {
      const obj = { name: 'Alice', age: undefined, active: true }
      const encoded = encode(obj)
      expect(decode(encoded)).toEqual({ name: 'Alice', active: true })
    })
  })

  describe('complex structures', () => {
    it('encodes array of objects', () => {
      const data = [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
        { id: 3, name: 'Charlie' },
      ]
      const encoded = encode(data)
      expect(decode(encoded)).toEqual(data)
    })

    it('encodes deeply nested structure', () => {
      const data = {
        level1: {
          level2: {
            level3: {
              level4: {
                value: 'deep',
              },
            },
          },
        },
      }
      const encoded = encode(data)
      expect(decode(encoded)).toEqual(data)
    })

    it('encodes mixed complex structure', () => {
      const data = {
        users: [
          { id: 1, name: 'Alice', roles: ['admin', 'user'] },
          { id: 2, name: 'Bob', roles: ['user'] },
        ],
        metadata: {
          version: '1.0',
          count: 2,
        },
        tags: ['important', 'urgent'],
      }
      const encoded = encode(data)
      expect(decode(encoded)).toEqual(data)
    })
  })

  describe('header', () => {
    it('includes header by default', () => {
      const encoded = encode({ test: true })
      // Check magic number "BOON"
      expect(encoded[0]).toBe(0x42) // 'B'
      expect(encoded[1]).toBe(0x4F) // 'O'
      expect(encoded[2]).toBe(0x4F) // 'O'
      expect(encoded[3]).toBe(0x4E) // 'N'
      // Check version
      expect(encoded[4]).toBe(FORMAT_VERSION)
    })

    it('can exclude header', () => {
      const encoded = encode({ test: true }, { includeHeader: false })
      // First byte should be object type tag, not 'B'
      expect(encoded[0]).not.toBe(0x42)
    })

    it('round-trips without header', () => {
      const data = { name: 'Alice', age: 30 }
      const encoded = encode(data, { includeHeader: false })
      const decoded = decode(encoded, { expectHeader: false })
      expect(decoded).toEqual(data)
    })
  })
})

describe('decode', () => {
  describe('error handling', () => {
    it('throws on invalid magic number', () => {
      const invalidData = new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x01])
      expect(() => decode(invalidData)).toThrow('Invalid BOON magic number')
    })

    it('throws on unsupported version', () => {
      const futureVersion = new Uint8Array([...MAGIC_NUMBER, 255])
      expect(() => decode(futureVersion)).toThrow('Unsupported BOON version')
    })

    it('throws on buffer underflow', () => {
      // Valid header but truncated data
      const truncated = new Uint8Array([...MAGIC_NUMBER, FORMAT_VERSION])
      expect(() => decode(truncated)).toThrow()
    })
  })
})

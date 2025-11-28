/**
 * BOON v2 Test Suite
 *
 * TDD-driven tests based on specs/boon-v2.spec.md
 * Tests written BEFORE implementation.
 */

import { describe, expect, it } from 'vitest'

// Import from v2 module
import {
  InvalidMagicError,
  TAG,
  TruncatedDataError,
  UnexpectedBreakError,
  UnknownTagError,
  UnsupportedVersionError,
  decode,
  encode,
} from '../src/v2'

// Test helpers
const HEADER = new Uint8Array([0x42, 0x4F, 0x4F, 0x4E, 0x01]) // "BOON" + version 1

function withHeader(...bytes: number[]): Uint8Array {
  return new Uint8Array([...HEADER, ...bytes])
}

describe('boon v2', () => {
  // ============================================================
  // REQ-001: Magic Number Validation
  // ============================================================
  describe('magic number validation', () => {
    it('should accept valid BOON magic number', () => {
      const data = withHeader(TAG.NULL)
      expect(() => decode(data)).not.toThrow()
    })

    it('should reject invalid magic number', () => {
      const data = new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x01, 0x00])
      expect(() => decode(data)).toThrow(InvalidMagicError)
    })

    it('should reject truncated magic', () => {
      const data = new Uint8Array([0x42, 0x4F, 0x4F]) // only 3 bytes
      expect(() => decode(data)).toThrow()
    })
  })

  // ============================================================
  // REQ-002: Version Validation
  // ============================================================
  describe('version validation', () => {
    it('should accept version 1', () => {
      const data = withHeader(TAG.NULL)
      expect(() => decode(data)).not.toThrow()
    })

    it('should reject version 0', () => {
      const data = new Uint8Array([0x42, 0x4F, 0x4F, 0x4E, 0x00, 0x00])
      expect(() => decode(data)).toThrow(UnsupportedVersionError)
    })

    it('should reject version 2', () => {
      const data = new Uint8Array([0x42, 0x4F, 0x4F, 0x4E, 0x02, 0x00])
      expect(() => decode(data)).toThrow(UnsupportedVersionError)
    })
  })

  // ============================================================
  // REQ-003: Null Encoding
  // ============================================================
  describe('null encoding', () => {
    it('should encode null as tag 0x00', () => {
      const result = encode(null)
      expect(result).toEqual(withHeader(TAG.NULL))
    })

    it('should decode tag 0x00 as null', () => {
      const data = withHeader(TAG.NULL)
      expect(decode(data)).toBeNull()
    })
  })

  // ============================================================
  // REQ-004: Boolean Encoding
  // ============================================================
  describe('boolean encoding', () => {
    it('should encode false as tag 0x01', () => {
      const result = encode(false)
      expect(result).toEqual(withHeader(TAG.FALSE))
    })

    it('should encode true as tag 0x02', () => {
      const result = encode(true)
      expect(result).toEqual(withHeader(TAG.TRUE))
    })

    it('should decode tag 0x01 as false', () => {
      expect(decode(withHeader(TAG.FALSE))).toBe(false)
    })

    it('should decode tag 0x02 as true', () => {
      expect(decode(withHeader(TAG.TRUE))).toBe(true)
    })

    it('should roundtrip booleans', () => {
      expect(decode(encode(true))).toBe(true)
      expect(decode(encode(false))).toBe(false)
    })
  })

  // ============================================================
  // REQ-005: Integer Encoding (Zigzag + Varint)
  // ============================================================
  describe('integer encoding', () => {
    it('should encode 0 as zigzag 0', () => {
      const result = encode(0)
      expect(result).toEqual(withHeader(TAG.INT, 0x00))
    })

    it('should encode 1 as zigzag 2', () => {
      const result = encode(1)
      expect(result).toEqual(withHeader(TAG.INT, 0x02))
    })

    it('should encode -1 as zigzag 1', () => {
      const result = encode(-1)
      expect(result).toEqual(withHeader(TAG.INT, 0x01))
    })

    it('should encode -2 as zigzag 3', () => {
      const result = encode(-2)
      expect(result).toEqual(withHeader(TAG.INT, 0x03))
    })

    it('should encode 127 as zigzag 254 (2 bytes)', () => {
      const result = encode(127)
      expect(result).toEqual(withHeader(TAG.INT, 0xFE, 0x01))
    })

    it('should encode -128 as zigzag 255 (2 bytes)', () => {
      const result = encode(-128)
      expect(result).toEqual(withHeader(TAG.INT, 0xFF, 0x01))
    })

    it('should encode 64 as zigzag 128 (2 bytes)', () => {
      const result = encode(64)
      expect(result).toEqual(withHeader(TAG.INT, 0x80, 0x01))
    })

    it('should roundtrip various integers', () => {
      const testCases = [0, 1, -1, 127, -128, 255, -256, 1000, -1000, 65535, -65536, 2147483647, -2147483648]
      for (const n of testCases) {
        expect(decode(encode(n))).toBe(n)
      }
    })

    it('should roundtrip large integers (within safe zigzag range)', () => {
      // Test values that are safe for zigzag encoding
      const values = [2 ** 30, -(2 ** 30), 2 ** 40, -(2 ** 40)]
      for (const v of values) {
        expect(decode(encode(v))).toBe(v)
      }
    })
  })

  // ============================================================
  // REQ-006: Float64 Encoding
  // ============================================================
  describe('float64 encoding', () => {
    it('should encode floats with tag 0x21', () => {
      const result = encode(3.14)
      expect(result[5]).toBe(TAG.FLOAT64)
      expect(result.length).toBe(5 + 1 + 8) // header + tag + 8 bytes
    })

    it('should roundtrip floats', () => {
      const testCases = [3.14159, -2.718, 0.0, 1e100, 1e-100]
      for (const f of testCases) {
        expect(decode(encode(f))).toBe(f)
      }
    })

    it('should handle Infinity', () => {
      expect(decode(encode(Infinity))).toBe(Infinity)
      expect(decode(encode(-Infinity))).toBe(-Infinity)
    })

    it('should handle NaN', () => {
      expect(decode(encode(Number.NaN))).toBeNaN()
    })

    it('should encode integer-valued floats as integers when safe', () => {
      // 5.0 should be encoded as integer, not float (for compactness)
      const result = encode(5.0)
      expect(result[5]).toBe(TAG.INT)
    })
  })

  // ============================================================
  // REQ-007: String Encoding
  // ============================================================
  describe('string encoding', () => {
    it('should encode empty string with dedicated tag', () => {
      const result = encode('')
      expect(result[5]).toBe(TAG.STRING_EMPTY)
      expect(result.length).toBe(6) // header + tag only
    })

    it('should encode non-empty string', () => {
      const result = encode('hello')
      expect(result[5]).toBe(TAG.STRING)
      expect(result[6]).toBe(5) // length varint
      // "hello" = 0x68 0x65 0x6C 0x6C 0x6F
      expect(result.slice(7)).toEqual(new Uint8Array([0x68, 0x65, 0x6C, 0x6C, 0x6F]))
    })

    it('should roundtrip ASCII strings', () => {
      const s = 'Hello, World!'
      expect(decode(encode(s))).toBe(s)
    })

    it('should roundtrip Unicode strings', () => {
      const testCases = ['こんにちは', '🎉🚀', 'émoji', '中文']
      for (const s of testCases) {
        expect(decode(encode(s))).toBe(s)
      }
    })

    it('should handle long strings (>127 bytes)', () => {
      const s = 'x'.repeat(1000)
      expect(decode(encode(s))).toBe(s)
    })
  })

  // ============================================================
  // REQ-008: Array Encoding (Definite Length)
  // ============================================================
  describe('array encoding (definite)', () => {
    it('should encode empty array with dedicated tag', () => {
      const result = encode([])
      expect(result[5]).toBe(TAG.ARRAY_EMPTY)
      expect(result.length).toBe(6) // header + tag only
    })

    it('should encode non-empty array', () => {
      const result = encode([1, 2])
      expect(result[5]).toBe(TAG.ARRAY)
      expect(result[6]).toBe(2) // count = 2
    })

    it('should roundtrip arrays', () => {
      const testCases: unknown[][] = [[], [1], [1, 2, 3], ['a', 'b', 'c'], [true, false, null]]
      for (const arr of testCases) {
        expect(decode(encode(arr))).toEqual(arr)
      }
    })

    it('should roundtrip nested arrays', () => {
      const nested = [[1, 2], [3, [4, 5]], []]
      expect(decode(encode(nested))).toEqual(nested)
    })

    it('should handle large arrays', () => {
      const large = Array.from({ length: 1000 }, (_, i) => i)
      expect(decode(encode(large))).toEqual(large)
    })
  })

  // ============================================================
  // REQ-009: Array Encoding (Indefinite Length)
  // ============================================================
  describe('array encoding (indefinite)', () => {
    it('should decode indefinite array with break', () => {
      // [1, 2] as indefinite: 0x3F, <1>, <2>, 0xFF
      const data = withHeader(
        TAG.ARRAY_INDEF,
        TAG.INT, 0x02, // integer 1
        TAG.INT, 0x04, // integer 2
        TAG.BREAK, // break
      )
      expect(decode(data)).toEqual([1, 2])
    })

    it('should decode empty indefinite array', () => {
      const data = withHeader(TAG.ARRAY_INDEF, TAG.BREAK)
      expect(decode(data)).toEqual([])
    })

    it('should throw on break outside container', () => {
      const data = withHeader(TAG.BREAK)
      expect(() => decode(data)).toThrow(UnexpectedBreakError)
    })
  })

  // ============================================================
  // REQ-010: Object Encoding (Definite Length)
  // ============================================================
  describe('object encoding (definite)', () => {
    it('should encode empty object with dedicated tag', () => {
      const result = encode({})
      expect(result[5]).toBe(TAG.OBJECT_EMPTY)
      expect(result.length).toBe(6) // header + tag only
    })

    it('should encode non-empty object', () => {
      const result = encode({ a: 1 })
      expect(result[5]).toBe(TAG.OBJECT)
      expect(result[6]).toBe(1) // count = 1
    })

    it('should roundtrip objects', () => {
      const testCases = [
        {},
        { a: 1 },
        { name: 'test', value: 42 },
        { nested: { deep: true } },
      ]
      for (const obj of testCases) {
        expect(decode(encode(obj))).toEqual(obj)
      }
    })

    it('should preserve key order', () => {
      const obj = { z: 1, a: 2, m: 3 }
      const decoded = decode(encode(obj)) as Record<string, unknown>
      expect(Object.keys(decoded)).toEqual(['z', 'a', 'm'])
    })

    it('should handle duplicate keys (last wins)', () => {
      // Manually create data with duplicate keys
      // {a: 1, a: 2} - second 'a' should win
      const data = withHeader(
        TAG.OBJECT,
        0x02, // 2 pairs
        0x01, 0x61, // key "a" (length 1)
        TAG.INT, 0x02, // integer 1
        0x01, 0x61, // key "a" again (length 1)
        TAG.INT, 0x04, // integer 2
      )
      expect(decode(data)).toEqual({ a: 2 })
    })
  })

  // ============================================================
  // REQ-011: Object Encoding (Indefinite Length)
  // ============================================================
  describe('object encoding (indefinite)', () => {
    it('should decode indefinite object with break', () => {
      const data = withHeader(
        TAG.OBJECT_INDEF,
        0x01, 0x61, // key "a" (length 1)
        TAG.INT, 0x02, // integer 1
        TAG.BREAK, // break
      )
      expect(decode(data)).toEqual({ a: 1 })
    })

    it('should decode empty indefinite object', () => {
      const data = withHeader(TAG.OBJECT_INDEF, TAG.BREAK)
      expect(decode(data)).toEqual({})
    })
  })

  // ============================================================
  // REQ-012: Varint Encoding
  // ============================================================
  describe('varint encoding', () => {
    // Test varint encoding indirectly through string lengths

    it('should encode string length 127 in 1 byte', () => {
      const s = 'x'.repeat(127)
      const result = encode(s)
      expect(result[6]).toBe(127) // single byte varint
    })

    it('should encode string length 128 in 2 bytes', () => {
      const s = 'x'.repeat(128)
      const result = encode(s)
      expect(result[6]).toBe(0x80) // continuation bit set
      expect(result[7]).toBe(0x01) // second byte
    })

    it('should encode string length 16383 in 2 bytes', () => {
      const s = 'x'.repeat(16383)
      const result = encode(s)
      expect(result[6]).toBe(0xFF)
      expect(result[7]).toBe(0x7F)
    })

    it('should encode string length 16384 in 3 bytes', () => {
      const s = 'x'.repeat(16384)
      const result = encode(s)
      expect(result[6]).toBe(0x80)
      expect(result[7]).toBe(0x80)
      expect(result[8]).toBe(0x01)
    })
  })

  // ============================================================
  // REQ-013: Error Handling
  // ============================================================
  describe('error handling', () => {
    it('should throw TruncatedDataError on truncated input', () => {
      const data = withHeader(TAG.STRING, 0x05) // string with length 5, but no data
      expect(() => decode(data)).toThrow(TruncatedDataError)
    })

    it('should throw UnknownTagError on reserved tags', () => {
      const data = withHeader(0x80)
      expect(() => decode(data)).toThrow(UnknownTagError)
    })

    it('should throw on tag 0xFE', () => {
      const data = withHeader(0xFE)
      expect(() => decode(data)).toThrow(UnknownTagError)
    })
  })

  // ============================================================
  // REQ-015: JSON Roundtrip
  // ============================================================
  describe('json roundtrip', () => {
    it('should roundtrip complex nested structure', () => {
      const complex = {
        string: 'hello',
        number: 42,
        float: 3.14,
        bool: true,
        null: null,
        array: [1, 'two', { three: 3 }],
        nested: {
          deep: {
            value: 'found',
          },
        },
      }
      expect(decode(encode(complex))).toEqual(complex)
    })

    it('should roundtrip array of objects', () => {
      const users = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        name: `User ${i}`,
        active: i % 2 === 0,
      }))
      expect(decode(encode(users))).toEqual(users)
    })

    it('should be smaller than JSON for typical data', () => {
      const data = {
        id: 12345,
        name: 'Test User',
        email: 'test@example.com',
        active: true,
        scores: [95, 87, 92, 88],
      }
      const jsonSize = JSON.stringify(data).length
      const boonSize = encode(data).length
      expect(boonSize).toBeLessThan(jsonSize)
    })
  })

  // ============================================================
  // Note: Binary encoding removed - BOON v2 is JSON-faithful
  // Binary data should be base64-encoded as strings
  // ============================================================
})

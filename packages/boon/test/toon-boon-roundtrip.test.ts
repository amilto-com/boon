import { describe, expect, it } from 'vitest'
import { decode as decodeBoon, encode as encodeBoon } from '../src'

// Mock de TOON pour les tests - en attendant l'intégration réelle
function encodeToon(value: unknown): string {
  return JSON.stringify(value, null, 2)
}

function decodeToon(toon: string): unknown {
  return JSON.parse(toon)
}

describe('tOON → BOON → TOON roundtrip regression tests', () => {
  describe('primitives', () => {
    it('null roundtrip', () => {
      const original = null
      const toon1 = encodeToon(original)
      const boon = encodeBoon(decodeToon(toon1))
      const value = decodeBoon(boon)
      const toon2 = encodeToon(value)

      expect(value).toBe(original)
      expect(toon2).toBe(toon1)
    })

    it('boolean true roundtrip', () => {
      const original = true
      const toon1 = encodeToon(original)
      const boon = encodeBoon(decodeToon(toon1))
      const value = decodeBoon(boon)
      const toon2 = encodeToon(value)

      expect(value).toBe(original)
      expect(toon2).toBe(toon1)
    })

    it('boolean false roundtrip', () => {
      const original = false
      const toon1 = encodeToon(original)
      const boon = encodeBoon(decodeToon(toon1))
      const value = decodeBoon(boon)
      const toon2 = encodeToon(value)

      expect(value).toBe(original)
      expect(toon2).toBe(toon1)
    })

    it('integer roundtrip', () => {
      const original = 42
      const toon1 = encodeToon(original)
      const boon = encodeBoon(decodeToon(toon1))
      const value = decodeBoon(boon)
      const toon2 = encodeToon(value)

      expect(value).toBe(original)
      expect(toon2).toBe(toon1)
    })

    it('negative integer roundtrip', () => {
      const original = -123
      const toon1 = encodeToon(original)
      const boon = encodeBoon(decodeToon(toon1))
      const value = decodeBoon(boon)
      const toon2 = encodeToon(value)

      expect(value).toBe(original)
      expect(toon2).toBe(toon1)
    })

    it('float roundtrip', () => {
      const original = 3.14159
      const toon1 = encodeToon(original)
      const boon = encodeBoon(decodeToon(toon1))
      const value = decodeBoon(boon) as number
      const toon2 = encodeToon(value)

      expect(value).toBeCloseTo(original, 5)
      expect(JSON.parse(toon2)).toBeCloseTo(JSON.parse(toon1), 5)
    })

    it('string roundtrip', () => {
      const original = 'hello world'
      const toon1 = encodeToon(original)
      const boon = encodeBoon(decodeToon(toon1))
      const value = decodeBoon(boon)
      const toon2 = encodeToon(value)

      expect(value).toBe(original)
      expect(toon2).toBe(toon1)
    })

    it('unicode string roundtrip', () => {
      const original = 'こんにちは 世界 🌍'
      const toon1 = encodeToon(original)
      const boon = encodeBoon(decodeToon(toon1))
      const value = decodeBoon(boon)
      const toon2 = encodeToon(value)

      expect(value).toBe(original)
      expect(toon2).toBe(toon1)
    })

    it('empty string roundtrip', () => {
      const original = ''
      const toon1 = encodeToon(original)
      const boon = encodeBoon(decodeToon(toon1))
      const value = decodeBoon(boon)
      const toon2 = encodeToon(value)

      expect(value).toBe(original)
      expect(toon2).toBe(toon1)
    })
  })

  describe('arrays', () => {
    it('empty array roundtrip', () => {
      const original: unknown[] = []
      const toon1 = encodeToon(original)
      const boon = encodeBoon(decodeToon(toon1))
      const value = decodeBoon(boon)
      const toon2 = encodeToon(value)

      expect(value).toEqual(original)
      expect(toon2).toBe(toon1)
    })

    it('array of numbers roundtrip', () => {
      const original = [1, 2, 3, 4, 5]
      const toon1 = encodeToon(original)
      const boon = encodeBoon(decodeToon(toon1))
      const value = decodeBoon(boon)
      const toon2 = encodeToon(value)

      expect(value).toEqual(original)
      expect(toon2).toBe(toon1)
    })

    it('array of strings roundtrip', () => {
      const original = ['apple', 'banana', 'cherry']
      const toon1 = encodeToon(original)
      const boon = encodeBoon(decodeToon(toon1))
      const value = decodeBoon(boon)
      const toon2 = encodeToon(value)

      expect(value).toEqual(original)
      expect(toon2).toBe(toon1)
    })

    it('mixed array roundtrip', () => {
      const original = [1, 'two', true, null, 3.14]
      const toon1 = encodeToon(original)
      const boon = encodeBoon(decodeToon(toon1))
      const value = decodeBoon(boon)
      const toon2 = encodeToon(value)

      expect(value).toEqual(original)
      expect(toon2).toBe(toon1)
    })

    it('nested arrays roundtrip', () => {
      const original = [[1, 2], [3, 4], [5, 6]]
      const toon1 = encodeToon(original)
      const boon = encodeBoon(decodeToon(toon1))
      const value = decodeBoon(boon)
      const toon2 = encodeToon(value)

      expect(value).toEqual(original)
      expect(toon2).toBe(toon1)
    })
  })

  describe('objects', () => {
    it('empty object roundtrip', () => {
      const original = {}
      const toon1 = encodeToon(original)
      const boon = encodeBoon(decodeToon(toon1))
      const value = decodeBoon(boon)
      const toon2 = encodeToon(value)

      expect(value).toEqual(original)
      expect(toon2).toBe(toon1)
    })

    it('simple object roundtrip', () => {
      const original = { name: 'Alice', age: 30, active: true }
      const toon1 = encodeToon(original)
      const boon = encodeBoon(decodeToon(toon1))
      const value = decodeBoon(boon)
      const toon2 = encodeToon(value)

      expect(value).toEqual(original)
      expect(toon2).toBe(toon1)
    })

    it('nested object roundtrip', () => {
      const original = {
        user: {
          name: 'Bob',
          address: {
            city: 'Paris',
            country: 'France',
          },
        },
      }
      const toon1 = encodeToon(original)
      const boon = encodeBoon(decodeToon(toon1))
      const value = decodeBoon(boon)
      const toon2 = encodeToon(value)

      expect(value).toEqual(original)
      expect(toon2).toBe(toon1)
    })

    it('object with array roundtrip', () => {
      const original = {
        name: 'Product List',
        items: ['item1', 'item2', 'item3'],
        count: 3,
      }
      const toon1 = encodeToon(original)
      const boon = encodeBoon(decodeToon(toon1))
      const value = decodeBoon(boon)
      const toon2 = encodeToon(value)

      expect(value).toEqual(original)
      expect(toon2).toBe(toon1)
    })
  })

  describe('complex structures', () => {
    it('array of objects roundtrip', () => {
      const original = [
        { id: 1, name: 'Alice', score: 95.5 },
        { id: 2, name: 'Bob', score: 87.3 },
        { id: 3, name: 'Charlie', score: 92.1 },
      ]
      const toon1 = encodeToon(original)
      const boon = encodeBoon(decodeToon(toon1))
      const value = decodeBoon(boon)
      const toon2 = encodeToon(value)

      expect(value).toEqual(original)
      expect(toon2).toBe(toon1)
    })

    it('deeply nested structure roundtrip', () => {
      const original = {
        level1: {
          level2: {
            level3: {
              level4: {
                data: [1, 2, 3],
                metadata: { created: '2025-01-01', updated: '2025-11-28' },
              },
            },
          },
        },
      }
      const toon1 = encodeToon(original)
      const boon = encodeBoon(decodeToon(toon1))
      const value = decodeBoon(boon)
      const toon2 = encodeToon(value)

      expect(value).toEqual(original)
      expect(toon2).toBe(toon1)
    })

    it('complex real-world example roundtrip', () => {
      const original = {
        users: [
          {
            id: 1,
            name: 'Alice',
            email: 'alice@example.com',
            roles: ['admin', 'user'],
            metadata: { lastLogin: '2025-11-28', loginCount: 42 },
          },
          {
            id: 2,
            name: 'Bob',
            email: 'bob@example.com',
            roles: ['user'],
            metadata: { lastLogin: '2025-11-27', loginCount: 15 },
          },
        ],
        config: {
          appName: 'Test App',
          version: '1.0.0',
          features: {
            darkMode: true,
            notifications: false,
          },
        },
        stats: {
          totalUsers: 2,
          activeToday: 1,
          metrics: [100, 150, 200, 175, 225],
        },
      }
      const toon1 = encodeToon(original)
      const boon = encodeBoon(decodeToon(toon1))
      const value = decodeBoon(boon)
      const toon2 = encodeToon(value)

      expect(value).toEqual(original)
      expect(toon2).toBe(toon1)
    })

    it('edge case: object with special characters in keys', () => {
      const original = {
        'key-with-dash': 'value1',
        'key.with.dot': 'value2',
        'key_with_underscore': 'value3',
        'key with spaces': 'value4',
      }
      const toon1 = encodeToon(original)
      const boon = encodeBoon(decodeToon(toon1))
      const value = decodeBoon(boon)
      const toon2 = encodeToon(value)

      expect(value).toEqual(original)
      expect(toon2).toBe(toon1)
    })

    it('edge case: various number ranges', () => {
      const original = {
        maxInt32: 2147483647,
        minInt32: -2147483648,
        largeFloat: 1.23456789e+15,
        smallFloat: 1.23456789e-15,
        pi: 3.141592653589793,
      }
      const toon1 = encodeToon(original)
      const boon = encodeBoon(decodeToon(toon1))
      const value = decodeBoon(boon) as typeof original

      expect(value.maxInt32).toBe(original.maxInt32)
      expect(value.minInt32).toBe(original.minInt32)
      expect(value.largeFloat).toBeCloseTo(original.largeFloat, 5)
      expect(value.smallFloat).toBeCloseTo(original.smallFloat, 20)
      expect(value.pi).toBeCloseTo(original.pi, 10)
    })
  })

  describe('binary efficiency verification', () => {
    it('verifies BOON is more compact than JSON for typical data', () => {
      const original = {
        users: Array.from({ length: 10 }, (_, i) => ({
          id: i + 1,
          name: `User ${i + 1}`,
          active: i % 2 === 0,
        })),
      }

      const jsonString = JSON.stringify(original)
      const boon = encodeBoon(original)

      // BOON should be more compact than JSON
      expect(boon.byteLength).toBeLessThan(jsonString.length)

      // Roundtrip verification
      const decoded = decodeBoon(boon)
      expect(decoded).toEqual(original)
    })

    it('verifies roundtrip preserves data integrity', () => {
      const original = {
        timestamp: Date.now(),
        data: Array.from({ length: 100 }, (_, i) => i),
        metadata: {
          version: '1.0.0',
          checksum: 'abc123',
        },
      }

      // Multiple roundtrips
      let current = original
      for (let i = 0; i < 5; i++) {
        const boon = encodeBoon(current)
        current = decodeBoon(boon) as typeof original
      }

      expect(current).toEqual(original)
    })
  })
})

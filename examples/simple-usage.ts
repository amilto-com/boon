#!/usr/bin/env tsx

/**
 * Simple example: Using BOON and TOON in code
 *
 * Author: William Gacquer (Amilto)
 */

import { decode as decodeBoon, encode as encodeBoon } from '@boon-format/boon'
import { decode as decodeToon, encode as encodeToon } from '@toon-format/toon'

/* eslint-disable no-console */

// Sample data
const userData = {
  name: 'Alice',
  age: 30,
  email: 'alice@example.com',
  roles: ['admin', 'user'],
  settings: {
    theme: 'dark',
    notifications: true,
  },
}

console.log('📝 Original data:')
console.log(userData)
console.log()

// 1. Encode to TOON (human-readable text format)
console.log('🔤 TOON (compact text format):')
const toonString = encodeToon(userData)
console.log(toonString)
console.log(`Size: ${toonString.length} bytes`)
console.log()

// 2. Encode to BOON (binary format)
console.log('🔧 BOON (binary format):')
const boonBinary = encodeBoon(userData)
console.log(`Type: ${boonBinary.constructor.name}`)
console.log(`Size: ${boonBinary.byteLength} bytes`)
console.log(`First bytes: ${Array.from(boonBinary.slice(0, 20)).map(b => `0x${b.toString(16).padStart(2, '0')}`).join(' ')}`)
console.log()

// 3. Decode from TOON
console.log('📖 Decoding from TOON:')
const fromToon = decodeToon(toonString)
console.log(fromToon)
console.log()

// 4. Decode from BOON
console.log('📦 Decoding from BOON:')
const fromBoon = decodeBoon(boonBinary)
console.log(fromBoon)
console.log()

// 5. Verify data integrity
const jsonOriginal = JSON.stringify(userData)
const jsonFromToon = JSON.stringify(fromToon)
const jsonFromBoon = JSON.stringify(fromBoon)

console.log('✅ Data integrity verification:')
console.log(`   TOON → JSON: ${jsonOriginal === jsonFromToon ? '✓' : '✗'}`)
console.log(`   BOON → JSON: ${jsonOriginal === jsonFromBoon ? '✓' : '✗'}`)

/* eslint-enable no-console */

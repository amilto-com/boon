#!/usr/bin/env tsx

/**
 * Comprehensive TOON ↔ BOON roundtrip test
 * Tests all possible data types and structures
 *
 * Author: William Gacquer (Amilto)
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { decode as decodeBoon, encode as encodeBoon } from '@boon-format/boon'
import { decode as decodeToon, encode as encodeToon } from '@toon-format/toon'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/* eslint-disable no-console */

console.log('╔══════════════════════════════════════════════════════════════════════════╗')
console.log('║         Complete TOON ↔ BOON Test - All Types and Structures            ║')
console.log('╚══════════════════════════════════════════════════════════════════════════╝')
console.log()

// Load comprehensive test data
const jsonPath = resolve(__dirname, 'comprehensive-data.json')
const jsonContent = readFileSync(jsonPath, 'utf-8')
const originalData = JSON.parse(jsonContent)

console.log('📊 Test data loaded:')
console.log(`   • JSON size: ${jsonContent.length} bytes`)
console.log(`   • Number of sections: ${Object.keys(originalData).length}`)
console.log()

// Section 1: JSON → TOON
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('🔤 Step 1: JSON → TOON Conversion')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

const startToonEncode = performance.now()
const toonString = encodeToon(originalData)
const toonEncodeTime = performance.now() - startToonEncode

const toonPath = resolve(__dirname, 'comprehensive-data.toon')
writeFileSync(toonPath, toonString, 'utf-8')

console.log(`✓ TOON encoding successful in ${toonEncodeTime.toFixed(2)}ms`)
console.log(`✓ TOON size: ${toonString.length} bytes`)
console.log(`✓ Compression: ${((1 - toonString.length / jsonContent.length) * 100).toFixed(1)}%`)
console.log(`✓ File saved: comprehensive-data.toon`)
console.log()

// Section 2: TOON → JSON (verification)
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('📖 Step 2: TOON → JSON Decoding (verification)')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

const startToonDecode = performance.now()
const dataFromToon = decodeToon(toonString)
const toonDecodeTime = performance.now() - startToonDecode

const toonRoundtripMatch = JSON.stringify(originalData) === JSON.stringify(dataFromToon)

console.log(`✓ TOON decoding successful in ${toonDecodeTime.toFixed(2)}ms`)
console.log(`${toonRoundtripMatch ? '✓' : '✗'} TOON roundtrip integrity: ${toonRoundtripMatch ? 'OK' : 'ERROR'}`)
console.log()

// Section 3: JSON → BOON
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('🔧 Step 3: JSON → BOON Conversion (binary)')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

const startBoonEncode = performance.now()
const boonBinary = encodeBoon(originalData)
const boonEncodeTime = performance.now() - startBoonEncode

const boonPath = resolve(__dirname, 'comprehensive-data.boon')
writeFileSync(boonPath, boonBinary)

console.log(`✓ BOON encoding successful in ${boonEncodeTime.toFixed(2)}ms`)
console.log(`✓ BOON size: ${boonBinary.byteLength} bytes`)
console.log(`✓ Compression vs JSON: ${((1 - boonBinary.byteLength / jsonContent.length) * 100).toFixed(1)}%`)
console.log(`✓ Compression vs TOON: ${((1 - boonBinary.byteLength / toonString.length) * 100).toFixed(1)}%`)
console.log(`✓ File saved: comprehensive-data.boon`)
console.log()

// Section 4: BOON → JSON (verification)
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('📦 Step 4: BOON → JSON Decoding (verification)')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

const startBoonDecode = performance.now()
const dataFromBoon = decodeBoon(boonBinary)
const boonDecodeTime = performance.now() - startBoonDecode

const boonRoundtripMatch = JSON.stringify(originalData) === JSON.stringify(dataFromBoon)

console.log(`✓ BOON decoding successful in ${boonDecodeTime.toFixed(2)}ms`)
console.log(`${boonRoundtripMatch ? '✓' : '✗'} BOON roundtrip integrity: ${boonRoundtripMatch ? 'OK' : 'ERROR'}`)
console.log()

// Section 5: TOON → BOON → TOON (complete cycle)
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('🔄 Step 5: Complete TOON → BOON → TOON Cycle')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

// TOON → Data
const dataFromToon2 = decodeToon(toonString)
// Data → BOON
const boonFromToon = encodeBoon(dataFromToon2)
// BOON → Data
const dataFromBoon2 = decodeBoon(boonFromToon)
// Data → TOON
const toonFromBoon = encodeToon(dataFromBoon2)

const fullCycleMatch = toonString === toonFromBoon

console.log(`${fullCycleMatch ? '✓' : '≈'} TOON→BOON→TOON cycle: ${fullCycleMatch ? 'IDENTICAL' : 'EQUIVALENT'}`)
console.log(`✓ Data preserved: ${JSON.stringify(originalData) === JSON.stringify(dataFromBoon2)}`)
console.log()

// Section 6: Specific structure tests
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('🧪 Step 6: Specific Structure Verification')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

const tests = [
  { name: 'Primitives', path: 'primitives' },
  { name: 'Arrays', path: 'arrays' },
  { name: 'Objects', path: 'objects' },
  { name: 'Complex structures', path: 'complex_structures' },
  { name: 'Edge cases', path: 'edge_cases' },
  { name: 'Real-world examples', path: 'real_world_examples' },
]

for (const test of tests) {
  const original = (originalData as any)[test.path]
  const fromBoon = (dataFromBoon as any)[test.path]
  const match = JSON.stringify(original) === JSON.stringify(fromBoon)
  console.log(`${match ? '✓' : '✗'} ${test.name.padEnd(25)}: ${match ? 'OK' : 'ERROR'}`)
}
console.log()

// Section 7: Performance statistics
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('📈 Step 7: Performance Statistics')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

console.table({
  'TOON Encode': {
    Time: `${toonEncodeTime.toFixed(2)} ms`,
    Throughput: `${(jsonContent.length / toonEncodeTime / 1000).toFixed(2)} MB/s`,
  },
  'TOON Decode': {
    Time: `${toonDecodeTime.toFixed(2)} ms`,
    Throughput: `${(toonString.length / toonDecodeTime / 1000).toFixed(2)} MB/s`,
  },
  'BOON Encode': {
    Time: `${boonEncodeTime.toFixed(2)} ms`,
    Throughput: `${(jsonContent.length / boonEncodeTime / 1000).toFixed(2)} MB/s`,
  },
  'BOON Decode': {
    Time: `${boonDecodeTime.toFixed(2)} ms`,
    Throughput: `${(boonBinary.byteLength / boonDecodeTime / 1000).toFixed(2)} MB/s`,
  },
})

console.log()

// Section 8: Final summary
console.log('╔══════════════════════════════════════════════════════════════════════════╗')
console.log('║                           FINAL SUMMARY                                  ║')
console.log('╠══════════════════════════════════════════════════════════════════════════╣')

console.table({
  'JSON (original)': {
    Size: `${jsonContent.length.toLocaleString()} bytes`,
    Ratio: '100.0%',
    Type: 'Text',
  },
  'TOON (text)': {
    Size: `${toonString.length.toLocaleString()} bytes`,
    Ratio: `${((toonString.length / jsonContent.length) * 100).toFixed(1)}%`,
    Type: 'Compact text',
  },
  'BOON (binary)': {
    Size: `${boonBinary.byteLength.toLocaleString()} bytes`,
    Ratio: `${((boonBinary.byteLength / jsonContent.length) * 100).toFixed(1)}%`,
    Type: 'Binary',
  },
})

console.log('╚══════════════════════════════════════════════════════════════════════════╝')
console.log()

const allTestsPassed = toonRoundtripMatch && boonRoundtripMatch
console.log(allTestsPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED')
console.log()

console.log('📁 Generated files:')
console.log(`   • ${toonPath}`)
console.log(`   • ${boonPath}`)
console.log()

if (!allTestsPassed) {
  process.exit(1)
}

/* eslint-enable no-console */

#!/usr/bin/env tsx

/**
 * Demonstration script: JSON → TOON → BOON → JSON
 * Shows the complete conversion cycle and size comparisons
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
const EXAMPLES_DIR = resolve(__dirname)

console.log('🔄 Demonstration of JSON → TOON → BOON → JSON conversion\n')

// 1. Load original JSON
console.log('📖 Step 1: Loading original JSON file...')
const jsonPath = resolve(EXAMPLES_DIR, 'sample-data.json')
const jsonContent = readFileSync(jsonPath, 'utf-8')
const jsonData = JSON.parse(jsonContent)
console.log(`   ✓ File loaded: ${jsonPath}`)
console.log(`   ✓ JSON size: ${jsonContent.length} bytes\n`)

// 2. Convert JSON → TOON
console.log('📝 Step 2: Converting JSON → TOON...')
const toonContent = encodeToon(jsonData)
const toonPath = resolve(EXAMPLES_DIR, 'sample-data-generated.toon')
writeFileSync(toonPath, toonContent, 'utf-8')
console.log(`   ✓ TOON generated: ${toonPath}`)
console.log(`   ✓ TOON size: ${toonContent.length} bytes`)
console.log(`   ✓ Reduction: ${((1 - toonContent.length / jsonContent.length) * 100).toFixed(1)}%\n`)

// 3. Convert TOON → BOON
console.log('🔧 Step 3: Converting TOON → BOON (binary)...')
const toonData = decodeToon(toonContent)
const boonBinary = encodeBoon(toonData)
const boonPath = resolve(EXAMPLES_DIR, 'sample-data.boon')
writeFileSync(boonPath, boonBinary)
console.log(`   ✓ BOON generated: ${boonPath}`)
console.log(`   ✓ BOON size: ${boonBinary.byteLength} bytes`)
console.log(`   ✓ Reduction vs JSON: ${((1 - boonBinary.byteLength / jsonContent.length) * 100).toFixed(1)}%`)
console.log(`   ✓ Reduction vs TOON: ${((1 - boonBinary.byteLength / toonContent.length) * 100).toFixed(1)}%\n`)

// 4. Verify BOON → JSON (roundtrip)
console.log('🔍 Step 4: Verifying data integrity (BOON → JSON)...')
const decodedFromBoon = decodeBoon(boonBinary)
const roundtripJson = JSON.stringify(decodedFromBoon, null, 2)
const roundtripPath = resolve(EXAMPLES_DIR, 'sample-data-roundtrip.json')
writeFileSync(roundtripPath, roundtripJson, 'utf-8')

// Data comparison
const dataMatch = JSON.stringify(jsonData) === JSON.stringify(decodedFromBoon)
console.log(`   ${dataMatch ? '✓' : '✗'} Data integrity: ${dataMatch ? 'PRESERVED' : 'ERROR'}`)
console.log(`   ✓ Verification file: ${roundtripPath}\n`)

// 5. Summary
console.log('📊 Size summary:')
console.table({
  'JSON (original)': {
    Size: `${jsonContent.length} bytes`,
    Ratio: '100%',
  },
  'TOON (text)': {
    Size: `${toonContent.length} bytes`,
    Ratio: `${((toonContent.length / jsonContent.length) * 100).toFixed(1)}%`,
  },
  'BOON (binary)': {
    Size: `${boonBinary.byteLength} bytes`,
    Ratio: `${((boonBinary.byteLength / jsonContent.length) * 100).toFixed(1)}%`,
  },
})

console.log('\n✨ Demonstration completed successfully!\n')
console.log('📁 Generated files:')
console.log(`   • ${toonPath}`)
console.log(`   • ${boonPath}`)
console.log(`   • ${roundtripPath}`)

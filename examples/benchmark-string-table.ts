#!/usr/bin/env tsx

/**
 * String Table Optimization Benchmark
 * Author: William Gacquer (Amilto)
 *
 * Compare BOON encoding with and without string table optimization
 */

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { decode, encode } from '@boon-format/boon'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/* eslint-disable no-console */

console.log('╔══════════════════════════════════════════════════════════════════════════╗')
console.log('║         BOON String Table Optimization Benchmark                        ║')
console.log('║                                                                          ║')
console.log('║         Author: William Gacquer - Amilto                                ║')
console.log('╚══════════════════════════════════════════════════════════════════════════╝')
console.log()

// Load test data
const jsonPath = resolve(__dirname, 'comprehensive-data.json')
const jsonContent = readFileSync(jsonPath, 'utf-8')
const data = JSON.parse(jsonContent)

console.log('📊 Test data:')
console.log(`   File: comprehensive-data.json`)
console.log(`   JSON size: ${jsonContent.length.toLocaleString()} bytes`)
console.log()

// Benchmark encoding WITHOUT string table
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('🔧 BOON Standard (without string table)')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

const startStandard = performance.now()
const boonStandard = encode(data, { useStringTable: false })
const encodeTimeStandard = performance.now() - startStandard

console.log(`Encoded size: ${boonStandard.byteLength.toLocaleString()} bytes`)
console.log(`Encode time: ${encodeTimeStandard.toFixed(2)} ms`)

const startDecodeStandard = performance.now()
const decodedStandard = decode(boonStandard)
const decodeTimeStandard = performance.now() - startDecodeStandard

console.log(`Decode time: ${decodeTimeStandard.toFixed(2)} ms`)
console.log(`Roundtrip OK: ${JSON.stringify(decodedStandard) === jsonContent}`)
console.log()

// Benchmark encoding WITH string table
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('✨ BOON Optimized (with string table)')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

const startOptimized = performance.now()
const boonOptimized = encode(data, { useStringTable: true })
const encodeTimeOptimized = performance.now() - startOptimized

console.log(`Encoded size: ${boonOptimized.byteLength.toLocaleString()} bytes`)
console.log(`Encode time: ${encodeTimeOptimized.toFixed(2)} ms`)

const startDecodeOptimized = performance.now()
const decodedOptimized = decode(boonOptimized)
const decodeTimeOptimized = performance.now() - startDecodeOptimized

console.log(`Decode time: ${decodeTimeOptimized.toFixed(2)} ms`)
console.log(`Roundtrip OK: ${JSON.stringify(decodedOptimized) === jsonContent}`)
console.log()

// Comparison
console.log('╔══════════════════════════════════════════════════════════════════════════╗')
console.log('║                           COMPARISON                                     ║')
console.log('╠══════════════════════════════════════════════════════════════════════════╣')
console.log()

const sizeSaving = boonStandard.byteLength - boonOptimized.byteLength
const sizeReduction = ((sizeSaving / boonStandard.byteLength) * 100).toFixed(1)
const encodeSlowdown = ((encodeTimeOptimized / encodeTimeStandard - 1) * 100).toFixed(1)
const decodeSlowdown = ((decodeTimeOptimized / decodeTimeStandard - 1) * 100).toFixed(1)

console.log('📉 Size:')
console.log(`   Standard:  ${boonStandard.byteLength.toLocaleString()} bytes`)
console.log(`   Optimized: ${boonOptimized.byteLength.toLocaleString()} bytes`)
console.log(`   Savings:   ${sizeSaving.toLocaleString()} bytes (-${sizeReduction}%)`)
console.log()

console.log('⏱️  Performance:')
console.log(`   Encoding:  ${encodeTimeStandard.toFixed(2)} ms → ${encodeTimeOptimized.toFixed(2)} ms (${encodeSlowdown > 0 ? '+' : ''}${encodeSlowdown}%)`)
console.log(`   Decoding:  ${decodeTimeStandard.toFixed(2)} ms → ${decodeTimeOptimized.toFixed(2)} ms (${decodeSlowdown > 0 ? '+' : ''}${decodeSlowdown}%)`)
console.log()

console.log('💡 Recommendation:')
if (Number.parseFloat(sizeReduction) > 5) {
  console.log(`   ✅ String table RECOMMENDED (-${sizeReduction}% size)`)
  if (Number.parseFloat(encodeSlowdown) > 20) {
    console.log(`   ⚠️  Encoding +${encodeSlowdown}% slower (acceptable for storage)`)
  }
}
else {
  console.log(`   ℹ️  Marginal gain (-${sizeReduction}%), use according to context`)
}
console.log()

console.log('╚══════════════════════════════════════════════════════════════════════════╝')
console.log()

// Additional test with array of similar objects
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('📊 Additional test: Array of similar objects')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

const users = Array.from({ length: 100 }, (_, i) => ({
  id: i,
  name: `User${i}`,
  email: `user${i}@example.com`,
  age: 20 + (i % 50),
  active: i % 2 === 0,
  role: i % 3 === 0 ? 'admin' : 'user',
  settings: {
    theme: 'dark',
    notifications: true,
    language: 'en',
  },
}))

const usersStandard = encode(users, { useStringTable: false })
const usersOptimized = encode(users, { useStringTable: true })

const userSizeSaving = usersStandard.byteLength - usersOptimized.byteLength
const userReduction = ((userSizeSaving / usersStandard.byteLength) * 100).toFixed(1)

console.log(`Standard:  ${usersStandard.byteLength.toLocaleString()} bytes`)
console.log(`Optimized: ${usersOptimized.byteLength.toLocaleString()} bytes`)
console.log(`Savings:   ${userSizeSaving.toLocaleString()} bytes (-${userReduction}%)`)
console.log()

if (Number.parseFloat(userReduction) > 15) {
  console.log(`🎯 Excellent gain (-${userReduction}%) for repetitive structured data!`)
}
console.log()

/* eslint-enable no-console */

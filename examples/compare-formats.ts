#!/usr/bin/env tsx

/**
 * Visual comparison of JSON, TOON, and BOON formats
 *
 * Author: William Gacquer (Amilto)
 */

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/* eslint-disable no-console */

console.log('╔══════════════════════════════════════════════════════════════════════════╗')
console.log('║              Visual Comparison: JSON vs TOON vs BOON                    ║')
console.log('╚══════════════════════════════════════════════════════════════════════════╝')
console.log()

// Read files
const jsonContent = readFileSync(resolve(__dirname, 'sample-data.json'), 'utf-8')
const toonContent = readFileSync(resolve(__dirname, 'sample-data.toon'), 'utf-8')
const boonBinary = readFileSync(resolve(__dirname, 'sample-data.boon'))

// Show JSON
console.log('┌─ JSON (standard format) ─────────────────────────────────────────────────┐')
console.log('│')
const jsonLines = jsonContent.split('\n').slice(0, 20)
for (const line of jsonLines) {
  console.log(`│ ${line}`)
}
if (jsonContent.split('\n').length > 20) {
  console.log('│ ... (truncated)')
}
console.log('│')
console.log(`└─ Size: ${jsonContent.length} bytes ────────────────────────────────────────────────┘`)
console.log()

// Show TOON
console.log('┌─ TOON (compact text format) ─────────────────────────────────────────────┐')
console.log('│')
const toonLines = toonContent.split('\n').slice(0, 20)
for (const line of toonLines) {
  console.log(`│ ${line}`)
}
if (toonContent.split('\n').length > 20) {
  console.log('│ ... (truncated)')
}
console.log('│')
console.log(`└─ Size: ${toonContent.length} bytes (${((toonContent.length / jsonContent.length) * 100).toFixed(1)}% of JSON) ──────────────────────────┘`)
console.log()

// Show BOON (hex preview)
console.log('┌─ BOON (binary format) ───────────────────────────────────────────────────┐')
console.log('│')
console.log('│ Magic: BOON (0x42 0x4f 0x4f 0x4e)')
console.log(`│ Version: ${boonBinary[4]}`)
console.log('│')
console.log('│ Hexdump (first 160 bytes):')
const preview = boonBinary.slice(0, 160)
for (let i = 0; i < preview.length; i += 16) {
  const chunk = preview.slice(i, i + 16)
  const hex = Array.from(chunk)
    .map(b => b.toString(16).padStart(2, '0'))
    .join(' ')
    .padEnd(47, ' ')
  const ascii = Array.from(chunk)
    .map(b => (b >= 32 && b <= 126) ? String.fromCharCode(b) : '.')
    .join('')
  console.log(`│ ${i.toString(16).padStart(4, '0')}: ${hex}  ${ascii}`)
}
console.log('│ ... (truncated)')
console.log('│')
console.log(`└─ Size: ${boonBinary.byteLength} bytes (${((boonBinary.byteLength / jsonContent.length) * 100).toFixed(1)}% of JSON) ────────────────────────┘`)
console.log()

console.log('╔══════════════════════════════════════════════════════════════════════════╗')
console.log('║                         Savings Summary                                  ║')
console.log('╠══════════════════════════════════════════════════════════════════════════╣')
console.log('║  Format  │   Size   │  Ratio  │  Savings   │  Type                      ║')
console.log('╟──────────┼──────────┼─────────┼────────────┼────────────────────────────╢')
console.log(`║  JSON    │  ${jsonContent.length.toString().padStart(4)} b  │  100.0% │     -      │  Text (standard)       ║`)
console.log(`║  TOON    │  ${toonContent.length.toString().padStart(4)} b  │  ${((toonContent.length / jsonContent.length) * 100).toFixed(1).padStart(5)}% │   ${(100 - (toonContent.length / jsonContent.length) * 100).toFixed(1).padStart(5)}%   │  Text (compact)        ║`)
console.log(`║  BOON    │   ${boonBinary.byteLength.toString().padStart(3)} b  │  ${((boonBinary.byteLength / jsonContent.length) * 100).toFixed(1).padStart(5)}% │   ${(100 - (boonBinary.byteLength / jsonContent.length) * 100).toFixed(1).padStart(5)}%   │  Binary (optimized)    ║`)
console.log('╚══════════════════════════════════════════════════════════════════════════╝')

/* eslint-enable no-console */

#!/usr/bin/env tsx

/**
 * Inspect BOON binary file structure
 *
 * Author: William Gacquer (Amilto)
 */

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { decode } from '@boon-format/boon'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const boonPath = process.argv[2] || resolve(__dirname, 'sample-data.boon')

/* eslint-disable no-console */
console.log('🔍 BOON File Inspection\n')
console.log(`📁 File: ${boonPath}\n`)

const boonData = readFileSync(boonPath)

console.log('📊 File Information:')
console.log(`   Total size: ${boonData.byteLength} bytes\n`)

console.log('🔢 Header (first 5 bytes):')
const header = boonData.slice(0, 5)
console.log(`   Magic number: ${String.fromCharCode(...header.slice(0, 4))} (${Array.from(header.slice(0, 4)).map(b => `0x${b.toString(16).padStart(2, '0')}`).join(' ')})`)
console.log(`   Version: ${header[4]}\n`)

console.log('🔤 Hexdump (first 128 bytes):')
const preview = boonData.slice(0, 128)
for (let i = 0; i < preview.length; i += 16) {
  const chunk = preview.slice(i, i + 16)
  const hex = Array.from(chunk)
    .map(b => b.toString(16).padStart(2, '0'))
    .join(' ')
    .padEnd(47, ' ')
  const ascii = Array.from(chunk)
    .map(b => (b >= 32 && b <= 126) ? String.fromCharCode(b) : '.')
    .join('')
  console.log(`   ${i.toString(16).padStart(8, '0')}: ${hex}  ${ascii}`)
}

console.log('\n📦 Decoded data:')
const decoded = decode(boonData)
console.log(JSON.stringify(decoded, null, 2))

console.log('\n✅ Inspection complete')
/* eslint-enable no-console */

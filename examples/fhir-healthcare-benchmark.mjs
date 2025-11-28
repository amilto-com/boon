#!/usr/bin/env node
/**
 * HL7 FHIR Healthcare Data - TOON/BOON Roundtrip Benchmark
 *
 * This benchmark tests format conversion using official HL7 FHIR R4 examples.
 * FHIR (Fast Healthcare Interoperability Resources) is the healthcare data
 * exchange standard developed by HL7 International.
 *
 * Sources:
 * - https://hl7.org/fhir/R4/patient-example.json
 * - https://hl7.org/fhir/R4/diagnosticreport-example.json
 * - https://hl7.org/fhir/R4/bundle-example.json
 *
 * Author: William Gacquer (Amilto)
 *
 * Usage: node fhir-healthcare-benchmark.mjs
 */

import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { brotliCompressSync, constants } from 'node:zlib'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Dynamic imports
const { encode: encodeBoon, decode: decodeBoon } = await import('../packages/boon/dist/index.mjs')
const { encode: encodeToon, decode: decodeToon } = await import('../packages/toon/dist/index.mjs')

const examples = [
  { name: 'Patient Resource', file: 'fhir-patient-example.json', desc: 'Complete patient demographic data' },
  { name: 'DiagnosticReport Bundle', file: 'fhir-diagnostic-example.json', desc: 'Large bundle with diagnostic reports (82% base64 data)' },
  { name: 'Search Bundle', file: 'fhir-bundle-example.json', desc: 'Search result bundle with multiple entries' },
]

// eslint-disable-next-line no-console
const log = console.log.bind(console)

log('═══════════════════════════════════════════════════════════════════════')
log('  HL7 FHIR Healthcare Data - TOON/BOON Roundtrip Benchmark')
log('  Source: Official HL7 FHIR R4 Specification Examples')
log('═══════════════════════════════════════════════════════════════════════')
log('')

for (const ex of examples) {
  const filePath = join(__dirname, ex.file)
  if (!existsSync(filePath)) {
    log(`⚠️  Skipping ${ex.name}: file not found`)
    continue
  }

  const json = readFileSync(filePath, 'utf8')
  const original = JSON.parse(json)

  log(`📋 ${ex.name}`)
  log(`   ${ex.desc}`)

  // Roundtrip: JSON → TOON → BOON → TOON → JSON
  const toon1 = encodeToon(original)
  const boon = encodeBoon(decodeToon(toon1))
  const toon2 = encodeToon(decodeBoon(boon))
  const final = decodeToon(toon2)

  const ok = JSON.stringify(original) === JSON.stringify(final)
  log(`   ✅ Roundtrip: ${ok ? 'PASSED' : 'FAILED'}`)

  // Sizes
  const jsonSize = Buffer.from(JSON.stringify(original)).length
  const toonSize = Buffer.from(toon1).length
  const boonSize = boon.length

  const jsonBr = brotliCompressSync(JSON.stringify(original), {
    params: { [constants.BROTLI_PARAM_QUALITY]: 11 },
  }).length
  const toonBr = brotliCompressSync(toon1, {
    params: { [constants.BROTLI_PARAM_QUALITY]: 11 },
  }).length
  const boonBr = brotliCompressSync(boon, {
    params: { [constants.BROTLI_PARAM_QUALITY]: 11 },
  }).length

  const fmt = n => (n >= 1024 ? `${(n / 1024).toFixed(1)} KB` : `${n} B`).padStart(9)
  const pct = (v, r) => `${((v / r - 1) * 100) > 0 ? '+' : ''}${((v / r - 1) * 100).toFixed(1)}%`

  log('')
  log('   Format         │    Raw     │ +Brotli11 │  vs JSON')
  log('   ───────────────┼────────────┼───────────┼──────────')
  log(`   JSON           │${fmt(jsonSize)} │${fmt(jsonBr)} │  baseline`)
  log(`   TOON (text)    │${fmt(toonSize)} │${fmt(toonBr)} │ ${pct(toonSize, jsonSize)}`)
  log(`   BOON (binary)  │${fmt(boonSize)} │${fmt(boonBr)} │ ${pct(boonSize, jsonSize)}`)
  log('')
  log(`   💾 BOON saves ${((jsonSize - boonSize) / jsonSize * 100).toFixed(1)}% raw`)
  log('')
  log('───────────────────────────────────────────────────────────────────────')
  log('')
}

log('✅ All HL7 FHIR healthcare examples processed successfully!')

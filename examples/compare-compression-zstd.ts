#!/usr/bin/env tsx

/**
 * Comparison with standard compression formats including Zstandard
 * Author: William Gacquer (Amilto)
 */

import { Buffer } from 'node:buffer'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { brotliCompressSync, constants, deflateSync, gzipSync } from 'node:zlib'
import { encode as encodeBoon } from '@boon-format/boon'
import zstd from '@mongodb-js/zstd'
import { encode as encodeToon } from '@toon-format/toon'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/* eslint-disable no-console */

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════════════╗')
  console.log('║    BOON/TOON vs Standard Compression Formats Comparison                 ║')
  console.log('║                                                                          ║')
  console.log('║    Author: William Gacquer - Amilto                                     ║')
  console.log('╚══════════════════════════════════════════════════════════════════════════╝')
  console.log()

  // Load test data
  const jsonPath = resolve(__dirname, 'comprehensive-data.json')
  const jsonContent = readFileSync(jsonPath, 'utf-8')
  const jsonBuffer = Buffer.from(jsonContent, 'utf-8')
  const originalData = JSON.parse(jsonContent)

  console.log('📊 Test data:')
  console.log(`   File: comprehensive-data.json`)
  console.log(`   Size: ${jsonContent.length.toLocaleString()} bytes`)
  console.log()

  // TOON
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🔤 TOON (Compact text format)')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  const toonString = encodeToon(originalData)
  const toonBuffer = Buffer.from(toonString, 'utf-8')

  console.log(`Raw size: ${toonString.length.toLocaleString()} bytes (${((toonString.length / jsonContent.length) * 100).toFixed(1)}%)`)
  console.log()

  // BOON
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🔧 BOON (Optimized binary format)')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  const boonBinary = encodeBoon(originalData)

  console.log(`Raw size: ${boonBinary.byteLength.toLocaleString()} bytes (${((boonBinary.byteLength / jsonContent.length) * 100).toFixed(1)}%)`)
  console.log()

  // Gzip (level 9 - maximum)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📦 Gzip (Standard compression)')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  const gzipJson = gzipSync(jsonBuffer, { level: 9 })
  const gzipToon = gzipSync(toonBuffer, { level: 9 })
  const gzipBoon = gzipSync(boonBinary, { level: 9 })

  console.log(`JSON + Gzip:  ${gzipJson.byteLength.toLocaleString()} bytes (${((gzipJson.byteLength / jsonContent.length) * 100).toFixed(1)}%)`)
  console.log(`TOON + Gzip:  ${gzipToon.byteLength.toLocaleString()} bytes (${((gzipToon.byteLength / jsonContent.length) * 100).toFixed(1)}%)`)
  console.log(`BOON + Gzip:  ${gzipBoon.byteLength.toLocaleString()} bytes (${((gzipBoon.byteLength / jsonContent.length) * 100).toFixed(1)}%)`)
  console.log()

  // Deflate
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📦 Deflate (ZIP compression)')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  const deflateJson = deflateSync(jsonBuffer, { level: 9 })
  const deflateToon = deflateSync(toonBuffer, { level: 9 })
  const deflateBoon = deflateSync(boonBinary, { level: 9 })

  console.log(`JSON + Deflate:  ${deflateJson.byteLength.toLocaleString()} bytes (${((deflateJson.byteLength / jsonContent.length) * 100).toFixed(1)}%)`)
  console.log(`TOON + Deflate:  ${deflateToon.byteLength.toLocaleString()} bytes (${((deflateToon.byteLength / jsonContent.length) * 100).toFixed(1)}%)`)
  console.log(`BOON + Deflate:  ${deflateBoon.byteLength.toLocaleString()} bytes (${((deflateBoon.byteLength / jsonContent.length) * 100).toFixed(1)}%)`)
  console.log()

  // Brotli (level 11 - maximum)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📦 Brotli (Modern high-performance compression)')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  const brotliJson = brotliCompressSync(jsonBuffer, {
    params: {
      [constants.BROTLI_PARAM_QUALITY]: 11,
    },
  })
  const brotliToon = brotliCompressSync(toonBuffer, {
    params: {
      [constants.BROTLI_PARAM_QUALITY]: 11,
    },
  })
  const brotliBoon = brotliCompressSync(boonBinary, {
    params: {
      [constants.BROTLI_PARAM_QUALITY]: 11,
    },
  })

  console.log(`JSON + Brotli:  ${brotliJson.byteLength.toLocaleString()} bytes (${((brotliJson.byteLength / jsonContent.length) * 100).toFixed(1)}%)`)
  console.log(`TOON + Brotli:  ${brotliToon.byteLength.toLocaleString()} bytes (${((brotliToon.byteLength / jsonContent.length) * 100).toFixed(1)}%)`)
  console.log(`BOON + Brotli:  ${brotliBoon.byteLength.toLocaleString()} bytes (${((brotliBoon.byteLength / jsonContent.length) * 100).toFixed(1)}%)`)
  console.log()

  // Zstandard (level 22 - maximum)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📦 Zstandard (Modern versatile compression)')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  const zstdInstance = await zstd.loadZSTDLibrary()
  const zstdJson = zstdInstance.compress(jsonBuffer, 22)
  const zstdToon = zstdInstance.compress(toonBuffer, 22)
  const zstdBoon = zstdInstance.compress(boonBinary, 22)

  console.log(`JSON + Zstd:  ${zstdJson.byteLength.toLocaleString()} bytes (${((zstdJson.byteLength / jsonContent.length) * 100).toFixed(1)}%)`)
  console.log(`TOON + Zstd:  ${zstdToon.byteLength.toLocaleString()} bytes (${((zstdToon.byteLength / jsonContent.length) * 100).toFixed(1)}%)`)
  console.log(`BOON + Zstd:  ${zstdBoon.byteLength.toLocaleString()} bytes (${((zstdBoon.byteLength / jsonContent.length) * 100).toFixed(1)}%)`)
  console.log()

  // Comparison table
  console.log('╔══════════════════════════════════════════════════════════════════════════╗')
  console.log('║                    COMPLETE COMPARISON TABLE                             ║')
  console.log('╠══════════════════════════════════════════════════════════════════════════╣')
  console.log()

  const results = [
    { format: 'JSON (raw)', size: jsonContent.length, ratio: 100.0 },
    { format: 'TOON (raw)', size: toonString.length, ratio: (toonString.length / jsonContent.length) * 100 },
    { format: 'BOON (raw)', size: boonBinary.byteLength, ratio: (boonBinary.byteLength / jsonContent.length) * 100 },
    { format: 'JSON + Gzip', size: gzipJson.byteLength, ratio: (gzipJson.byteLength / jsonContent.length) * 100 },
    { format: 'TOON + Gzip', size: gzipToon.byteLength, ratio: (gzipToon.byteLength / jsonContent.length) * 100 },
    { format: 'BOON + Gzip', size: gzipBoon.byteLength, ratio: (gzipBoon.byteLength / jsonContent.length) * 100 },
    { format: 'JSON + Deflate', size: deflateJson.byteLength, ratio: (deflateJson.byteLength / jsonContent.length) * 100 },
    { format: 'TOON + Deflate', size: deflateToon.byteLength, ratio: (deflateToon.byteLength / jsonContent.length) * 100 },
    { format: 'BOON + Deflate', size: deflateBoon.byteLength, ratio: (deflateBoon.byteLength / jsonContent.length) * 100 },
    { format: 'JSON + Brotli', size: brotliJson.byteLength, ratio: (brotliJson.byteLength / jsonContent.length) * 100 },
    { format: 'TOON + Brotli', size: brotliToon.byteLength, ratio: (brotliToon.byteLength / jsonContent.length) * 100 },
    { format: 'BOON + Brotli', size: brotliBoon.byteLength, ratio: (brotliBoon.byteLength / jsonContent.length) * 100 },
    { format: 'JSON + Zstd', size: zstdJson.byteLength, ratio: (zstdJson.byteLength / jsonContent.length) * 100 },
    { format: 'TOON + Zstd', size: zstdToon.byteLength, ratio: (zstdToon.byteLength / jsonContent.length) * 100 },
    { format: 'BOON + Zstd', size: zstdBoon.byteLength, ratio: (zstdBoon.byteLength / jsonContent.length) * 100 },
  ].sort((a, b) => a.size - b.size)

  console.log('Ranking by size (smallest to largest):')
  console.log()

  results.forEach((r, i) => {
    const bar = '█'.repeat(Math.round(r.ratio / 2))
    const num = `${i + 1}.`.padStart(3)
    const format = r.format.padEnd(20)
    const size = `${r.size.toLocaleString()} b`.padStart(12)
    const ratio = `${r.ratio.toFixed(1)}%`.padStart(7)
    console.log(`${num} ${format} ${size}  ${ratio}  ${bar}`)
  })

  console.log()
  console.log('╚══════════════════════════════════════════════════════════════════════════╝')
  console.log()

  // Analysis and recommendations
  console.log('📈 ANALYSIS AND RECOMMENDATIONS')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log()

  const best = results[0]
  const boonZstdRank = results.findIndex(r => r.format === 'BOON + Zstd') + 1
  const boonBrotliRank = results.findIndex(r => r.format === 'BOON + Brotli') + 1
  const boonGzipRank = results.findIndex(r => r.format === 'BOON + Gzip') + 1

  console.log(`🏆 Best ratio: ${best.format} (${best.ratio.toFixed(1)}%)`)
  console.log()

  console.log('💡 Recommendations by use case:')
  console.log()
  console.log('📱 Storage / Transmission (size critical):')
  console.log(`   → BOON + Zstd (rank #${boonZstdRank}) - Excellent ratio with fast decoding`)
  console.log()
  console.log('⚡ Real-time performance (fast decoding):')
  console.log(`   → BOON raw - No decompression, direct decoding`)
  console.log()
  console.log('👁️  Human readability (editing, Git diffs):')
  console.log(`   → TOON raw - Compact and readable text format`)
  console.log()
  console.log('🌐 Web / HTTP (standard):')
  console.log(`   → BOON + Brotli (#${boonBrotliRank}) or Gzip (#${boonGzipRank}) - Compatible with all browsers`)
  console.log()

  console.log('📊 Savings vs standard JSON:')
  console.log()
  const boonSaving = ((1 - boonBinary.byteLength / jsonContent.length) * 100).toFixed(1)
  const boonZstdSaving = ((1 - zstdBoon.byteLength / jsonContent.length) * 100).toFixed(1)
  const boonBrotliSaving = ((1 - brotliBoon.byteLength / jsonContent.length) * 100).toFixed(1)
  const jsonGzipSaving = ((1 - gzipJson.byteLength / jsonContent.length) * 100).toFixed(1)

  console.log(`   BOON raw:           -${boonSaving}%`)
  console.log(`   BOON + Zstd:        -${boonZstdSaving}%`)
  console.log(`   BOON + Brotli:      -${boonBrotliSaving}%`)
  console.log(`   JSON + Gzip (std):  -${jsonGzipSaving}%`)
  console.log()

  console.log('✨ BOON advantages:')
  console.log('   • Optimized binary encoding (native types: int8/16/32, float32/64)')
  console.log('   • Direct decoding without decompression')
  console.log('   • Compatible with all standard compressions (Gzip, Brotli, Zstd)')
  console.log('   • Better ratio than JSON even with compression')
  console.log()

  // Save compressed files for reference
  const outputDir = __dirname
  writeFileSync(resolve(outputDir, 'comprehensive-data.json.gz'), gzipJson)
  writeFileSync(resolve(outputDir, 'comprehensive-data.boon.gz'), gzipBoon)
  writeFileSync(resolve(outputDir, 'comprehensive-data.json.br'), brotliJson)
  writeFileSync(resolve(outputDir, 'comprehensive-data.boon.br'), brotliBoon)
  writeFileSync(resolve(outputDir, 'comprehensive-data.json.zst'), zstdJson)
  writeFileSync(resolve(outputDir, 'comprehensive-data.boon.zst'), zstdBoon)

  console.log('💾 Compressed files saved:')
  console.log('   • comprehensive-data.json.gz')
  console.log('   • comprehensive-data.boon.gz')
  console.log('   • comprehensive-data.json.br')
  console.log('   • comprehensive-data.boon.br')
  console.log('   • comprehensive-data.json.zst')
  console.log('   • comprehensive-data.boon.zst')
  console.log()
}

/* eslint-enable no-console */

main().catch(console.error)

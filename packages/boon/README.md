# BOON - Binary Object Notation

[![npm version](https://img.shields.io/npm/v/@boon-format/boon.svg?labelColor=1b1b1f&color=fef3c0)](https://www.npmjs.com/package/@boon-format/boon)
[![License: MIT](https://img.shields.io/badge/license-MIT-fef3c0?labelColor=1b1b1f)](./LICENSE)

**Binary Object Notation (BOON)** is a memory-efficient, cross-platform binary encoding of the JSON data model, designed specifically for AI applications. BOON is the binary counterpart to [TOON](https://github.com/toon-format/toon) (Token-Oriented Object Notation), sharing the same data model while optimizing for machine processing rather than human readability.

## Key Features

- 🚀 **Memory Efficient**: Compact binary encoding with variable-length integers and optimized type tags
- 🌐 **Cross-Platform**: Consistent byte representation across all platforms using big-endian encoding
- 🤖 **AI-Optimized**: Designed for efficient data exchange between AI systems and services
- 🔄 **JSON Compatible**: Lossless round-trip encoding of the complete JSON data model
- 📡 **Streaming Support**: Stream events for memory-efficient processing of large datasets
- 🔢 **Type-Optimized**: Automatic selection of smallest representation for numbers

## Installation

```bash
# npm
npm install @boon-format/boon

# pnpm
pnpm add @boon-format/boon

# yarn
yarn add @boon-format/boon
```

## Quick Start

```ts
import { decode, encode } from '@boon-format/boon'

// Encode JavaScript value to BOON binary
const data = {
  users: [
    { id: 1, name: 'Alice', active: true },
    { id: 2, name: 'Bob', active: false }
  ]
}

const boonData = encode(data)
// Returns Uint8Array containing BOON binary data

// Decode BOON binary back to JavaScript
const decoded = decode(boonData)
// { users: [{ id: 1, name: 'Alice', active: true }, ...] }
```

## API Reference

### `encode(input, options?)`

Encodes a JavaScript value into BOON binary format.

```ts
const boonData = encode({ name: 'Alice', age: 30 })

// Without header (for fragments)
const fragment = encode(data, { includeHeader: false })
```

**Options:**
- `includeHeader?: boolean` - Include magic number and version (default: `true`)
- `initialBufferSize?: number` - Initial buffer size in bytes (default: `4096`)

### `decode(data, options?)`

Decodes BOON binary data into a JavaScript value.

```ts
const value = decode(boonData)

// Decode fragment without header
const fragmentValue = decode(fragment, { expectHeader: false })
```

**Options:**
- `expectHeader?: boolean` - Expect magic number and version (default: `true`)
- `strict?: boolean` - Enable strict validation (default: `true`)

### `decodeStreamSync(data, options?)`

Synchronously decodes BOON binary data into a stream of events.

```ts
for (const event of decodeStreamSync(boonData)) {
  console.log(event)
  // { type: 'header', version: 1 }
  // { type: 'startObject', keyCount: 2 }
  // { type: 'key', key: 'name' }
  // { type: 'primitive', value: 'Alice' }
  // ...
}
```

### `decodeStream(source, options?)`

Asynchronously decodes BOON binary chunks into a stream of events.

```ts
import { createReadStream } from 'node:fs'

const fileStream = createReadStream('data.boon')

for await (const event of decodeStream(fileStream)) {
  console.log(event)
}
```

### `estimateSize(input)`

Estimates the size of BOON encoding without actually encoding.

```ts
const estimatedBytes = estimateSize({ name: 'Alice', scores: [95, 87, 92] })
```

## Binary Format

BOON uses a compact binary format with:

### Header (5 bytes)
- **Magic Number**: `BOON` (4 bytes: `0x42 0x4F 0x4F 0x4E`)
- **Version**: 1 byte (current version: `1`)

### Type Tags
| Type | Tag(s) | Description |
|------|--------|-------------|
| Null | `0x00` | JSON null |
| False | `0x01` | Boolean false |
| True | `0x02` | Boolean true |
| Int8 | `0x10` | Signed 8-bit integer |
| Int16 | `0x11` | Signed 16-bit integer |
| Int32 | `0x12` | Signed 32-bit integer |
| Int64 | `0x13` | Signed 64-bit integer |
| UInt8 | `0x14` | Unsigned 8-bit integer |
| UInt16 | `0x15` | Unsigned 16-bit integer |
| UInt32 | `0x16` | Unsigned 32-bit integer |
| Float32 | `0x20` | IEEE 754 single precision |
| Float64 | `0x21` | IEEE 754 double precision |
| String (empty) | `0x30` | Empty string |
| String (short) | `0x31` | 1-255 byte strings |
| String (medium) | `0x32` | 256-65535 byte strings |
| String (long) | `0x33` | >65535 byte strings |
| Array (empty) | `0x40` | Empty array |
| Array (short) | `0x41` | 1-255 element arrays |
| Array (medium) | `0x42` | 256-65535 element arrays |
| Array (long) | `0x43` | >65535 element arrays |
| Object (empty) | `0x50` | Empty object |
| Object (short) | `0x51` | 1-255 key objects |
| Object (medium) | `0x52` | 256-65535 key objects |
| Object (long) | `0x53` | >65535 key objects |

### Size Efficiency

BOON achieves significant size reductions compared to JSON:

| Data Type | JSON | BOON | Savings |
|-----------|------|------|---------|
| `true` | 4 bytes | 1 byte | 75% |
| `false` | 5 bytes | 1 byte | 80% |
| `null` | 4 bytes | 1 byte | 75% |
| Integer 42 | 2 bytes | 2 bytes | 0% |
| Integer 1000 | 4 bytes | 3 bytes | 25% |
| Empty object `{}` | 2 bytes | 1 byte | 50% |
| Empty array `[]` | 2 bytes | 1 byte | 50% |

For arrays of objects (common in AI applications), BOON typically achieves 30-60% size reduction compared to JSON.

## BOON vs TOON

| Aspect | TOON | BOON |
|--------|------|------|
| Format | Text | Binary |
| Human Readable | Yes | No |
| Machine Efficient | Good | Excellent |
| Use Case | LLM prompts | AI services, storage |
| Compression | Token-optimized | Byte-optimized |

Use **TOON** when you need humans or LLMs to read the data directly.
Use **BOON** when you need maximum efficiency for machine-to-machine communication.

## Cross-Platform Compatibility

BOON ensures consistent encoding across platforms by:

- Using **big-endian** byte order for all multi-byte integers
- Using **UTF-8** encoding for all strings
- Following **IEEE 754** for floating-point numbers
- Using deterministic key ordering (insertion order)

## License

[MIT](./LICENSE) License © 2025-PRESENT

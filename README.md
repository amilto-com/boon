![TOON logo with step‑by‑step guide](./.github/og.png)

# TOON & BOON - AI-Optimized Data Formats

[![CI](https://github.com/toon-format/toon/actions/workflows/ci.yml/badge.svg)](https://github.com/toon-format/toon/actions)
[![npm version TOON](https://img.shields.io/npm/v/@toon-format/toon.svg?labelColor=1b1b1f&color=fef3c0&label=toon)](https://www.npmjs.com/package/@toon-format/toon)
[![npm version BOON](https://img.shields.io/npm/v/@boon-format/boon.svg?labelColor=1b1b1f&color=fef3c0&label=boon)](https://www.npmjs.com/package/@boon-format/boon)
[![License: MIT](https://img.shields.io/badge/license-MIT-fef3c0?labelColor=1b1b1f)](./LICENSE)

This repository contains two complementary data formats optimized for AI applications:

| Package | Description | Documentation |
|---------|-------------|---------------|
| **[@toon-format/toon](https://www.npmjs.com/package/@toon-format/toon)** | Human-readable, token-efficient text format for LLM prompts | [TOON Docs](./packages/toon/README.md) |
| **[@boon-format/boon](https://www.npmjs.com/package/@boon-format/boon)** | Memory-efficient binary format for cross-platform AI services | [BOON Docs](./packages/boon/README.md) |

Both formats share the JSON data model and provide lossless round-trip encoding.

## Quick Start

\`\`\`bash
# Install TOON (text format for LLM prompts)
npm install @toon-format/toon

# Install BOON (binary format for machine-to-machine)
npm install @boon-format/boon
\`\`\`

\`\`\`ts
// TOON - Token-efficient text for LLMs
import { encode as toonEncode } from '@toon-format/toon'

const toonOutput = toonEncode({ users: [{ id: 1, name: 'Alice' }] })
// users[1]{id,name}:
//   1,Alice

// BOON - Memory-efficient binary for services
import { encode as boonEncode, decode as boonDecode } from '@boon-format/boon'

const binaryData = boonEncode({ users: [{ id: 1, name: 'Alice' }] })
// Uint8Array - compact binary representation

const decoded = boonDecode(binaryData)
// { users: [{ id: 1, name: 'Alice' }] }
\`\`\`

## Format Comparison

| Feature | TOON | BOON |
|---------|------|------|
| **Format** | Text | Binary |
| **Human Readable** | ✅ Yes | ❌ No |
| **Token Efficient** | ✅ Excellent (40% fewer tokens than JSON) | N/A |
| **Byte Efficient** | ✅ Good | ✅ Excellent (30-80% smaller than JSON) |
| **LLM Input** | ✅ Optimized | ❌ Not suitable |
| **Machine-to-Machine** | ✅ Good | ✅ Excellent |
| **Streaming Support** | ✅ Yes | ✅ Yes |
| **Cross-Platform** | ✅ UTF-8 | ✅ Big-endian binary |

### When to Use Each Format

**Use TOON when:**
- Sending data to LLMs (ChatGPT, Claude, etc.)
- Humans need to read or debug the data
- Token costs matter in your AI pipeline
- Working with text-based APIs

**Use BOON when:**
- Exchanging data between AI services/microservices
- Storing data efficiently in databases or files
- Network bandwidth is a concern
- Working with binary protocols (WebSocket, gRPC)

---

# TOON (Token-Oriented Object Notation)

📖 **Full documentation: [packages/toon/README.md](./packages/toon/README.md)**

**Token-Oriented Object Notation** is a compact, human-readable encoding of the JSON data model that minimizes tokens and makes structure easy for models to follow.

### Why TOON?

JSON is verbose and token-expensive. TOON reduces token count by ~40% while maintaining full JSON compatibility:

**JSON (verbose):**
\`\`\`json
{
  "users": [
    { "id": 1, "name": "Alice", "role": "admin" },
    { "id": 2, "name": "Bob", "role": "user" }
  ]
}
\`\`\`

**TOON (compact):**
\`\`\`
users[2]{id,name,role}:
  1,Alice,admin
  2,Bob,user
\`\`\`

### Key Features

- 📊 **Token-Efficient**: ~40% fewer tokens than JSON
- 🔁 **JSON Compatible**: Lossless round-trip encoding
- 🛤️ **LLM-Friendly**: Explicit \`[N]\` lengths and \`{fields}\` headers
- 📐 **Minimal Syntax**: YAML-like readability with CSV-style compactness

### Installation

\`\`\`bash
npm install @toon-format/toon
\`\`\`

### Usage

\`\`\`ts
import { encode, decode } from '@toon-format/toon'

// Encode JSON to TOON
const toon = encode({ users: [{ id: 1, name: 'Alice' }] })

// Decode TOON to JSON
const json = decode(toon)
\`\`\`

See the [TOON README](./packages/toon/README.md) for complete documentation including benchmarks, CLI usage, and LLM integration guides.

---

# BOON (Binary Object Notation)

📖 **Full documentation: [packages/boon/README.md](./packages/boon/README.md)**

**Binary Object Notation (BOON)** is a memory-efficient, cross-platform binary encoding of the JSON data model, designed specifically for AI applications.

### Why BOON?

BOON provides significant size reductions compared to JSON:

| Data Type | JSON | BOON | Savings |
|-----------|------|------|---------|
| \`true\` | 4 bytes | 1 byte | 75% |
| \`false\` | 5 bytes | 1 byte | 80% |
| \`null\` | 4 bytes | 1 byte | 75% |
| Integer 42 | 2 bytes | 2 bytes | 0% |
| Integer 1000 | 4 bytes | 3 bytes | 25% |
| Empty \`{}\` | 2 bytes | 1 byte | 50% |

For arrays of objects (common in AI applications), BOON typically achieves **30-60% size reduction** compared to JSON.

### Key Features

- 🚀 **Memory Efficient**: Compact binary encoding with optimized type tags
- 🌐 **Cross-Platform**: Consistent byte representation using big-endian encoding
- 🤖 **AI-Optimized**: Designed for efficient data exchange between AI systems
- 🔄 **JSON Compatible**: Lossless round-trip encoding
- 📡 **Streaming Support**: Stream events for memory-efficient processing

### Installation

\`\`\`bash
npm install @boon-format/boon
\`\`\`

### Usage

\`\`\`ts
import { encode, decode, decodeStreamSync } from '@boon-format/boon'

// Encode to binary
const boon = encode({ users: [{ id: 1, name: 'Alice' }] })
// Returns Uint8Array

// Decode from binary
const data = decode(boon)

// Stream decode for large datasets
for (const event of decodeStreamSync(boon)) {
  console.log(event)
  // { type: 'startObject', keyCount: 1 }
  // { type: 'key', key: 'users' }
  // ...
}
\`\`\`

### Binary Format

BOON uses a 5-byte header (\`BOON\` magic + version) followed by type-tagged values:

| Type | Tag Range | Description |
|------|-----------|-------------|
| Primitives | \`0x00-0x02\` | null, false, true |
| Integers | \`0x10-0x16\` | int8/16/32/64, uint8/16/32 |
| Floats | \`0x20-0x21\` | float32, float64 |
| Strings | \`0x30-0x33\` | UTF-8 encoded |
| Arrays | \`0x40-0x43\` | Ordered collections |
| Objects | \`0x50-0x53\` | Key-value maps |

See the [BOON README](./packages/boon/README.md) for complete API documentation.

---

## Credits

- Logo design by [鈴木ックス(SZKX)](https://x.com/szkx_art)

## License

[MIT](./LICENSE) License © 2025-PRESENT [Johann Schopplich](https://github.com/johannschopplich)

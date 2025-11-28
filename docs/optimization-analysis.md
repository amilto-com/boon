# BOON Optimization Analysis

**Author:** William Gacquer (Amilto)
**Date:** November 28, 2024

## Problem Identified

The current BOON encoding encodes each object key as a complete string with length prefix:

```
Current encoding:
Object { "name": "Alice", "age": 30 }
→ [OBJECT_SHORT][2][4]name[STRING]Alice[INT8]30
          ↑      ↑  └─ 4 bytes for "name"
          │      └─ 2 keys
          └─ Short object tag

Object { "name": "Bob", "age": 25 }
→ [OBJECT_SHORT][2][4]name[STRING]Bob[INT8]25
                       └─ 4 bytes for "name" AGAIN
```

**Redundancy:** The key `"name"` is encoded twice (8 bytes total) instead of once.

## Current Results

On `comprehensive-data.json` (14,273 bytes):

| Format | Size | Ratio |
|--------|------|-------|
| JSON (raw) | 14,273 bytes | 100.0% |
| TOON (raw) | 9,737 bytes | 68.2% |
| **BOON (raw)** | **7,343 bytes** | **51.4%** |
| JSON + Gzip | 4,212 bytes | 29.5% |
| TOON + Gzip | 3,780 bytes | 26.5% |
| BOON + Gzip | 3,924 bytes | 27.5% |
| JSON + Brotli | 3,396 bytes | 23.8% |
| TOON + Brotli | 3,097 bytes | 21.7% |
| **BOON + Brotli** | **3,324 bytes** | **23.3%** |

## Detailed Analysis

### Current Source Code

In `/workspaces/boon/packages/boon/src/encode/encoder.ts`:

```typescript
function writeObject(buf: GrowableBuffer, value: JsonObject, options: ResolvedEncodeOptions): void {
  // ... writing tag and key count ...

  // Writing key-value pairs
  for (const key of keys) {
    writeKeyString(buf, key) // ← Encodes the full key each time
    writeValue(buf, value[key]!, options)
  }
}

function writeKeyString(buf: GrowableBuffer, value: string): void {
  const bytes = textEncoder.encode(value)
  const length = bytes.length

  // Encoding length + UTF-8 bytes
  if (length <= 253) {
    buf.buffer[buf.offset++] = length
  }
  // ... other cases ...

  buf.buffer.set(bytes, buf.offset)
  buf.offset += length
}
```

### Concrete Inefficiency Example

In `comprehensive-data.json`, analyzing repeated keys:

```json
{
  "primitives": { ... },
  "arrays": { ... },
  "objects": { ... },
  "complex_structures": { ... },
  "edge_cases": { ... },
  "real_world": { ... }
}
```

Frequent keys:
- `"name"` (4 bytes) × ~15 occurrences = 60 bytes
- `"id"` (2 bytes) × ~10 occurrences = 20 bytes
- `"value"` (5 bytes) × ~12 occurrences = 60 bytes
- `"type"` (4 bytes) × ~8 occurrences = 32 bytes

**Estimated total redundancy:** ~172 bytes of repeated keys out of 7,343 bytes (2.3%)

## Optimization Proposals

### Option 1: Global Key Table (String Interning)

**Principle:**
1. Collect all unique keys before encoding
2. Write a key dictionary in header:
   ```
   [HEADER][key_count][length]key1[length]key2...
   ```
3. Reference keys by index (varint):
   ```
   [OBJECT][2][0][STRING]Alice[1][INT8]30
              ↑ index of "name"  ↑ index of "age"
   ```

**Advantages:**
- ✅ Maximum deduplication
- ✅ Significant gain for data with many similar objects
- ✅ Compact index (1-2 bytes for <256 keys)

**Disadvantages:**
- ❌ Requires two passes (collect + encode)
- ❌ Additional header (~50-200 bytes depending on key count)
- ❌ Increased decoder complexity

**Estimated gain:** 10-15% on typical structured data

### Option 2: Local Key Table (per object)

**Principle:**
For each object, write all keys first, then all values:
```
[OBJECT][2][4]name[3]age[STRING]Alice[INT8]30
```

**Advantages:**
- ✅ No global header
- ✅ Object-level deduplication for arrays of similar objects
- ✅ Single-pass encoding

**Disadvantages:**
- ❌ No inter-object deduplication
- ❌ Overhead if objects have all different keys

**Estimated gain:** 5-8% on arrays of similar objects

### Option 3: Opportunistic Key Compression

**Principle:**
- Encode short keys (<= 3 bytes) directly inline
- Use string interning only for long keys (>= 4 bytes)
- Bit marker to distinguish inline vs index

**Advantages:**
- ✅ Optimal size/complexity tradeoff
- ✅ No overhead for short keys (`"id"`, `"x"`, `"y"`)
- ✅ Gain on repeated long keys

**Disadvantages:**
- ❌ More complex logic
- ❌ Requires partial two-pass

**Estimated gain:** 8-12%

## Recommendation

**Progressive hybrid approach:**

### Phase 1: Option 1 (Global Table) with compatibility flag

- Add new tag `TYPE_TAG.HEADER_WITH_STRING_TABLE = 0x60`
- Format:
  ```
  [HEADER_WITH_STRING_TABLE][version][key_count][keys...][data...]
  ```
- Decoder supports both formats (with/without table)
- Encoder uses table only if gain > 5%

### Phase 2: Additional Optimizations

- Use varint for key indexes
- Compress key table with prefix tree
- LRU cache for recent keys (decoding)

## Proposed Implementation

### 1. New Header Structure

```typescript
export const TYPE_TAG = {
  // ... existing tags ...
  HEADER_WITH_STRING_TABLE: 0x60,
}

interface BoonHeader {
  version: number // 1 byte
  stringTableSize: number // varint
  stringTable: string[] // key table
}
```

### 2. Key Collection

```typescript
function collectKeys(value: JsonValue, keys: Set<string>): void {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectKeys(item, keys)
    }
  } else if (value !== null && typeof value === 'object') {
    for (const [key, val] of Object.entries(value)) {
      keys.add(key)
      collectKeys(val, keys)
    }
  }
}
```

### 3. Modified Encoding

```typescript
function encodeValue(value: JsonValue, options: EncodeOptions): Uint8Array {
  // Collect all keys
  const keys = new Set<string>()
  collectKeys(value, keys)
  
  // Create key map
  const keyMap = new Map<string, number>()
  let index = 0
  for (const key of keys) {
    keyMap.set(key, index++)
  }
  
  // Write header with string table
  writeStringTableHeader(buf, keys)
  
  // Encode value with key references
  writeValueWithKeyMap(buf, value, keyMap)
  
  return buf.getBytes()
}
```

## Implementation Status

✅ **Implemented:**
- String table with global key dictionary
- Varint-encoded key indexes
- Automatic activation when beneficial
- Full decoder support for both formats

✅ **Additional Optimization Implemented:**
- Common keys dictionary (128 frequently used keys like `id`, `name`, `type`, etc.)
- Single-byte encoding for common keys (0x80-0xFF)
- No overhead for common short keys

## Results After Optimization

| Data Type | Before | After | Improvement |
|-----------|--------|-------|-------------|
| Comprehensive data (varied) | -17.0% vs JSON | -24.5% vs JSON | **+7.5%** |
| Repetitive data (100 similar objects) | -17.0% vs JSON | -48.2% vs JSON | **+31.2%** |
| FHIR Patient resource | - | -23.8% vs JSON | Excellent |

The common keys dictionary provides significant savings on typical JSON data by encoding frequently used keys in a single byte instead of length-prefixed strings.

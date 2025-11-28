# BOON v2 Specification

## Overview

BOON (Binary Object Notation) v2 is a compact binary encoding of JSON data with streaming support.

## Requirements

### REQ-001: Magic Number Validation
The decoder SHALL validate that input begins with magic bytes `0x42 0x4F 0x4F 0x4E` ("BOON").

**Acceptance Criteria:**
- Valid magic: decode proceeds
- Invalid magic: throws `InvalidMagicError`

### REQ-002: Version Validation  
The decoder SHALL validate that byte 5 equals `0x01` (version 1).

**Acceptance Criteria:**
- Version 1: decode proceeds
- Other versions: throws `UnsupportedVersionError`

### REQ-003: Null Encoding
Tag `0x00` SHALL encode JSON `null` with no payload.

**Acceptance Criteria:**
- `encode(null)` → `[...header, 0x00]`
- `decode([...header, 0x00])` → `null`

### REQ-004: Boolean Encoding
Tag `0x01` SHALL encode `false`, tag `0x02` SHALL encode `true`, with no payload.

**Acceptance Criteria:**
- `encode(false)` → `[...header, 0x01]`
- `encode(true)` → `[...header, 0x02]`
- Roundtrip preserves value

### REQ-005: Integer Encoding (Zigzag + Varint)
Tag `0x10` SHALL encode integers using zigzag encoding followed by unsigned varint.

**Zigzag mapping:**
- `0` → `0`
- `-1` → `1`
- `1` → `2`
- `-2` → `3`
- `n` → `(n << 1) ^ (n >> 63)`

**Acceptance Criteria:**
- `encode(0)` → `[...header, 0x10, 0x00]`
- `encode(1)` → `[...header, 0x10, 0x02]`
- `encode(-1)` → `[...header, 0x10, 0x01]`
- `encode(127)` → `[...header, 0x10, 0xFE, 0x01]`
- `encode(-128)` → `[...header, 0x10, 0xFF, 0x01]`
- Roundtrip preserves all integers in safe range

### REQ-006: Float64 Encoding
Tag `0x11` SHALL encode 64-bit IEEE 754 floats in little-endian format.

**Acceptance Criteria:**
- `encode(3.14159)` produces 9 bytes (tag + 8 bytes)
- `encode(Infinity)`, `encode(-Infinity)`, `encode(NaN)` supported
- Roundtrip preserves float values

### REQ-007: String Encoding
Tag `0x20` SHALL encode non-empty strings as varint length + UTF-8 bytes.
Tag `0x21` SHALL encode empty strings with no payload.

**Acceptance Criteria:**
- `encode("")` → `[...header, 0x21]`
- `encode("hello")` → `[...header, 0x20, 0x05, ...utf8("hello")]`
- Unicode strings preserved
- Invalid UTF-8 in input: throws `InvalidUtf8Error`

### REQ-008: Array Encoding (Definite Length)
Tag `0x30` SHALL encode non-empty arrays as varint count + values.
Tag `0x31` SHALL encode empty arrays with no payload.

**Acceptance Criteria:**
- `encode([])` → `[...header, 0x31]`
- `encode([1, 2])` → `[...header, 0x30, 0x02, <encoded 1>, <encoded 2>]`
- Nested arrays supported
- Roundtrip preserves order and values

### REQ-009: Array Encoding (Indefinite Length)
Tag `0x3F` SHALL encode indefinite-length arrays, terminated by `0xFF` break.

**Acceptance Criteria:**
- `encodeIndefinite([1, 2])` → `[...header, 0x3F, <encoded 1>, <encoded 2>, 0xFF]`
- Decoder handles both definite and indefinite arrays identically
- Break outside container: throws `UnexpectedBreakError`

### REQ-010: Object Encoding (Definite Length)
Tag `0x40` SHALL encode non-empty objects as varint count + key/value pairs.
Tag `0x41` SHALL encode empty objects with no payload.
Keys encoded as: varint length + UTF-8 bytes (no type tag).

**Acceptance Criteria:**
- `encode({})` → `[...header, 0x41]`
- `encode({a: 1})` → `[...header, 0x40, 0x01, 0x01, 0x61, <encoded 1>]`
- Key order preserved (insertion order)
- Duplicate keys: last value wins

### REQ-011: Object Encoding (Indefinite Length)
Tag `0x4F` SHALL encode indefinite-length objects, terminated by `0xFF` break.

**Acceptance Criteria:**
- `encodeIndefinite({a: 1})` → `[...header, 0x4F, 0x01, 0x61, <encoded 1>, 0xFF]`
- Decoder handles both definite and indefinite objects identically

### REQ-012: Varint Encoding
Unsigned varints use continuation-bit encoding (7 bits per byte, MSB = continuation).

**Acceptance Criteria:**
- `0` → `[0x00]`
- `127` → `[0x7F]`
- `128` → `[0x80, 0x01]`
- `16383` → `[0xFF, 0x7F]`
- `16384` → `[0x80, 0x80, 0x01]`

### REQ-013: Error Handling
The decoder SHALL reject malformed input with specific errors.

**Acceptance Criteria:**
- Truncated data: throws `TruncatedDataError`
- Unknown tag (0x80+): throws `UnknownTagError`
- Invalid UTF-8: throws `InvalidUtf8Error`

### REQ-014: Reserved Tag Ranges
Tags 0x50-0x5F, 0x60-0x6F, 0x70-0x7F SHALL be reserved.
Tags 0x70-0x7F MAY be used by applications (decoder skips with warning or errors).

**Acceptance Criteria:**
- Decoder encountering 0x50-0x6F: throws `ReservedTagError`
- Decoder encountering 0x70-0x7F: configurable (skip or error)

### REQ-015: JSON Roundtrip
Any valid JSON value SHALL roundtrip through encode/decode unchanged.

**Acceptance Criteria:**
- `decode(encode(value))` equals `value` for all JSON types
- Nested structures preserved
- Large arrays/objects (10000+ items) supported

## Non-Requirements

- Binary blob support (JSON has no binary type)
- Date/timestamp semantic types (encode as strings)
- String deduplication (optional encoder optimization, not in v2.0)
- Random access / skip-ahead (sequential decode only)

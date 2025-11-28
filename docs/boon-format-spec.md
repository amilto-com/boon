# BOON Binary Format Specification v2

BOON (Binary Object Notation) is a compact binary encoding of JSON data, designed with lessons from CBOR, MessagePack, and UBJSON.

## Design Principles

1. **Simplicity**: Single type tags with varint lengths, not multiple width variants
2. **Streaming**: Indefinite-length containers supported
3. **Extensibility**: Reserved tag ranges, no baked-in dictionaries
4. **JSON-faithful**: Maps exactly to JSON data model (no binary blobs, dates as strings)

## File Structure

```
┌─────────────────────────────────────────┐
│ Magic Number: "BOON" (4 bytes)          │
│ 0x42 0x4F 0x4F 0x4E                     │
├─────────────────────────────────────────┤
│ Version: 1 byte (currently 0x01)        │
├─────────────────────────────────────────┤
│ Root Value                              │
└─────────────────────────────────────────┘
```

No global string table. Deduplication is encoder's choice via back-references.

## Type Tags (Single Byte)

| Tag | Type | Payload |
|-----|------|---------|
| 0x00 | null | (none) |
| 0x01 | false | (none) |
| 0x02 | true | (none) |
| 0x10 | integer | zigzag varint |
| 0x11 | float64 | 8 bytes IEEE 754 LE |
| 0x20 | string | varint length + UTF-8 |
| 0x21 | string (empty) | (none) |
| 0x30 | array | varint count + values |
| 0x31 | array (empty) | (none) |
| 0x3F | array (indefinite) | values + 0xFF break |
| 0x40 | object | varint count + key/value pairs |
| 0x41 | object (empty) | (none) |
| 0x4F | object (indefinite) | key/value pairs + 0xFF break |
| 0x50-0x5F | reserved | future extensions |
| 0x60-0x6F | reserved | string back-reference (optional) |
| 0xFF | break | end of indefinite container |

### Reserved Ranges
- 0x50-0x5F: Future type extensions
- 0x60-0x6F: Optional string deduplication (encoder choice)
- 0x70-0x7F: Application-specific tags
- 0x80-0xFE: Reserved for future use

## Varint Encoding

Unsigned varints use continuation-bit encoding (little-endian, 7 bits per byte):

```
Byte format: [C DDDDDDD]
  C = continuation bit (1 = more bytes follow)
  D = 7 data bits

Value 0-127:      1 byte   [0xxxxxxx]
Value 128-16383:  2 bytes  [1xxxxxxx] [0xxxxxxx]
Value 16384+:     3+ bytes [1xxxxxxx] [1xxxxxxx] [0xxxxxxx]
```

**Zigzag encoding** for signed integers maps negative values to positive:
```
encode(n) = (n << 1) ^ (n >> 63)   # arithmetic right shift
decode(z) = (z >>> 1) ^ -(z & 1)   # logical right shift
```

| Value | Zigzag | Varint bytes |
|-------|--------|--------------|
| 0 | 0 | 0x00 |
| -1 | 1 | 0x01 |
| 1 | 2 | 0x02 |
| -2 | 3 | 0x03 |
| 127 | 254 | 0xFE 0x01 |
| -128 | 255 | 0xFF 0x01 |

## Object Keys

Object keys are always strings, encoded as: `varint_length + UTF-8_bytes`

No pre-defined key dictionary. Encoders MAY implement string deduplication using tag range 0x60-0x6F (back-references), but this is optional and encoder-specific.

## Decoding Algorithm

```python
def decode(data: bytes) -> any:
    # Validate header
    assert data[0:4] == b"BOON", "Invalid magic"
    assert data[4] == 1, "Unsupported version"
    
    pos = 5
    value, pos = read_value(data, pos)
    return value

def read_varint(data: bytes, pos: int) -> tuple[int, int]:
    """Returns (value, new_pos)"""
    result = 0
    shift = 0
    while True:
        byte = data[pos]
        pos += 1
        result |= (byte & 0x7F) << shift
        if (byte & 0x80) == 0:
            break
        shift += 7
    return result, pos

def zigzag_decode(z: int) -> int:
    return (z >> 1) ^ -(z & 1)

def read_value(data: bytes, pos: int) -> tuple[any, int]:
    tag = data[pos]
    pos += 1
    
    if tag == 0x00:
        return None, pos
    elif tag == 0x01:
        return False, pos
    elif tag == 0x02:
        return True, pos
    
    elif tag == 0x10:  # integer
        z, pos = read_varint(data, pos)
        return zigzag_decode(z), pos
    
    elif tag == 0x11:  # float64
        value = struct.unpack_from('<d', data, pos)[0]
        return value, pos + 8
    
    elif tag == 0x20:  # string
        length, pos = read_varint(data, pos)
        s = data[pos:pos+length].decode('utf-8')
        return s, pos + length
    elif tag == 0x21:  # empty string
        return "", pos
    
    elif tag == 0x30:  # array
        count, pos = read_varint(data, pos)
        arr = []
        for _ in range(count):
            item, pos = read_value(data, pos)
            arr.append(item)
        return arr, pos
    elif tag == 0x31:  # empty array
        return [], pos
    elif tag == 0x3F:  # indefinite array
        arr = []
        while data[pos] != 0xFF:
            item, pos = read_value(data, pos)
            arr.append(item)
        return arr, pos + 1  # skip break byte
    
    elif tag == 0x40:  # object
        count, pos = read_varint(data, pos)
        obj = {}
        for _ in range(count):
            key, pos = read_string(data, pos)
            value, pos = read_value(data, pos)
            obj[key] = value
        return obj, pos
    elif tag == 0x41:  # empty object
        return {}, pos
    elif tag == 0x4F:  # indefinite object
        obj = {}
        while data[pos] != 0xFF:
            key, pos = read_string(data, pos)
            value, pos = read_value(data, pos)
            obj[key] = value
        return obj, pos + 1  # skip break byte
    
    elif tag == 0xFF:
        raise ValueError("Unexpected break outside container")
    else:
        raise ValueError(f"Unknown tag: 0x{tag:02X}")

def read_string(data: bytes, pos: int) -> tuple[str, int]:
    """Read a bare string (for object keys)"""
    length, pos = read_varint(data, pos)
    s = data[pos:pos+length].decode('utf-8')
    return s, pos + length
```

## Error Handling

Decoders MUST reject:
- Invalid magic number
- Unsupported version
- Unknown tags outside reserved ranges (0x70-0x7F allowed, 0x80+ error)
- Truncated data
- Invalid UTF-8 in strings
- Break (0xFF) outside indefinite container

Decoders SHOULD accept:
- Duplicate object keys (last value wins, per JSON)
- Tags 0x70-0x7F (skip using application-defined logic or error)

## Example

JSON: `{"id": 1, "name": "test"}`

BOON v2 bytes:
```
42 4F 4F 4E    # Magic "BOON"
01             # Version 1
40             # object
02             # varint count = 2
02 69 64       # key: varint 2 + "id"
10 02          # integer: zigzag(1) = 2
04 6E 61 6D 65 # key: varint 4 + "name"  
20 04 74 65 73 74  # string: varint 4 + "test"
```

Total: 21 bytes (vs 24 bytes JSON = -12%)

## Comparison with v1

| Aspect | v1 | v2 |
|--------|----|----|
| Integer types | 7 tags (INT8-UINT32) | 1 tag + zigzag varint |
| String types | 4 tags (empty/short/medium/long) | 2 tags (empty/normal) |
| Container types | 12 tags (3 sizes × 4 types) | 6 tags + indefinite |
| Streaming | No | Yes (indefinite containers) |
| Pre-defined keys | 128 baked-in | None (extensible) |
| String dedup | Global table (0x60) | Optional back-refs (0x60-0x6F) |

## Why Not CBOR/MessagePack?

BOON v2 is intentionally simpler than CBOR:
- No semantic tags (dates, bignums, etc.) - JSON doesn't have them
- No binary blob type - JSON is text-only
- Simpler tag layout - easier to implement
- "BOON" magic header - explicit file identification

Use CBOR if you need: binary data, semantic types, or ecosystem compatibility.
Use BOON if you need: minimal JSON-faithful binary encoding with streaming.


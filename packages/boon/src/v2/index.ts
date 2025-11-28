/**
 * BOON v2 - Binary Object Notation
 *
 * Implements the BOON v2 specification from docs/boon-format-spec.md
 * JSON-faithful binary encoding with streaming support.
 */

// Error classes
export class InvalidMagicError extends Error {
  constructor() {
    super('Invalid magic number: expected BOON')
    this.name = 'InvalidMagicError'
  }
}

export class UnsupportedVersionError extends Error {
  constructor(version: number) {
    super(`Unsupported version: ${version}`)
    this.name = 'UnsupportedVersionError'
  }
}

export class TruncatedDataError extends Error {
  constructor(message = 'Unexpected end of data') {
    super(message)
    this.name = 'TruncatedDataError'
  }
}

export class UnknownTagError extends Error {
  constructor(tag: number) {
    super(`Unknown tag: 0x${tag.toString(16).padStart(2, '0')}`)
    this.name = 'UnknownTagError'
  }
}

export class UnexpectedBreakError extends Error {
  constructor() {
    super('Unexpected break marker outside indefinite container')
    this.name = 'UnexpectedBreakError'
  }
}

export class InvalidUtf8Error extends Error {
  constructor() {
    super('Invalid UTF-8 encoding')
    this.name = 'InvalidUtf8Error'
  }
}

/**
 * Type tags from BOON v2 spec
 */
export const TAG = {
  // Primitives
  NULL: 0x00,
  FALSE: 0x01,
  TRUE: 0x02,

  // Numbers
  INT: 0x10, // zigzag varint
  FLOAT64: 0x11, // 8 bytes IEEE 754 LE

  // Strings
  STRING: 0x20, // varint length + UTF-8
  STRING_EMPTY: 0x21, // (none)

  // Arrays
  ARRAY: 0x30, // varint count + values
  ARRAY_EMPTY: 0x31, // (none)
  ARRAY_INDEF: 0x3F, // values + 0xFF break

  // Objects
  OBJECT: 0x40, // varint count + key/value pairs
  OBJECT_EMPTY: 0x41, // (none)
  OBJECT_INDEF: 0x4F, // key/value pairs + 0xFF break

  // Control
  BREAK: 0xFF, // end of indefinite container
} as const

// Magic number "BOON"
const MAGIC = new Uint8Array([0x42, 0x4F, 0x4F, 0x4E])
const VERSION = 1

/**
 * Encode a JavaScript value to BOON v2 binary format
 */
export function encode(value: unknown): Uint8Array {
  const chunks: number[] = []

  // Write header
  chunks.push(...MAGIC, VERSION)

  // Encode value
  encodeValue(value, chunks)

  return new Uint8Array(chunks)
}

function encodeValue(value: unknown, out: number[]): void {
  if (value === null) {
    out.push(TAG.NULL)
    return
  }

  if (typeof value === 'boolean') {
    out.push(value ? TAG.TRUE : TAG.FALSE)
    return
  }

  if (typeof value === 'number') {
    // Only encode as integer if it's a safe integer
    // and zigzag won't overflow (so max ~2^52)
    const MAX_ZIGZAG_SAFE = 2 ** 52
    if (Number.isInteger(value) && Math.abs(value) <= MAX_ZIGZAG_SAFE) {
      out.push(TAG.INT)
      encodeZigzagVarint(value, out)
    } else {
      out.push(TAG.FLOAT64)
      encodeFloat64(value, out)
    }
    return
  }

  if (typeof value === 'string') {
    if (value.length === 0) {
      out.push(TAG.STRING_EMPTY)
    } else {
      out.push(TAG.STRING)
      const bytes = new TextEncoder().encode(value)
      encodeVarint(bytes.length, out)
      out.push(...bytes)
    }
    return
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      out.push(TAG.ARRAY_EMPTY)
    } else {
      out.push(TAG.ARRAY)
      encodeVarint(value.length, out)
      for (const item of value) {
        encodeValue(item, out)
      }
    }
    return
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
    if (entries.length === 0) {
      out.push(TAG.OBJECT_EMPTY)
    } else {
      out.push(TAG.OBJECT)
      encodeVarint(entries.length, out)
      for (const [key, val] of entries) {
        // Encode key as bare string (varint length + UTF-8)
        const keyBytes = new TextEncoder().encode(key)
        encodeVarint(keyBytes.length, out)
        out.push(...keyBytes)
        // Encode value
        encodeValue(val, out)
      }
    }
    return
  }

  throw new Error(`Cannot encode value of type ${typeof value}`)
}

/**
 * Encode an unsigned integer as varint (LEB128)
 * Uses BigInt for numbers larger than 32 bits
 */
export function encodeVarint(value: number, out: number[]): void {
  if (value < 0) {
    throw new Error('Varint cannot encode negative numbers')
  }

  // Use BigInt for large numbers to avoid 32-bit truncation
  let n = BigInt(value)
  do {
    let byte = Number(n & 0x7Fn)
    n >>= 7n
    if (n !== 0n) {
      byte |= 0x80
    }
    out.push(byte)
  } while (n !== 0n)
}

/**
 * Encode a signed integer using zigzag encoding then varint
 */
export function encodeZigzagVarint(value: number, out: number[]): void {
  // Zigzag encode: maps negative to odd, positive to even
  // 0->0, -1->1, 1->2, -2->3, 2->4...
  const zigzag = value >= 0 ? value * 2 : -value * 2 - 1
  encodeVarint(zigzag, out)
}

function encodeFloat64(value: number, out: number[]): void {
  const buffer = new ArrayBuffer(8)
  new DataView(buffer).setFloat64(0, value, true) // little-endian
  out.push(...new Uint8Array(buffer))
}

/**
 * Decode BOON v2 binary data to JavaScript value
 */
export function decode(data: Uint8Array): unknown {
  let pos = 0

  // Validate magic number
  if (
    data.length < 5 ||
    data[0] !== MAGIC[0] ||
    data[1] !== MAGIC[1] ||
    data[2] !== MAGIC[2] ||
    data[3] !== MAGIC[3]
  ) {
    throw new InvalidMagicError()
  }

  // Validate version
  const version = data[4]!
  if (version !== VERSION) {
    throw new UnsupportedVersionError(version)
  }

  pos = 5

  function readVarint(): number {
    let result = 0n
    let shift = 0n
    while (pos < data.length) {
      const byte = data[pos++]!
      result |= BigInt(byte & 0x7F) << shift
      if ((byte & 0x80) === 0) {
        return Number(result)
      }
      shift += 7n
      if (shift > 63n) {
        throw new Error('Varint too long')
      }
    }
    throw new TruncatedDataError()
  }

  function readZigzag(): number {
    const n = readVarint()
    // Zigzag decode: (n >> 1) ^ -(n & 1)
    // Use Math.floor for division to handle large numbers (>>> is 32-bit only)
    const half = Math.floor(n / 2)
    return (n & 1) === 0 ? half : -(half + 1)
  }

  function readFloat64(): number {
    if (pos + 8 > data.length) {
      throw new TruncatedDataError()
    }
    const view = new DataView(data.buffer, data.byteOffset + pos, 8)
    pos += 8
    return view.getFloat64(0, true) // little-endian
  }

  function readString(length: number): string {
    if (pos + length > data.length) {
      throw new TruncatedDataError()
    }
    const bytes = data.slice(pos, pos + length)
    pos += length
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  }

  function readValue(): unknown {
    if (pos >= data.length) {
      throw new TruncatedDataError()
    }

    const tag = data[pos++]!

    switch (tag) {
      case TAG.NULL:
        return null

      case TAG.FALSE:
        return false

      case TAG.TRUE:
        return true

      case TAG.INT:
        return readZigzag()

      case TAG.FLOAT64:
        return readFloat64()

      case TAG.STRING: {
        const length = readVarint()
        return readString(length)
      }

      case TAG.STRING_EMPTY:
        return ''

      case TAG.ARRAY: {
        const count = readVarint()
        const arr: unknown[] = []
        for (let i = 0; i < count; i++) {
          arr.push(readValue())
        }
        return arr
      }

      case TAG.ARRAY_EMPTY:
        return []

      case TAG.ARRAY_INDEF: {
        const arr: unknown[] = []
        while (pos < data.length && data[pos] !== TAG.BREAK) {
          arr.push(readValue())
        }
        if (pos >= data.length) {
          throw new TruncatedDataError()
        }
        pos++ // consume BREAK
        return arr
      }

      case TAG.OBJECT: {
        const count = readVarint()
        const obj: Record<string, unknown> = {}
        for (let i = 0; i < count; i++) {
          const keyLength = readVarint()
          const key = readString(keyLength)
          const val = readValue()
          obj[key] = val
        }
        return obj
      }

      case TAG.OBJECT_EMPTY:
        return {}

      case TAG.OBJECT_INDEF: {
        const obj: Record<string, unknown> = {}
        while (pos < data.length && data[pos] !== TAG.BREAK) {
          const keyLength = readVarint()
          const key = readString(keyLength)
          const val = readValue()
          obj[key] = val
        }
        if (pos >= data.length) {
          throw new TruncatedDataError()
        }
        pos++ // consume BREAK
        return obj
      }

      case TAG.BREAK:
        throw new UnexpectedBreakError()

      default:
        throw new UnknownTagError(tag)
    }
  }

  return readValue()
}

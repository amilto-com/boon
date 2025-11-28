import type { GrowableBuffer, JsonArray, JsonObject, JsonPrimitive, JsonValue, ResolvedEncodeOptions } from '../types'
import {
  FORMAT_VERSION,
  INT8_MAX,
  INT8_MIN,
  INT16_MAX,
  INT16_MIN,
  INT32_MAX,
  INT32_MIN,
  MAGIC_NUMBER,
  MAX_MEDIUM_LENGTH,
  MAX_SHORT_LENGTH,
  TYPE_TAG,
  UINT8_MAX,
  UINT16_MAX,
  UINT32_MAX,
} from '../constants'
import { createGrowableBuffer, textEncoder } from '../shared/buffer'

/**
 * Writes the BOON header (magic number + version).
 */
export function writeHeader(buf: GrowableBuffer): void {
  buf.ensureCapacity(5)
  // Magic number "BOON"
  buf.buffer.set(MAGIC_NUMBER, buf.offset)
  buf.offset += 4
  // Version byte
  buf.buffer[buf.offset++] = FORMAT_VERSION
}

/**
 * Writes a single byte type tag.
 */
function writeTag(buf: GrowableBuffer, tag: number): void {
  buf.ensureCapacity(1)
  buf.buffer[buf.offset++] = tag
}

/**
 * Writes a null value.
 */
function writeNull(buf: GrowableBuffer): void {
  writeTag(buf, TYPE_TAG.NULL)
}

/**
 * Writes a boolean value.
 */
function writeBoolean(buf: GrowableBuffer, value: boolean): void {
  writeTag(buf, value ? TYPE_TAG.TRUE : TYPE_TAG.FALSE)
}

/**
 * Writes a number value with optimal encoding.
 */
function writeNumber(buf: GrowableBuffer, value: number): void {
  // Check for integers first
  if (Number.isInteger(value)) {
    // Signed integers
    if (value >= INT8_MIN && value <= INT8_MAX) {
      writeTag(buf, TYPE_TAG.INT8)
      buf.ensureCapacity(1)
      buf.view.setInt8(buf.offset, value)
      buf.offset += 1
      return
    }
    if (value >= INT16_MIN && value <= INT16_MAX) {
      writeTag(buf, TYPE_TAG.INT16)
      buf.ensureCapacity(2)
      buf.view.setInt16(buf.offset, value, false) // big-endian
      buf.offset += 2
      return
    }
    if (value >= INT32_MIN && value <= INT32_MAX) {
      writeTag(buf, TYPE_TAG.INT32)
      buf.ensureCapacity(4)
      buf.view.setInt32(buf.offset, value, false) // big-endian
      buf.offset += 4
      return
    }
    // Unsigned integers
    if (value >= 0 && value <= UINT8_MAX) {
      writeTag(buf, TYPE_TAG.UINT8)
      buf.ensureCapacity(1)
      buf.buffer[buf.offset++] = value
      return
    }
    if (value >= 0 && value <= UINT16_MAX) {
      writeTag(buf, TYPE_TAG.UINT16)
      buf.ensureCapacity(2)
      buf.view.setUint16(buf.offset, value, false) // big-endian
      buf.offset += 2
      return
    }
    if (value >= 0 && value <= UINT32_MAX) {
      writeTag(buf, TYPE_TAG.UINT32)
      buf.ensureCapacity(4)
      buf.view.setUint32(buf.offset, value, false) // big-endian
      buf.offset += 4
      return
    }
    // Large integers -> use INT64 (stored as BigInt)
    writeTag(buf, TYPE_TAG.INT64)
    buf.ensureCapacity(8)
    buf.view.setBigInt64(buf.offset, BigInt(Math.trunc(value)), false) // big-endian
    buf.offset += 8
    return
  }

  // Check if float32 has sufficient precision
  const float32Value = Math.fround(value)
  if (float32Value === value) {
    writeTag(buf, TYPE_TAG.FLOAT32)
    buf.ensureCapacity(4)
    buf.view.setFloat32(buf.offset, value, false) // big-endian
    buf.offset += 4
    return
  }

  // Use float64 for full precision
  writeTag(buf, TYPE_TAG.FLOAT64)
  buf.ensureCapacity(8)
  buf.view.setFloat64(buf.offset, value, false) // big-endian
  buf.offset += 8
}

/**
 * Writes a string value with optimal length encoding.
 */
function writeString(buf: GrowableBuffer, value: string): void {
  if (value.length === 0) {
    writeTag(buf, TYPE_TAG.STRING_EMPTY)
    return
  }

  // Encode string to UTF-8 bytes
  const bytes = textEncoder.encode(value)
  const length = bytes.length

  // Choose optimal length encoding
  if (length <= MAX_SHORT_LENGTH) {
    // Short string: 1-byte length
    writeTag(buf, TYPE_TAG.STRING_SHORT)
    buf.ensureCapacity(1 + length)
    buf.buffer[buf.offset++] = length
    buf.buffer.set(bytes, buf.offset)
    buf.offset += length
  }
  else if (length <= MAX_MEDIUM_LENGTH) {
    // Medium string: 2-byte length
    writeTag(buf, TYPE_TAG.STRING_MEDIUM)
    buf.ensureCapacity(2 + length)
    buf.view.setUint16(buf.offset, length, false) // big-endian
    buf.offset += 2
    buf.buffer.set(bytes, buf.offset)
    buf.offset += length
  }
  else {
    // Long string: 4-byte length
    writeTag(buf, TYPE_TAG.STRING_LONG)
    buf.ensureCapacity(4 + length)
    buf.view.setUint32(buf.offset, length, false) // big-endian
    buf.offset += 4
    buf.buffer.set(bytes, buf.offset)
    buf.offset += length
  }
}

/**
 * Writes an array value.
 */
function writeArray(buf: GrowableBuffer, value: JsonArray, options: ResolvedEncodeOptions): void {
  const length = value.length

  if (length === 0) {
    writeTag(buf, TYPE_TAG.ARRAY_EMPTY)
    return
  }

  // Choose optimal length encoding
  if (length <= MAX_SHORT_LENGTH) {
    // Short array: 1-byte length
    writeTag(buf, TYPE_TAG.ARRAY_SHORT)
    buf.ensureCapacity(1)
    buf.buffer[buf.offset++] = length
  }
  else if (length <= MAX_MEDIUM_LENGTH) {
    // Medium array: 2-byte length
    writeTag(buf, TYPE_TAG.ARRAY_MEDIUM)
    buf.ensureCapacity(2)
    buf.view.setUint16(buf.offset, length, false) // big-endian
    buf.offset += 2
  }
  else {
    // Long array: 4-byte length
    writeTag(buf, TYPE_TAG.ARRAY_LONG)
    buf.ensureCapacity(4)
    buf.view.setUint32(buf.offset, length, false) // big-endian
    buf.offset += 4
  }

  // Write array elements
  for (const item of value) {
    writeValue(buf, item, options)
  }
}

/**
 * Writes an object value.
 */
function writeObject(buf: GrowableBuffer, value: JsonObject, options: ResolvedEncodeOptions): void {
  const keys = Object.keys(value)
  const keyCount = keys.length

  if (keyCount === 0) {
    writeTag(buf, TYPE_TAG.OBJECT_EMPTY)
    return
  }

  // Choose optimal key count encoding
  if (keyCount <= MAX_SHORT_LENGTH) {
    // Short object: 1-byte key count
    writeTag(buf, TYPE_TAG.OBJECT_SHORT)
    buf.ensureCapacity(1)
    buf.buffer[buf.offset++] = keyCount
  }
  else if (keyCount <= MAX_MEDIUM_LENGTH) {
    // Medium object: 2-byte key count
    writeTag(buf, TYPE_TAG.OBJECT_MEDIUM)
    buf.ensureCapacity(2)
    buf.view.setUint16(buf.offset, keyCount, false) // big-endian
    buf.offset += 2
  }
  else {
    // Long object: 4-byte key count
    writeTag(buf, TYPE_TAG.OBJECT_LONG)
    buf.ensureCapacity(4)
    buf.view.setUint32(buf.offset, keyCount, false) // big-endian
    buf.offset += 4
  }

  // Write key-value pairs
  for (const key of keys) {
    // Write key as string (without type tag - keys are always strings)
    writeKeyString(buf, key)
    // Write value
    writeValue(buf, value[key]!, options)
  }
}

/**
 * Writes a key string (without type tag - keys are always strings).
 * Uses a simple length prefix encoding.
 */
function writeKeyString(buf: GrowableBuffer, value: string): void {
  const bytes = textEncoder.encode(value)
  const length = bytes.length

  // Use varint-style length encoding for keys
  if (length <= 253) {
    // 1-byte length (0-253)
    buf.ensureCapacity(1 + length)
    buf.buffer[buf.offset++] = length
  }
  else if (length <= MAX_MEDIUM_LENGTH) {
    // 2-byte length marker (254) + 2-byte length
    buf.ensureCapacity(3 + length)
    buf.buffer[buf.offset++] = 254 // marker for 2-byte length
    buf.view.setUint16(buf.offset, length, false) // big-endian
    buf.offset += 2
  }
  else {
    // 4-byte length marker (255) + 4-byte length
    buf.ensureCapacity(5 + length)
    buf.buffer[buf.offset++] = 255 // marker for 4-byte length
    buf.view.setUint32(buf.offset, length, false) // big-endian
    buf.offset += 4
  }

  buf.buffer.set(bytes, buf.offset)
  buf.offset += length
}

/**
 * Writes any JSON value.
 */
export function writeValue(buf: GrowableBuffer, value: JsonValue, options: ResolvedEncodeOptions): void {
  if (value === null) {
    writeNull(buf)
    return
  }

  switch (typeof value) {
    case 'boolean':
      writeBoolean(buf, value)
      break
    case 'number':
      writeNumber(buf, value)
      break
    case 'string':
      writeString(buf, value)
      break
    case 'object':
      if (Array.isArray(value)) {
        writeArray(buf, value, options)
      }
      else {
        writeObject(buf, value as JsonObject, options)
      }
      break
    default:
      throw new TypeError(`Unsupported value type: ${typeof value}`)
  }
}

/**
 * Encodes a JSON value to BOON binary format.
 */
export function encodeValue(value: JsonValue, options: ResolvedEncodeOptions): Uint8Array {
  const buf = createGrowableBuffer(options.initialBufferSize)

  if (options.includeHeader) {
    writeHeader(buf)
  }

  writeValue(buf, value, options)

  return buf.getResult()
}

/**
 * Normalizes JSON value, handling undefined and other edge cases.
 */
export function normalizeValue(input: unknown): JsonValue {
  if (input === undefined) {
    return null
  }

  if (input === null) {
    return null
  }

  const type = typeof input
  if (type === 'boolean' || type === 'number' || type === 'string') {
    return input as JsonPrimitive
  }

  if (Array.isArray(input)) {
    return input.map(normalizeValue) as JsonArray
  }

  if (type === 'object') {
    const result: JsonObject = {}
    for (const [key, val] of Object.entries(input as object)) {
      if (val !== undefined) {
        result[key] = normalizeValue(val)
      }
    }
    return result
  }

  // Convert other types to string
  return String(input)
}

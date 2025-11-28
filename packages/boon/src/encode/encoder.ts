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
import { COMMON_KEYS_MAP, COMMON_KEY_MIN } from '../common-keys'
import { createGrowableBuffer, textEncoder } from '../shared/buffer'

/**
 * Collects all unique object keys from a JSON value.
 * Used for string table optimization.
 */
function collectKeys(value: JsonValue, keys: Set<string> = new Set()): Set<string> {
  if (value === null || typeof value !== 'object') {
    return keys
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectKeys(item, keys)
    }
  }
  else {
    const obj = value as JsonObject
    for (const key of Object.keys(obj)) {
      keys.add(key)
      collectKeys(obj[key]!, keys)
    }
  }

  return keys
}

/**
 * Writes a varint (variable-length integer) for key indexes.
 */
function writeVarint(buf: GrowableBuffer, value: number): void {
  if (value < 128) {
    buf.ensureCapacity(1)
    buf.buffer[buf.offset++] = value
  }
  else if (value < 16384) {
    buf.ensureCapacity(2)
    buf.buffer[buf.offset++] = (value & 0x7F) | 0x80
    buf.buffer[buf.offset++] = value >>> 7
  }
  else if (value < 2097152) {
    buf.ensureCapacity(3)
    buf.buffer[buf.offset++] = (value & 0x7F) | 0x80
    buf.buffer[buf.offset++] = ((value >>> 7) & 0x7F) | 0x80
    buf.buffer[buf.offset++] = value >>> 14
  }
  else {
    buf.ensureCapacity(4)
    buf.buffer[buf.offset++] = (value & 0x7F) | 0x80
    buf.buffer[buf.offset++] = ((value >>> 7) & 0x7F) | 0x80
    buf.buffer[buf.offset++] = ((value >>> 14) & 0x7F) | 0x80
    buf.buffer[buf.offset++] = value >>> 21
  }
}

/**
 * Writes the string table header.
 */
function writeStringTable(buf: GrowableBuffer, keys: string[]): void {
  writeTag(buf, TYPE_TAG.HEADER_WITH_STRING_TABLE)
  
  // Version byte
  buf.ensureCapacity(1)
  buf.buffer[buf.offset++] = FORMAT_VERSION
  
  // Number of keys
  writeVarint(buf, keys.length)
  
  // Write each key as a string
  for (const key of keys) {
    const bytes = textEncoder.encode(key)
    const length = bytes.length
    
    writeVarint(buf, length)
    buf.ensureCapacity(length)
    buf.buffer.set(bytes, buf.offset)
    buf.offset += length
  }
}

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
 * Writes an object value with string table (using key indexes).
 */
function writeObjectWithKeyMap(
  buf: GrowableBuffer,
  value: JsonObject,
  options: ResolvedEncodeOptions,
  keyMap: Map<string, number>,
): void {
  const keys = Object.keys(value)
  const keyCount = keys.length

  if (keyCount === 0) {
    writeTag(buf, TYPE_TAG.OBJECT_EMPTY)
    return
  }

  // Choose optimal key count encoding
  if (keyCount <= MAX_SHORT_LENGTH) {
    writeTag(buf, TYPE_TAG.OBJECT_SHORT)
    buf.ensureCapacity(1)
    buf.buffer[buf.offset++] = keyCount
  }
  else if (keyCount <= MAX_MEDIUM_LENGTH) {
    writeTag(buf, TYPE_TAG.OBJECT_MEDIUM)
    buf.ensureCapacity(2)
    buf.view.setUint16(buf.offset, keyCount, false)
    buf.offset += 2
  }
  else {
    writeTag(buf, TYPE_TAG.OBJECT_LONG)
    buf.ensureCapacity(4)
    buf.view.setUint32(buf.offset, keyCount, false)
    buf.offset += 4
  }

  // Write key-value pairs using indexes
  for (const key of keys) {
    const keyIndex = keyMap.get(key)!
    writeVarint(buf, keyIndex) // Write key index instead of full string
    writeValueWithKeyMap(buf, value[key]!, options, keyMap)
  }
}

/**
 * Writes any JSON value with string table support.
 */
function writeValueWithKeyMap(
  buf: GrowableBuffer,
  value: JsonValue,
  options: ResolvedEncodeOptions,
  keyMap: Map<string, number>,
): void {
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
        writeArray(buf, value, options, keyMap)
      }
      else {
        writeObjectWithKeyMap(buf, value as JsonObject, options, keyMap)
      }
      break
    default:
      throw new TypeError(`Unsupported value type: ${typeof value}`)
  }
}

/**
 * Writes an array value with string table support.
 */
function writeArray(
  buf: GrowableBuffer,
  value: JsonArray,
  options: ResolvedEncodeOptions,
  keyMap?: Map<string, number>,
): void {
  const length = value.length

  if (length === 0) {
    writeTag(buf, TYPE_TAG.ARRAY_EMPTY)
    return
  }

  if (length <= MAX_SHORT_LENGTH) {
    writeTag(buf, TYPE_TAG.ARRAY_SHORT)
    buf.ensureCapacity(1)
    buf.buffer[buf.offset++] = length
  }
  else if (length <= MAX_MEDIUM_LENGTH) {
    writeTag(buf, TYPE_TAG.ARRAY_MEDIUM)
    buf.ensureCapacity(2)
    buf.view.setUint16(buf.offset, length, false)
    buf.offset += 2
  }
  else {
    writeTag(buf, TYPE_TAG.ARRAY_LONG)
    buf.ensureCapacity(4)
    buf.view.setUint32(buf.offset, length, false)
    buf.offset += 4
  }

  // Write array elements
  for (const item of value) {
    if (keyMap) {
      writeValueWithKeyMap(buf, item, options, keyMap)
    }
    else {
      writeValue(buf, item, options)
    }
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
 * Uses common keys dictionary (0x80-0xFF) for frequent keys, otherwise length prefix encoding.
 */
function writeKeyString(buf: GrowableBuffer, value: string): void {
  // Check if key is in common keys dictionary
  const commonKeyId = COMMON_KEYS_MAP.get(value)
  if (commonKeyId !== undefined) {
    // Write single byte for common key
    buf.ensureCapacity(1)
    buf.buffer[buf.offset++] = commonKeyId
    return
  }

  // Not a common key, encode as UTF-8 string
  const bytes = textEncoder.encode(value)
  const length = bytes.length

  // Use varint-style length encoding for keys
  // 0-127: 1-byte length (avoid conflict with common keys 0x80-0xFF)
  if (length <= 127) {
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

  // Check if we should use string table optimization
  if (options.useStringTable) {
    // Collect all unique keys
    const keys = Array.from(collectKeys(value))
    
    // Only use string table if it saves space
    // Rough estimate: header overhead vs key repetition savings
    const headerSize = 10 + keys.reduce((sum, k) => sum + k.length + 2, 0)
    const repetitionSavings = estimateRepetitionSavings(value, keys)
    
    if (repetitionSavings > headerSize) {
      // Write magic number if header requested
      if (options.includeHeader) {
        buf.ensureCapacity(4)
        buf.buffer.set(MAGIC_NUMBER, buf.offset)
        buf.offset += 4
      }
      
      // Write string table header
      writeStringTable(buf, keys)
      
      // Create key -> index map
      const keyMap = new Map(keys.map((k, i) => [k, i]))
      
      // Encode value using key indexes
      writeValueWithKeyMap(buf, value, options, keyMap)
      
      return buf.getResult()
    }
  }

  // Standard encoding without string table
  if (options.includeHeader) {
    writeHeader(buf)
  }

  writeValue(buf, value, options)

  return buf.getResult()
}

/**
 * Estimates potential savings from using string table.
 */
function estimateRepetitionSavings(value: JsonValue, keys: string[]): number {
  const keyUsage = new Map<string, number>()
  
  function countKeys(val: JsonValue): void {
    if (val === null || typeof val !== 'object') {
      return
    }
    
    if (Array.isArray(val)) {
      for (const item of val) {
        countKeys(item)
      }
    }
    else {
      for (const key of Object.keys(val)) {
        keyUsage.set(key, (keyUsage.get(key) || 0) + 1)
        countKeys(val[key]!)
      }
    }
  }
  
  countKeys(value)
  
  // Calculate total key usage
  let totalKeyBytes = 0
  for (const [key, count] of keyUsage) {
    // Cost sans string table: chaque occurrence = length_prefix + bytes
    const costWithoutTable = count * (1 + key.length)
    totalKeyBytes += costWithoutTable
  }
  
  // If more than 50% of keys are used only once, probably not worth it
  const singleUseKeys = Array.from(keyUsage.values()).filter(c => c === 1).length
  if (singleUseKeys > keys.length * 0.5) {
    return -1000 // Force disable
  }
  
  // Rough calculation: if we save more than 10%, use it
  const avgSavingsPerKey = totalKeyBytes / Array.from(keyUsage.values()).reduce((a, b) => a + b, 0)
  return avgSavingsPerKey > 2 ? 1000 : -1000
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

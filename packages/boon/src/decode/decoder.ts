import type { BinaryReader, JsonArray, JsonObject, JsonValue, ResolvedDecodeOptions } from '../types'
import { COMMON_KEY_MAX, COMMON_KEY_MIN, COMMON_KEYS } from '../common-keys'
import {
  FORMAT_VERSION,
  MAGIC_NUMBER,
  TYPE_TAG,
} from '../constants'
import { createBinaryReader, textDecoder } from '../shared/buffer'

/**
 * Reads a varint (variable-length integer).
 */
function readVarint(reader: BinaryReader): number {
  let result = 0
  let shift = 0
  let byte: number

  do {
    byte = reader.readUint8()
    result |= (byte & 0x7F) << shift
    shift += 7
  } while (byte & 0x80)

  return result
}

/**
 * Reads string table from header.
 */
function readStringTable(reader: BinaryReader): string[] {
  // Version already read
  const version = reader.readUint8()

  // Number of keys
  const keyCount = readVarint(reader)

  const keys: string[] = []
  for (let i = 0; i < keyCount; i++) {
    const length = readVarint(reader)
    const bytes = reader.readBytes(length)
    keys.push(textDecoder.decode(bytes))
  }

  return keys
}

/**
 * Reads an object value with string table support.
 */
function readObjectWithKeyTable(
  reader: BinaryReader,
  tag: number,
  options: ResolvedDecodeOptions,
  keyTable: string[],
): JsonObject {
  let keyCount: number

  if (tag === TYPE_TAG.OBJECT_EMPTY) {
    return {}
  }
  else if (tag === TYPE_TAG.OBJECT_SHORT) {
    keyCount = reader.readUint8()
  }
  else if (tag === TYPE_TAG.OBJECT_MEDIUM) {
    keyCount = reader.readUint16()
  }
  else if (tag === TYPE_TAG.OBJECT_LONG) {
    keyCount = reader.readUint32()
  }
  else {
    throw new SyntaxError(`Invalid object tag: 0x${tag.toString(16)}`)
  }

  const result: JsonObject = {}
  for (let i = 0; i < keyCount; i++) {
    const keyIndex = readVarint(reader)
    if (keyIndex >= keyTable.length) {
      throw new SyntaxError(`Invalid key index: ${keyIndex}`)
    }
    const key = keyTable[keyIndex]
    const value = readValueWithKeyTable(reader, options, keyTable)
    result[key] = value
  }

  return result
}

/**
 * Reads an array value with string table support.
 */
function readArrayWithKeyTable(
  reader: BinaryReader,
  tag: number,
  options: ResolvedDecodeOptions,
  keyTable: string[],
): JsonArray {
  let length: number

  if (tag === TYPE_TAG.ARRAY_EMPTY) {
    return []
  }
  else if (tag === TYPE_TAG.ARRAY_SHORT) {
    length = reader.readUint8()
  }
  else if (tag === TYPE_TAG.ARRAY_MEDIUM) {
    length = reader.readUint16()
  }
  else if (tag === TYPE_TAG.ARRAY_LONG) {
    length = reader.readUint32()
  }
  else {
    throw new SyntaxError(`Invalid array tag: 0x${tag.toString(16)}`)
  }

  const result: JsonValue[] = []
  for (let i = 0; i < length; i++) {
    result.push(readValueWithKeyTable(reader, options, keyTable))
  }

  return result
}

/**
 * Reads any JSON value with string table support.
 */
function readValueWithKeyTable(
  reader: BinaryReader,
  options: ResolvedDecodeOptions,
  keyTable: string[],
): JsonValue {
  const tag = reader.readUint8()

  // Null
  if (tag === TYPE_TAG.NULL) {
    return null
  }

  // Boolean
  if (tag === TYPE_TAG.FALSE) {
    return false
  }
  if (tag === TYPE_TAG.TRUE) {
    return true
  }

  // Integer types
  if (tag === TYPE_TAG.INT8) {
    return reader.readInt8()
  }
  if (tag === TYPE_TAG.INT16) {
    return reader.readInt16()
  }
  if (tag === TYPE_TAG.INT32) {
    return reader.readInt32()
  }
  if (tag === TYPE_TAG.INT64) {
    const bigInt = reader.readBigInt64()
    if (bigInt >= BigInt(Number.MIN_SAFE_INTEGER) && bigInt <= BigInt(Number.MAX_SAFE_INTEGER)) {
      return Number(bigInt)
    }
    return Number(bigInt)
  }
  if (tag === TYPE_TAG.UINT8) {
    return reader.readUint8()
  }
  if (tag === TYPE_TAG.UINT16) {
    return reader.readUint16()
  }
  if (tag === TYPE_TAG.UINT32) {
    return reader.readUint32()
  }

  // Float types
  if (tag === TYPE_TAG.FLOAT32) {
    return reader.readFloat32()
  }
  if (tag === TYPE_TAG.FLOAT64) {
    return reader.readFloat64()
  }

  // String types
  if (tag === TYPE_TAG.STRING_EMPTY
    || tag === TYPE_TAG.STRING_SHORT
    || tag === TYPE_TAG.STRING_MEDIUM
    || tag === TYPE_TAG.STRING_LONG) {
    return readString(reader, tag)
  }

  // Array types
  if (tag === TYPE_TAG.ARRAY_EMPTY
    || tag === TYPE_TAG.ARRAY_SHORT
    || tag === TYPE_TAG.ARRAY_MEDIUM
    || tag === TYPE_TAG.ARRAY_LONG) {
    return readArrayWithKeyTable(reader, tag, options, keyTable)
  }

  // Object types
  if (tag === TYPE_TAG.OBJECT_EMPTY
    || tag === TYPE_TAG.OBJECT_SHORT
    || tag === TYPE_TAG.OBJECT_MEDIUM
    || tag === TYPE_TAG.OBJECT_LONG) {
    return readObjectWithKeyTable(reader, tag, options, keyTable)
  }

  throw new SyntaxError(`Unknown type tag: 0x${tag.toString(16)}`)
}

/**
 * Reads and validates the BOON header.
 * Returns the format version.
 */
export function readHeader(reader: BinaryReader): number {
  // Validate magic number
  const magic = reader.readBytes(4)
  if (magic[0] !== MAGIC_NUMBER[0]
    || magic[1] !== MAGIC_NUMBER[1]
    || magic[2] !== MAGIC_NUMBER[2]
    || magic[3] !== MAGIC_NUMBER[3]) {
    throw new SyntaxError('Invalid BOON magic number')
  }

  // Read version
  const version = reader.readUint8()
  if (version > FORMAT_VERSION) {
    throw new SyntaxError(`Unsupported BOON version: ${version} (max supported: ${FORMAT_VERSION})`)
  }

  return version
}

/**
 * Reads a string value.
 */
function readString(reader: BinaryReader, tag: number): string {
  let length: number

  if (tag === TYPE_TAG.STRING_EMPTY) {
    return ''
  }
  else if (tag === TYPE_TAG.STRING_SHORT) {
    length = reader.readUint8()
  }
  else if (tag === TYPE_TAG.STRING_MEDIUM) {
    length = reader.readUint16()
  }
  else if (tag === TYPE_TAG.STRING_LONG) {
    length = reader.readUint32()
  }
  else {
    throw new SyntaxError(`Invalid string tag: 0x${tag.toString(16)}`)
  }

  const bytes = reader.readBytes(length)
  return textDecoder.decode(bytes)
}

/**
 * Reads a key string (without type tag).
 * Supports common keys dictionary (0x80-0xFF) and variable-length encoding.
 */
function readKeyString(reader: BinaryReader): string {
  const firstByte = reader.readUint8()

  // Check if this is a common key (0x80-0xFF)
  if (firstByte >= COMMON_KEY_MIN && firstByte <= COMMON_KEY_MAX) {
    const keyIndex = firstByte - COMMON_KEY_MIN
    const key = COMMON_KEYS[keyIndex]
    if (!key) {
      throw new SyntaxError(`Invalid common key index: ${keyIndex}`)
    }
    return key
  }

  // Otherwise, it's a length-prefixed string
  let length: number

  if (firstByte === 254) {
    // 2-byte length
    length = reader.readUint16()
  }
  else if (firstByte === 255) {
    // 4-byte length
    length = reader.readUint32()
  }
  else {
    // 1-byte length (0-127, avoiding common keys range)
    length = firstByte
  }

  const bytes = reader.readBytes(length)
  return textDecoder.decode(bytes)
}

/**
 * Reads an array value.
 */
function readArray(reader: BinaryReader, tag: number, options: ResolvedDecodeOptions): JsonArray {
  let length: number

  if (tag === TYPE_TAG.ARRAY_EMPTY) {
    return []
  }
  else if (tag === TYPE_TAG.ARRAY_SHORT) {
    length = reader.readUint8()
  }
  else if (tag === TYPE_TAG.ARRAY_MEDIUM) {
    length = reader.readUint16()
  }
  else if (tag === TYPE_TAG.ARRAY_LONG) {
    length = reader.readUint32()
  }
  else {
    throw new SyntaxError(`Invalid array tag: 0x${tag.toString(16)}`)
  }

  const result: JsonValue[] = []
  for (let i = 0; i < length; i++) {
    result.push(readValue(reader, options))
  }

  return result
}

/**
 * Reads an object value.
 */
function readObject(reader: BinaryReader, tag: number, options: ResolvedDecodeOptions): JsonObject {
  let keyCount: number

  if (tag === TYPE_TAG.OBJECT_EMPTY) {
    return {}
  }
  else if (tag === TYPE_TAG.OBJECT_SHORT) {
    keyCount = reader.readUint8()
  }
  else if (tag === TYPE_TAG.OBJECT_MEDIUM) {
    keyCount = reader.readUint16()
  }
  else if (tag === TYPE_TAG.OBJECT_LONG) {
    keyCount = reader.readUint32()
  }
  else {
    throw new SyntaxError(`Invalid object tag: 0x${tag.toString(16)}`)
  }

  const result: JsonObject = {}
  for (let i = 0; i < keyCount; i++) {
    const key = readKeyString(reader)
    const value = readValue(reader, options)
    result[key] = value
  }

  return result
}

/**
 * Reads any JSON value.
 */
export function readValue(reader: BinaryReader, options: ResolvedDecodeOptions): JsonValue {
  const tag = reader.readUint8()

  // Null
  if (tag === TYPE_TAG.NULL) {
    return null
  }

  // Boolean
  if (tag === TYPE_TAG.FALSE) {
    return false
  }
  if (tag === TYPE_TAG.TRUE) {
    return true
  }

  // Integer types
  if (tag === TYPE_TAG.INT8) {
    return reader.readInt8()
  }
  if (tag === TYPE_TAG.INT16) {
    return reader.readInt16()
  }
  if (tag === TYPE_TAG.INT32) {
    return reader.readInt32()
  }
  if (tag === TYPE_TAG.INT64) {
    const bigInt = reader.readBigInt64()
    // Convert to number if safe
    if (bigInt >= BigInt(Number.MIN_SAFE_INTEGER) && bigInt <= BigInt(Number.MAX_SAFE_INTEGER)) {
      return Number(bigInt)
    }
    // Return as number anyway (may lose precision for very large values)
    return Number(bigInt)
  }
  if (tag === TYPE_TAG.UINT8) {
    return reader.readUint8()
  }
  if (tag === TYPE_TAG.UINT16) {
    return reader.readUint16()
  }
  if (tag === TYPE_TAG.UINT32) {
    return reader.readUint32()
  }

  // Float types
  if (tag === TYPE_TAG.FLOAT32) {
    return reader.readFloat32()
  }
  if (tag === TYPE_TAG.FLOAT64) {
    return reader.readFloat64()
  }

  // String types
  if (tag === TYPE_TAG.STRING_EMPTY
    || tag === TYPE_TAG.STRING_SHORT
    || tag === TYPE_TAG.STRING_MEDIUM
    || tag === TYPE_TAG.STRING_LONG) {
    return readString(reader, tag)
  }

  // Array types
  if (tag === TYPE_TAG.ARRAY_EMPTY
    || tag === TYPE_TAG.ARRAY_SHORT
    || tag === TYPE_TAG.ARRAY_MEDIUM
    || tag === TYPE_TAG.ARRAY_LONG) {
    return readArray(reader, tag, options)
  }

  // Object types
  if (tag === TYPE_TAG.OBJECT_EMPTY
    || tag === TYPE_TAG.OBJECT_SHORT
    || tag === TYPE_TAG.OBJECT_MEDIUM
    || tag === TYPE_TAG.OBJECT_LONG) {
    return readObject(reader, tag, options)
  }

  throw new SyntaxError(`Unknown type tag: 0x${tag.toString(16)}`)
}

/**
 * Decodes BOON binary data to a JSON value.
 */
export function decodeValue(data: Uint8Array, options: ResolvedDecodeOptions): JsonValue {
  const reader = createBinaryReader(data)

  if (options.expectHeader) {
    // Peek at first bytes to check for magic number or string table header
    const firstByte = reader.readUint8()

    // Check if it's magic number (0x42 = 'B')
    if (firstByte === MAGIC_NUMBER[0]) {
      // Read rest of magic number
      const magic = new Uint8Array([firstByte, reader.readUint8(), reader.readUint8(), reader.readUint8()])
      if (magic[1] !== MAGIC_NUMBER[1] || magic[2] !== MAGIC_NUMBER[2] || magic[3] !== MAGIC_NUMBER[3]) {
        throw new SyntaxError('Invalid BOON magic number')
      }

      // Read version or check for string table
      const versionOrTag = reader.readUint8()

      if (versionOrTag === TYPE_TAG.HEADER_WITH_STRING_TABLE) {
        // String table format
        const keyTable = readStringTable(reader)
        return readValueWithKeyTable(reader, options, keyTable)
      }
      else {
        // Standard format with version
        if (versionOrTag > FORMAT_VERSION) {
          throw new SyntaxError(`Unsupported BOON version: ${versionOrTag}`)
        }
        return readValue(reader, options)
      }
    }
    else if (firstByte === TYPE_TAG.HEADER_WITH_STRING_TABLE) {
      // String table without magic number
      const keyTable = readStringTable(reader)
      return readValueWithKeyTable(reader, options, keyTable)
    }
    else {
      throw new SyntaxError('Invalid BOON header')
    }
  }

  return readValue(reader, options)
}

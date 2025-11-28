import type { BinaryReader, JsonArray, JsonObject, JsonValue, ResolvedDecodeOptions } from '../types'
import {
  FORMAT_VERSION,
  MAGIC_NUMBER,
  TYPE_TAG,
} from '../constants'
import { createBinaryReader, textDecoder } from '../shared/buffer'

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
 */
function readKeyString(reader: BinaryReader): string {
  const lengthByte = reader.readUint8()
  let length: number

  if (lengthByte === 254) {
    // 2-byte length
    length = reader.readUint16()
  }
  else if (lengthByte === 255) {
    // 4-byte length
    length = reader.readUint32()
  }
  else {
    // 1-byte length (0-253)
    length = lengthByte
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
    readHeader(reader)
  }

  return readValue(reader, options)
}

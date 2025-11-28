import type { BinaryReader, BoonStreamEvent, ResolvedDecodeOptions } from '../types'
import { COMMON_KEYS, COMMON_KEY_MAX, COMMON_KEY_MIN } from '../common-keys'
import {
  FORMAT_VERSION,
  MAGIC_NUMBER,
  TYPE_TAG,
} from '../constants'
import { createBinaryReader, textDecoder } from '../shared/buffer'

/**
 * Reads a varint from the reader.
 */
function readVarint(reader: BinaryReader): number {
  let value = 0
  let shift = 0
  let byte = 0

  do {
    byte = reader.readUint8()
    value |= (byte & 0x7F) << shift
    shift += 7
  } while (byte & 0x80)

  return value
}

/**
 * Reads and validates the BOON header in streaming mode.
 */
function* readHeaderEvents(reader: BinaryReader): Generator<BoonStreamEvent, string[] | null> {
  const magic = reader.readBytes(4)
  if (magic[0] !== MAGIC_NUMBER[0]
    || magic[1] !== MAGIC_NUMBER[1]
    || magic[2] !== MAGIC_NUMBER[2]
    || magic[3] !== MAGIC_NUMBER[3]) {
    throw new SyntaxError('Invalid BOON magic number')
  }

  const firstByte = reader.readUint8()
  
  // Check if this is a string table header
  if (firstByte === TYPE_TAG.HEADER_WITH_STRING_TABLE) {
    const version = reader.readUint8()
    if (version > FORMAT_VERSION) {
      throw new SyntaxError(`Unsupported BOON version: ${version}`)
    }
    
    // Read string table
    const keyCount = readVarint(reader)
    const keys: string[] = []
    
    for (let i = 0; i < keyCount; i++) {
      const length = readVarint(reader)
      const bytes = reader.readBytes(length)
      keys.push(textDecoder.decode(bytes))
    }
    
    yield { type: 'header', version }
    return keys
  }
  else {
    // Regular header without string table
    const version = firstByte
    if (version > FORMAT_VERSION) {
      throw new SyntaxError(`Unsupported BOON version: ${version}`)
    }
    
    yield { type: 'header', version }
    return null
  }
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
 * Reads a key string with common keys dictionary support.
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
    length = reader.readUint16()
  }
  else if (firstByte === 255) {
    length = reader.readUint32()
  }
  else {
    // 1-byte length (0-127)
    length = firstByte
  }

  const bytes = reader.readBytes(length)
  return textDecoder.decode(bytes)
}

/**
 * Gets array length from tag.
 */
function getArrayLength(reader: BinaryReader, tag: number): number {
  if (tag === TYPE_TAG.ARRAY_EMPTY) {
    return 0
  }
  else if (tag === TYPE_TAG.ARRAY_SHORT) {
    return reader.readUint8()
  }
  else if (tag === TYPE_TAG.ARRAY_MEDIUM) {
    return reader.readUint16()
  }
  else if (tag === TYPE_TAG.ARRAY_LONG) {
    return reader.readUint32()
  }
  throw new SyntaxError(`Invalid array tag: 0x${tag.toString(16)}`)
}

/**
 * Gets object key count from tag.
 */
function getObjectKeyCount(reader: BinaryReader, tag: number): number {
  if (tag === TYPE_TAG.OBJECT_EMPTY) {
    return 0
  }
  else if (tag === TYPE_TAG.OBJECT_SHORT) {
    return reader.readUint8()
  }
  else if (tag === TYPE_TAG.OBJECT_MEDIUM) {
    return reader.readUint16()
  }
  else if (tag === TYPE_TAG.OBJECT_LONG) {
    return reader.readUint32()
  }
  throw new SyntaxError(`Invalid object tag: 0x${tag.toString(16)}`)
}

/**
 * Streams BOON events from a single value.
 */
function* streamValue(reader: BinaryReader, keyTable?: string[] | null): Generator<BoonStreamEvent> {
  const tag = reader.readUint8()

  // Null
  if (tag === TYPE_TAG.NULL) {
    yield { type: 'primitive', value: null }
    return
  }

  // Boolean
  if (tag === TYPE_TAG.FALSE) {
    yield { type: 'primitive', value: false }
    return
  }
  if (tag === TYPE_TAG.TRUE) {
    yield { type: 'primitive', value: true }
    return
  }

  // Integer types
  if (tag === TYPE_TAG.INT8) {
    yield { type: 'primitive', value: reader.readInt8() }
    return
  }
  if (tag === TYPE_TAG.INT16) {
    yield { type: 'primitive', value: reader.readInt16() }
    return
  }
  if (tag === TYPE_TAG.INT32) {
    yield { type: 'primitive', value: reader.readInt32() }
    return
  }
  if (tag === TYPE_TAG.INT64) {
    const bigInt = reader.readBigInt64()
    yield { type: 'primitive', value: Number(bigInt) }
    return
  }
  if (tag === TYPE_TAG.UINT8) {
    yield { type: 'primitive', value: reader.readUint8() }
    return
  }
  if (tag === TYPE_TAG.UINT16) {
    yield { type: 'primitive', value: reader.readUint16() }
    return
  }
  if (tag === TYPE_TAG.UINT32) {
    yield { type: 'primitive', value: reader.readUint32() }
    return
  }

  // Float types
  if (tag === TYPE_TAG.FLOAT32) {
    yield { type: 'primitive', value: reader.readFloat32() }
    return
  }
  if (tag === TYPE_TAG.FLOAT64) {
    yield { type: 'primitive', value: reader.readFloat64() }
    return
  }

  // String types
  if (tag === TYPE_TAG.STRING_EMPTY
    || tag === TYPE_TAG.STRING_SHORT
    || tag === TYPE_TAG.STRING_MEDIUM
    || tag === TYPE_TAG.STRING_LONG) {
    yield { type: 'primitive', value: readString(reader, tag) }
    return
  }

  // Array types
  if (tag === TYPE_TAG.ARRAY_EMPTY
    || tag === TYPE_TAG.ARRAY_SHORT
    || tag === TYPE_TAG.ARRAY_MEDIUM
    || tag === TYPE_TAG.ARRAY_LONG) {
    const length = getArrayLength(reader, tag)
    yield { type: 'startArray', length }
    for (let i = 0; i < length; i++) {
      yield* streamValue(reader, keyTable)
    }
    yield { type: 'endArray' }
    return
  }

  // Object types
  if (tag === TYPE_TAG.OBJECT_EMPTY
    || tag === TYPE_TAG.OBJECT_SHORT
    || tag === TYPE_TAG.OBJECT_MEDIUM
    || tag === TYPE_TAG.OBJECT_LONG) {
    const keyCount = getObjectKeyCount(reader, tag)
    yield { type: 'startObject', keyCount }
    for (let i = 0; i < keyCount; i++) {
      let key: string
      
      if (keyTable) {
        // Read varint key index
        const keyIndex = readVarint(reader)
        key = keyTable[keyIndex]
        if (key === undefined) {
          throw new SyntaxError(`Invalid key index: ${keyIndex}`)
        }
      }
      else {
        // Read full key string
        key = readKeyString(reader)
      }
      
      yield { type: 'key', key }
      yield* streamValue(reader, keyTable)
    }
    yield { type: 'endObject' }
    return
  }

  throw new SyntaxError(`Unknown type tag: 0x${tag.toString(16)}`)
}

/**
 * Streams BOON events from binary data synchronously.
 */
export function* decodeStreamSync(
  data: Uint8Array,
  options?: Partial<ResolvedDecodeOptions>,
): Generator<BoonStreamEvent> {
  const resolvedOptions: ResolvedDecodeOptions = {
    expectHeader: options?.expectHeader ?? true,
    strict: options?.strict ?? true,
  }

  const reader = createBinaryReader(data)

  let keyTable: string[] | null = null
  
  if (resolvedOptions.expectHeader) {
    const headerGen = readHeaderEvents(reader)
    let headerResult = headerGen.next()
    
    // Yield header event
    while (!headerResult.done) {
      yield headerResult.value
      headerResult = headerGen.next()
    }
    
    // Get key table from final return value
    keyTable = headerResult.value ?? null
  }

  yield* streamValue(reader, keyTable)
}

/**
 * Streams BOON events from binary data asynchronously.
 * Supports both sync and async iterables of Uint8Array chunks.
 */
export async function* decodeStream(
  source: AsyncIterable<Uint8Array> | Iterable<Uint8Array>,
  options?: Partial<ResolvedDecodeOptions>,
): AsyncGenerator<BoonStreamEvent> {
  // Collect all chunks into a single buffer
  // (For true streaming, we'd need a more complex chunked reader)
  const chunks: Uint8Array[] = []

  if (Symbol.asyncIterator in source) {
    for await (const chunk of source as AsyncIterable<Uint8Array>) {
      chunks.push(chunk)
    }
  }
  else {
    for (const chunk of source as Iterable<Uint8Array>) {
      chunks.push(chunk)
    }
  }

  // Concatenate chunks
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
  const data = new Uint8Array(totalLength)
  let offset = 0
  for (const chunk of chunks) {
    data.set(chunk, offset)
    offset += chunk.length
  }

  // Use sync decoder
  yield* decodeStreamSync(data, options)
}

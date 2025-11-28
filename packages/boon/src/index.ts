import type { BoonStreamEvent, DecodeOptions, EncodeOptions, JsonValue, ResolvedDecodeOptions, ResolvedEncodeOptions } from './types'
import { DEFAULT_BUFFER_SIZE } from './constants'
import { decodeValue } from './decode/decoder'
import { decodeStream as decodeStreamCore, decodeStreamSync as decodeStreamSyncCore } from './decode/stream'
import { encodeValue, normalizeValue } from './encode/encoder'

export { DEFAULT_BUFFER_SIZE, FORMAT_VERSION, MAGIC_NUMBER, TYPE_TAG } from './constants'
export type {
  BoonStreamEvent,
  DecodeOptions,
  EncodeOptions,
  JsonArray,
  JsonObject,
  JsonPrimitive,
  JsonValue,
  ResolvedDecodeOptions,
  ResolvedEncodeOptions,
} from './types'

/**
 * Encodes a JavaScript value into BOON binary format.
 *
 * @param input - Any JavaScript value (objects, arrays, primitives)
 * @param options - Optional encoding configuration
 * @returns BOON binary data as Uint8Array
 *
 * @example
 * ```ts
 * const boonData = encode({ name: 'Alice', age: 30 })
 * // Returns Uint8Array containing BOON binary data
 *
 * // Without header for fragments
 * const fragment = encode(data, { includeHeader: false })
 * ```
 */
export function encode(input: unknown, options?: EncodeOptions): Uint8Array {
  const normalizedValue = normalizeValue(input)
  const resolvedOptions = resolveEncodeOptions(options)
  return encodeValue(normalizedValue, resolvedOptions)
}

/**
 * Decodes BOON binary data into a JavaScript value.
 *
 * @param data - BOON binary data as Uint8Array
 * @param options - Optional decoding configuration
 * @returns Parsed JavaScript value (object, array, or primitive)
 *
 * @example
 * ```ts
 * const value = decode(boonData)
 * // { name: 'Alice', age: 30 }
 *
 * // Decode fragment without header
 * const fragmentValue = decode(fragment, { expectHeader: false })
 * ```
 */
export function decode(data: Uint8Array, options?: DecodeOptions): JsonValue {
  const resolvedOptions = resolveDecodeOptions(options)
  return decodeValue(data, resolvedOptions)
}

/**
 * Synchronously decodes BOON binary data into a stream of events.
 *
 * This function yields structured events (startObject, endObject, startArray, endArray,
 * key, primitive) that represent the JSON data model without building the full value tree.
 * Useful for streaming processing, custom transformations, or memory-efficient parsing.
 *
 * @param data - BOON binary data as Uint8Array
 * @param options - Optional decoding configuration
 * @returns Iterable of BOON stream events
 *
 * @example
 * ```ts
 * for (const event of decodeStreamSync(boonData)) {
 *   console.log(event)
 *   // { type: 'header', version: 1 }
 *   // { type: 'startObject', keyCount: 2 }
 *   // { type: 'key', key: 'name' }
 *   // { type: 'primitive', value: 'Alice' }
 *   // ...
 * }
 * ```
 */
export function decodeStreamSync(data: Uint8Array, options?: DecodeOptions): Iterable<BoonStreamEvent> {
  return decodeStreamSyncCore(data, options)
}

/**
 * Asynchronously decodes BOON binary data into a stream of events.
 *
 * Supports both sync and async iterables of Uint8Array chunks for maximum
 * flexibility with file streams, network responses, or other async sources.
 *
 * @param source - Async or sync iterable of BOON binary chunks
 * @param options - Optional decoding configuration
 * @returns Async iterable of BOON stream events
 *
 * @example
 * ```ts
 * const fileStream = createReadStream('data.boon')
 *
 * for await (const event of decodeStream(fileStream)) {
 *   console.log(event)
 *   // { type: 'header', version: 1 }
 *   // { type: 'startObject', keyCount: 2 }
 *   // ...
 * }
 * ```
 */
export function decodeStream(
  source: AsyncIterable<Uint8Array> | Iterable<Uint8Array>,
  options?: DecodeOptions,
): AsyncIterable<BoonStreamEvent> {
  return decodeStreamCore(source, options)
}

/**
 * Calculates the approximate size of BOON encoding without actually encoding.
 * Useful for pre-allocating buffers.
 *
 * @param input - Any JavaScript value
 * @returns Estimated size in bytes
 */
export function estimateSize(input: unknown): number {
  const normalizedValue = normalizeValue(input)
  return estimateValueSize(normalizedValue) + 5 // +5 for header
}

function estimateValueSize(value: JsonValue): number {
  if (value === null)
    return 1

  switch (typeof value) {
    case 'boolean':
      return 1
    case 'number':
      return Number.isInteger(value) ? 5 : 9 // conservative estimate
    case 'string': {
      const byteLength = new TextEncoder().encode(value).length
      if (byteLength === 0)
        return 1
      if (byteLength <= 31)
        return 1 + byteLength
      if (byteLength <= 255)
        return 2 + byteLength
      if (byteLength <= 65535)
        return 3 + byteLength
      return 5 + byteLength
    }
    case 'object': {
      if (Array.isArray(value)) {
        let size = value.length <= 15 ? 1 : value.length <= 255 ? 2 : value.length <= 65535 ? 3 : 5
        for (const item of value) {
          size += estimateValueSize(item)
        }
        return size
      }
      else {
        const keys = Object.keys(value)
        let size = keys.length <= 15 ? 1 : keys.length <= 255 ? 2 : keys.length <= 65535 ? 3 : 5
        for (const key of keys) {
          const keyBytes = new TextEncoder().encode(key).length
          size += (keyBytes <= 254 ? 1 : keyBytes <= 65535 ? 3 : 5) + keyBytes
          size += estimateValueSize(value[key]!)
        }
        return size
      }
    }
    default:
      return 1
  }
}

function resolveEncodeOptions(options?: EncodeOptions): ResolvedEncodeOptions {
  return {
    includeHeader: options?.includeHeader ?? true,
    initialBufferSize: options?.initialBufferSize ?? DEFAULT_BUFFER_SIZE,
    useStringTable: options?.useStringTable ?? true,
  }
}

function resolveDecodeOptions(options?: DecodeOptions): ResolvedDecodeOptions {
  return {
    expectHeader: options?.expectHeader ?? true,
    strict: options?.strict ?? true,
  }
}

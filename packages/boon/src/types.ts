// #region JSON types (compatible with @toon-format/toon)

export type JsonPrimitive = string | number | boolean | null
export type JsonObject = { [Key in string]: JsonValue } & { [Key in string]?: JsonValue | undefined }
export type JsonArray = JsonValue[] | readonly JsonValue[]
export type JsonValue = JsonPrimitive | JsonObject | JsonArray

// #endregion

// #region Encoder options

export interface EncodeOptions {
  /**
   * Include the BOON magic number and version header.
   * @default true
   */
  includeHeader?: boolean
  /**
   * Initial buffer size in bytes.
   * @default 4096
   */
  initialBufferSize?: number
  /**
   * Use string table optimization for object keys.
   * Reduces size for data with repeated keys.
   * Set to false to disable automatic optimization.
   * @default true
   */
  useStringTable?: boolean
}

export type ResolvedEncodeOptions = Readonly<Required<EncodeOptions>>

// #endregion

// #region Decoder options

export interface DecodeOptions {
  /**
   * Expect and validate the BOON magic number and version header.
   * Set to false when decoding fragments without headers.
   * @default true
   */
  expectHeader?: boolean
  /**
   * When true, enforce strict validation of format.
   * @default true
   */
  strict?: boolean
}

export type ResolvedDecodeOptions = Readonly<Required<DecodeOptions>>

// #endregion

// #region Streaming types

export type BoonStreamEvent
  = | { type: 'header', version: number }
    | { type: 'startObject', keyCount: number }
    | { type: 'endObject' }
    | { type: 'startArray', length: number }
    | { type: 'endArray' }
    | { type: 'key', key: string }
    | { type: 'primitive', value: JsonPrimitive }

// #endregion

// #region Buffer types

/**
 * A buffer that grows dynamically as needed.
 */
export interface GrowableBuffer {
  buffer: Uint8Array
  view: DataView
  offset: number
  grow: (minCapacity: number) => void
  ensureCapacity: (bytesNeeded: number) => void
  getResult: () => Uint8Array
}

/**
 * A reader for sequential binary data.
 */
export interface BinaryReader {
  buffer: Uint8Array
  view: DataView
  offset: number
  remaining: () => number
  readUint8: () => number
  readInt8: () => number
  readUint16: () => number
  readInt16: () => number
  readUint32: () => number
  readInt32: () => number
  readFloat32: () => number
  readFloat64: () => number
  readBytes: (length: number) => Uint8Array
  readBigInt64: () => bigint
}

// #endregion

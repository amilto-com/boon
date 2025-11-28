// BOON (Binary Object Notation) Wire Format
//
// BOON is a compact binary encoding of the JSON data model designed for:
// - Memory efficiency: Minimal overhead, varint-encoded lengths
// - Cross-platform AI: Consistent byte representation across platforms
// - Streaming support: Can be decoded incrementally
//
// Format overview:
// - Type tags are single bytes identifying the value type
// - Lengths are encoded as variable-length integers (varints)
// - Strings are UTF-8 encoded with varint length prefix
// - Numbers are encoded efficiently based on their actual value
// - Arrays and objects use varint length prefixes

// #region Type Tags

/**
 * Type tags for BOON binary format.
 * Single byte identifier for each JSON value type.
 *
 * Type tag ranges:
 * 0x00-0x0F: Primitives (null, booleans)
 * 0x10-0x1F: Integer types
 * 0x20-0x2F: Float types
 * 0x30-0x3F: String types
 * 0x40-0x4F: Array types
 * 0x50-0x5F: Object types
 */
export const TYPE_TAG = {
  // Primitives
  NULL: 0x00,
  FALSE: 0x01,
  TRUE: 0x02,
  // Integer types (optimized for common sizes)
  INT8: 0x10,
  INT16: 0x11,
  INT32: 0x12,
  INT64: 0x13,
  UINT8: 0x14,
  UINT16: 0x15,
  UINT32: 0x16,
  // Float types
  FLOAT32: 0x20,
  FLOAT64: 0x21,
  // String types
  STRING_EMPTY: 0x30,
  STRING_SHORT: 0x31, // Length 1-255 bytes (1-byte length)
  STRING_MEDIUM: 0x32, // Length 256-65535 bytes (2-byte length)
  STRING_LONG: 0x33, // Length > 65535 bytes (4-byte length)
  // Array types
  ARRAY_EMPTY: 0x40,
  ARRAY_SHORT: 0x41, // Length 1-255 items (1-byte length)
  ARRAY_MEDIUM: 0x42, // Length 256-65535 items (2-byte length)
  ARRAY_LONG: 0x43, // Length > 65535 items (4-byte length)
  // Object types
  OBJECT_EMPTY: 0x50,
  OBJECT_SHORT: 0x51, // 1-255 keys (1-byte count)
  OBJECT_MEDIUM: 0x52, // 256-65535 keys (2-byte count)
  OBJECT_LONG: 0x53, // > 65535 keys (4-byte count)
  // Header with string table (optimization)
  HEADER_WITH_STRING_TABLE: 0x60,
} as const

export type TypeTag = typeof TYPE_TAG[keyof typeof TYPE_TAG]

// #endregion

// #region Magic Number and Version

/**
 * BOON file magic number: "BOON" in ASCII
 * Used to identify BOON files and validate format.
 */
export const MAGIC_NUMBER: Uint8Array = new Uint8Array([0x42, 0x4F, 0x4F, 0x4E]) // "BOON"

/**
 * Current BOON format version.
 */
export const FORMAT_VERSION: number = 1

// #endregion

// #region Size Constants

/**
 * Maximum sizes for different length encodings.
 */
export const MAX_SHORT_LENGTH: number = 255
export const MAX_MEDIUM_LENGTH: number = 65535

// Integer bounds
export const INT8_MIN: number = -128
export const INT8_MAX: number = 127
export const INT16_MIN: number = -32768
export const INT16_MAX: number = 32767
export const INT32_MIN: number = -2147483648
export const INT32_MAX: number = 2147483647
export const UINT8_MAX: number = 255
export const UINT16_MAX: number = 65535
export const UINT32_MAX: number = 4294967295

// Buffer sizes
export const DEFAULT_BUFFER_SIZE: number = 4096
export const MIN_BUFFER_SIZE: number = 64
export const MAX_BUFFER_SIZE: number = 16 * 1024 * 1024 // 16MB

// #endregion

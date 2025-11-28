import type { BinaryReader, GrowableBuffer } from '../types'
import { DEFAULT_BUFFER_SIZE } from '../constants'

/**
 * Creates a growable buffer for encoding BOON data.
 * The buffer automatically grows when needed.
 */
export function createGrowableBuffer(initialSize: number = DEFAULT_BUFFER_SIZE): GrowableBuffer {
  let buffer = new Uint8Array(initialSize)
  let view = new DataView(buffer.buffer)
  let offset = 0

  return {
    get buffer() {
      return buffer
    },
    get view() {
      return view
    },
    get offset() {
      return offset
    },
    set offset(value: number) {
      offset = value
    },

    grow(minCapacity: number) {
      const newSize = Math.max(buffer.length * 2, minCapacity)
      const newBuffer = new Uint8Array(newSize)
      newBuffer.set(buffer)
      buffer = newBuffer
      view = new DataView(buffer.buffer)
    },

    ensureCapacity(bytesNeeded: number) {
      if (offset + bytesNeeded > buffer.length) {
        this.grow(offset + bytesNeeded)
      }
    },

    getResult(): Uint8Array {
      return buffer.slice(0, offset)
    },
  }
}

/**
 * Creates a binary reader for decoding BOON data.
 */
export function createBinaryReader(data: Uint8Array): BinaryReader {
  const buffer = data
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength)
  let offset = 0

  return {
    get buffer() {
      return buffer
    },
    get view() {
      return view
    },
    get offset() {
      return offset
    },
    set offset(value: number) {
      offset = value
    },

    remaining(): number {
      return buffer.length - offset
    },

    readUint8(): number {
      if (offset >= buffer.length) {
        throw new RangeError('Buffer underflow: cannot read uint8')
      }
      return buffer[offset++]!
    },

    readInt8(): number {
      if (offset >= buffer.length) {
        throw new RangeError('Buffer underflow: cannot read int8')
      }
      const value = view.getInt8(offset)
      offset++
      return value
    },

    readUint16(): number {
      if (offset + 2 > buffer.length) {
        throw new RangeError('Buffer underflow: cannot read uint16')
      }
      const value = view.getUint16(offset, false) // big-endian
      offset += 2
      return value
    },

    readInt16(): number {
      if (offset + 2 > buffer.length) {
        throw new RangeError('Buffer underflow: cannot read int16')
      }
      const value = view.getInt16(offset, false) // big-endian
      offset += 2
      return value
    },

    readUint32(): number {
      if (offset + 4 > buffer.length) {
        throw new RangeError('Buffer underflow: cannot read uint32')
      }
      const value = view.getUint32(offset, false) // big-endian
      offset += 4
      return value
    },

    readInt32(): number {
      if (offset + 4 > buffer.length) {
        throw new RangeError('Buffer underflow: cannot read int32')
      }
      const value = view.getInt32(offset, false) // big-endian
      offset += 4
      return value
    },

    readFloat32(): number {
      if (offset + 4 > buffer.length) {
        throw new RangeError('Buffer underflow: cannot read float32')
      }
      const value = view.getFloat32(offset, false) // big-endian
      offset += 4
      return value
    },

    readFloat64(): number {
      if (offset + 8 > buffer.length) {
        throw new RangeError('Buffer underflow: cannot read float64')
      }
      const value = view.getFloat64(offset, false) // big-endian
      offset += 8
      return value
    },

    readBytes(length: number): Uint8Array {
      if (offset + length > buffer.length) {
        throw new RangeError(`Buffer underflow: cannot read ${length} bytes`)
      }
      const bytes = buffer.slice(offset, offset + length)
      offset += length
      return bytes
    },

    readBigInt64(): bigint {
      if (offset + 8 > buffer.length) {
        throw new RangeError('Buffer underflow: cannot read bigint64')
      }
      const value = view.getBigInt64(offset, false) // big-endian
      offset += 8
      return value
    },
  }
}

/**
 * UTF-8 text encoder (singleton for performance).
 */
export const textEncoder = new TextEncoder()

/**
 * UTF-8 text decoder (singleton for performance).
 */
export const textDecoder = new TextDecoder('utf-8')

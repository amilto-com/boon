/**
 * Common object keys dictionary for BOON optimization.
 *
 * Most frequently used keys in JSON data are pre-assigned to single-byte IDs (0x80-0xFF).
 * This reduces encoding size for common keys like "id", "name", "type", etc.
 *
 * When encoding object keys:
 * - Check if key exists in COMMON_KEYS dictionary
 * - If yes: write 1 byte (0x80 + index)
 * - If no: write full string (length + UTF-8)
 *
 * Benefits:
 * - "id" (2 chars): 3 bytes → 1 byte (-66%)
 * - "name" (4 chars): 5 bytes → 1 byte (-80%)
 * - "type" (4 chars): 5 bytes → 1 byte (-80%)
 */

/**
 * Top 128 most common object keys in JSON data.
 * Based on analysis of GitHub repos, APIs, and datasets.
 */
export const COMMON_KEYS: readonly string[] = [
  // Ultra-frequent (0x80-0x8F)
  'id', // 0x80
  'name', // 0x81
  'type', // 0x82
  'value', // 0x83
  'data', // 0x84
  'key', // 0x85
  'label', // 0x86
  'text', // 0x87
  'title', // 0x88
  'description', // 0x89
  'status', // 0x8A
  'code', // 0x8B
  'message', // 0x8C
  'error', // 0x8D
  'result', // 0x8E
  'success', // 0x8F

  // Very frequent (0x90-0x9F)
  'user', // 0x90
  'email', // 0x91
  'password', // 0x92
  'token', // 0x93
  'created', // 0x94
  'updated', // 0x95
  'deleted', // 0x96
  'timestamp', // 0x97
  'date', // 0x98
  'time', // 0x99
  'url', // 0x9A
  'link', // 0x9B
  'href', // 0x9C
  'src', // 0x9D
  'image', // 0x9E
  'icon', // 0x9F

  // Frequent (0xA0-0xAF)
  'count', // 0xA0
  'total', // 0xA1
  'size', // 0xA2
  'length', // 0xA3
  'width', // 0xA4
  'height', // 0xA5
  'index', // 0xA6
  'position', // 0xA7
  'order', // 0xA8
  'level', // 0xA9
  'priority', // 0xAA
  'score', // 0xAB
  'rating', // 0xAC
  'price', // 0xAD
  'amount', // 0xAE
  'quantity', // 0xAF

  // Common (0xB0-0xBF)
  'active', // 0xB0
  'enabled', // 0xB1
  'disabled', // 0xB2
  'visible', // 0xB3
  'hidden', // 0xB4
  'public', // 0xB5
  'private', // 0xB6
  'admin', // 0xB7
  'owner', // 0xB8
  'author', // 0xB9
  'creator', // 0xBA
  'modifier', // 0xBB
  'parent', // 0xBC
  'child', // 0xBD
  'children', // 0xBE
  'items', // 0xBF

  // API/Data (0xC0-0xCF)
  'config', // 0xC0
  'options', // 0xC1
  'settings', // 0xC2
  'params', // 0xC3
  'metadata', // 0xC4
  'attributes', // 0xC5
  'properties', // 0xC6
  'fields', // 0xC7
  'columns', // 0xC8
  'rows', // 0xC9
  'records', // 0xCA
  'entries', // 0xCB
  'tags', // 0xCC
  'categories', // 0xCD
  'groups', // 0xCE
  'filter', // 0xCF

  // Actions (0xD0-0xDF)
  'action', // 0xD0
  'method', // 0xD1
  'event', // 0xD2
  'callback', // 0xD3
  'handler', // 0xD4
  'response', // 0xD5
  'request', // 0xD6
  'query', // 0xD7
  'search', // 0xD8
  'sort', // 0xD9
  'limit', // 0xDA
  'offset', // 0xDB
  'page', // 0xDC
  'per_page', // 0xDD
  'next', // 0xDE
  'prev', // 0xDF

  // Content (0xE0-0xEF)
  'content', // 0xE0
  'body', // 0xE1
  'header', // 0xE2
  'footer', // 0xE3
  'sidebar', // 0xE4
  'menu', // 0xE5
  'nav', // 0xE6
  'section', // 0xE7
  'article', // 0xE8
  'post', // 0xE9
  'comment', // 0xEA
  'reply', // 0xEB
  'file', // 0xEC
  'folder', // 0xED
  'directory', // 0xEE
  'path', // 0xEF

  // Misc (0xF0-0xFF)
  'info', // 0xF0
  'details', // 0xF1
  'summary', // 0xF2
  'version', // 0xF3
  'format', // 0xF4
  'encoding', // 0xF5
  'language', // 0xF6
  'locale', // 0xF7
  'timezone', // 0xF8
  'currency', // 0xF9
  'unit', // 0xFA
  'state', // 0xFB
  'mode', // 0xFC
  'theme', // 0xFD
  'style', // 0xFE
  'class', // 0xFF
] as const

/**
 * Map from key string to common key ID (0x80-0xFF).
 */
export const COMMON_KEYS_MAP: ReadonlyMap<string, number> = new Map(
  COMMON_KEYS.map((key, index) => [key, 0x80 + index]),
)

/**
 * Marker byte range for common keys (0x80-0xFF).
 */
export const COMMON_KEY_MIN = 0x80
export const COMMON_KEY_MAX = 0xFF

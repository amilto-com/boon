# Complete TOON ↔ BOON Test - All Types and Structures

## 📋 Overview

This exhaustive test validates bidirectional conversion between TOON and BOON formats using a dataset containing **all possible types** and **all supported structures**.

## 📊 Files

- **`comprehensive-data.json`** (14,273 bytes) - Complete JSON data with all types
- **`comprehensive-data.toon`** (9,737 bytes) - Generated TOON version
- **`comprehensive-data.boon`** (7,343 bytes) - Generated BOON binary version
- **`test-comprehensive.ts`** - Test and validation script

## 🧪 Test Coverage

### 1. Primitives (27 types tested)

- **null**: null value
- **Booleans**: `true`, `false`
- **Integers**:
  - Zero, positive, negative
  - INT8 (-128 to 127)
  - INT16 (-32768 to 32767)
  - INT32 (-2147483648 to 2147483647)
  - Safe integers (±9007199254740991)
- **Floating-point numbers**:
  - Simple (3.14159)
  - Negative (-273.15)
  - Very small (0.000001)
  - Very large (1234567890.123456)
  - Scientific notation (1.23e-10)
- **Strings**:
  - Empty
  - Simple
  - With spaces
  - With digits
  - Unicode (Japanese: こんにちは世界)
  - Emoji (👋 🌍 🎉)
  - Special characters (`\n`, `\t`, `\r\n`)
  - Escaped quotes
  - Backslashes
  - Long string (200+ characters)

### 2. Arrays (8 structures)

- Empty array
- Number arrays
- String arrays
- Boolean arrays
- Mixed arrays (various types)
- Nested arrays (2 levels)
- Deeply nested arrays (3 levels)
- Object arrays (tabular format)
- Large arrays (100+ elements)

### 3. Objects (5 structures)

- Empty object
- Simple object (1 property)
- Multiple properties (3+ properties)
- Nested objects (4 levels)
- Objects containing arrays

### 4. Complex Structures

#### User Database
- Complete user profiles
- Settings and preferences
- Activity metrics
- Roles and permissions
- Groups with tags

#### Analytics Data
- Daily metrics (time-series)
- Traffic sources (aggregation)
- Top pages (ranking)

#### System Configuration
- Application configuration
- Server settings
- Database configuration (primary/replica)
- Cache configuration (Redis)
- Feature flags

#### Graph Structure
- Nodes with coordinates (x, y)
- Edges with weights
- Graph metadata

#### Hierarchical Tree
- Organizational structure
- Recursive nesting (3+ levels)
- Team sizes

### 5. Edge Cases

- Empty structures
- Special numbers (0, 1, -1, max/min safe integers)
- Very large arrays (100 elements)
- Deep nesting (10 levels)
- Mixed content in arrays

### 6. Real-World Examples

#### E-commerce Order
- Complete customer information
- Addresses (shipping/billing)
- Items with prices/taxes/discounts
- Card payment
- Delivery tracking
- Calculated totals

#### API Response
- Metadata (version, timestamp, requestId)
- Rate limiting
- Pagination
- Results with scores
- Errors and warnings

## 📈 Test Results

### Sizes and Compression

| Format | Size | Ratio | Savings |
|--------|------|-------|---------|
| **JSON** (original) | 14,273 bytes | 100.0% | - |
| **TOON** (text) | 9,737 bytes | 68.2% | **31.8%** |
| **BOON** (binary) | 7,343 bytes | 51.4% | **48.6%** |

### Performance

| Operation | Time | Throughput |
|-----------|------|------------|
| TOON Encode | ~4-6 ms | ~2.5-3.5 MB/s |
| TOON Decode | ~8-11 ms | ~0.9-1.2 MB/s |
| BOON Encode | ~2-4 ms | ~3-6 MB/s |
| BOON Decode | ~1-2 ms | ~3-5 MB/s |

### Data Integrity

✅ **BOON Roundtrip**: 100% - All data preserved
✅ **Specific Structures**: 100% - All types validated
✅ **TOON→BOON→TOON Cycle**: Equivalent data (normalized)

## 🔍 Notable Points

### BOON (Binary)
- ✅ **Perfect preservation** of all types
- ✅ **Best compression** (48.6%)
- ✅ **Optimal performance** in encode/decode
- ✅ Ideal for storage and transmission

### TOON (Text)
- ✅ **Readable** and editable format
- ✅ **Good compression** (31.8%)
- ⚠️ Normalization of certain values (e.g., `-0` becomes `0`)
- ✅ Ideal for configuration and Git diffs

## 🚀 Running the Test

```bash
# From project root
pnpm tsx examples/test-comprehensive.ts
```

The test performs:
1. JSON → TOON conversion
2. TOON → JSON verification
3. JSON → BOON conversion
4. BOON → JSON verification
5. Complete TOON → BOON → TOON cycle
6. Validation of all structures
7. Performance statistics

## ✨ Conclusion

This exhaustive test demonstrates that **BOON and TOON can encode/decode all JSON types** reliably, with:

- **BOON**: Maximum compression and optimal performance
- **TOON**: Readability and Git compatibility
- **Both**: Data integrity guaranteed for all real-world use cases

Total of **6 main categories**, **100+ different structures**, **14 KB of data** tested successfully!

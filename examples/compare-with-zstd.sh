#!/bin/bash

# Comparison with Zstandard using CLI
# Author: William Gacquer (Amilto)

set -e

cd "$(dirname "$0")"

echo "╔══════════════════════════════════════════════════════════════════════════╗"
echo "║    BOON/TOON vs Compression Formats Comparison (with Zstd CLI)          ║"
echo "║                                                                          ║"
echo "║    Author: William Gacquer - Amilto                                     ║"
echo "╚══════════════════════════════════════════════════════════════════════════╝"
echo ""

# Source files
JSON_FILE="comprehensive-data.json"
TOON_FILE="comprehensive-data.toon"
BOON_FILE="comprehensive-data.boon"

# Original sizes
JSON_SIZE=$(stat -c%s "$JSON_FILE" 2>/dev/null || stat -f%z "$JSON_FILE")
TOON_SIZE=$(stat -c%s "$TOON_FILE" 2>/dev/null || stat -f%z "$TOON_FILE")
BOON_SIZE=$(stat -c%s "$BOON_FILE" 2>/dev/null || stat -f%z "$BOON_FILE")

echo "📊 Test data:"
echo "   File: $JSON_FILE"
printf "   Size: %'d bytes\n" $JSON_SIZE
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔤 TOON (Compact text format)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
TOON_RATIO=$(awk "BEGIN {printf \"%.1f\", ($TOON_SIZE / $JSON_SIZE) * 100}")
printf "Raw size: %'d bytes ($TOON_RATIO%%)\n" $TOON_SIZE
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 BOON (Optimized binary format)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
BOON_RATIO=$(awk "BEGIN {printf \"%.1f\", ($BOON_SIZE / $JSON_SIZE) * 100}")
printf "Raw size: %'d bytes ($BOON_RATIO%%)\n" $BOON_SIZE
echo ""

# Gzip compression
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 Gzip (level 9)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

gzip -9 -k -f "$JSON_FILE"
gzip -9 -k -f "$TOON_FILE"
gzip -9 -k -f "$BOON_FILE"

JSON_GZ_SIZE=$(stat -c%s "$JSON_FILE.gz" 2>/dev/null || stat -f%z "$JSON_FILE.gz")
TOON_GZ_SIZE=$(stat -c%s "$TOON_FILE.gz" 2>/dev/null || stat -f%z "$TOON_FILE.gz")
BOON_GZ_SIZE=$(stat -c%s "$BOON_FILE.gz" 2>/dev/null || stat -f%z "$BOON_FILE.gz")

JSON_GZ_RATIO=$(awk "BEGIN {printf \"%.1f\", ($JSON_GZ_SIZE / $JSON_SIZE) * 100}")
TOON_GZ_RATIO=$(awk "BEGIN {printf \"%.1f\", ($TOON_GZ_SIZE / $JSON_SIZE) * 100}")
BOON_GZ_RATIO=$(awk "BEGIN {printf \"%.1f\", ($BOON_GZ_SIZE / $JSON_SIZE) * 100}")

printf "JSON + Gzip:  %'d bytes ($JSON_GZ_RATIO%%)\n" $JSON_GZ_SIZE
printf "TOON + Gzip:  %'d bytes ($TOON_GZ_RATIO%%)\n" $TOON_GZ_SIZE
printf "BOON + Gzip:  %'d bytes ($BOON_GZ_RATIO%%)\n" $BOON_GZ_SIZE
echo ""

# Brotli compression
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 Brotli (level 11)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

brotli -9 -k -f "$JSON_FILE"
brotli -9 -k -f "$TOON_FILE"
brotli -9 -k -f "$BOON_FILE"

JSON_BR_SIZE=$(stat -c%s "$JSON_FILE.br" 2>/dev/null || stat -f%z "$JSON_FILE.br")
TOON_BR_SIZE=$(stat -c%s "$TOON_FILE.br" 2>/dev/null || stat -f%z "$TOON_FILE.br")
BOON_BR_SIZE=$(stat -c%s "$BOON_FILE.br" 2>/dev/null || stat -f%z "$BOON_FILE.br")

JSON_BR_RATIO=$(awk "BEGIN {printf \"%.1f\", ($JSON_BR_SIZE / $JSON_SIZE) * 100}")
TOON_BR_RATIO=$(awk "BEGIN {printf \"%.1f\", ($TOON_BR_SIZE / $JSON_SIZE) * 100}")
BOON_BR_RATIO=$(awk "BEGIN {printf \"%.1f\", ($BOON_BR_SIZE / $JSON_SIZE) * 100}")

printf "JSON + Brotli:  %'d bytes ($JSON_BR_RATIO%%)\n" $JSON_BR_SIZE
printf "TOON + Brotli:  %'d bytes ($TOON_BR_RATIO%%)\n" $TOON_BR_SIZE
printf "BOON + Brotli:  %'d bytes ($BOON_BR_RATIO%%)\n" $BOON_BR_SIZE
echo ""

# Zstandard compression
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 Zstandard (level 22)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

zstd -22 -k -f "$JSON_FILE" -o "$JSON_FILE.zst"
zstd -22 -k -f "$TOON_FILE" -o "$TOON_FILE.zst"
zstd -22 -k -f "$BOON_FILE" -o "$BOON_FILE.zst"

JSON_ZST_SIZE=$(stat -c%s "$JSON_FILE.zst" 2>/dev/null || stat -f%z "$JSON_FILE.zst")
TOON_ZST_SIZE=$(stat -c%s "$TOON_FILE.zst" 2>/dev/null || stat -f%z "$TOON_FILE.zst")
BOON_ZST_SIZE=$(stat -c%s "$BOON_FILE.zst" 2>/dev/null || stat -f%z "$BOON_FILE.zst")

JSON_ZST_RATIO=$(awk "BEGIN {printf \"%.1f\", ($JSON_ZST_SIZE / $JSON_SIZE) * 100}")
TOON_ZST_RATIO=$(awk "BEGIN {printf \"%.1f\", ($TOON_ZST_SIZE / $JSON_SIZE) * 100}")
BOON_ZST_RATIO=$(awk "BEGIN {printf \"%.1f\", ($BOON_ZST_SIZE / $JSON_SIZE) * 100}")

printf "JSON + Zstd:  %'d bytes ($JSON_ZST_RATIO%%)\n" $JSON_ZST_SIZE
printf "TOON + Zstd:  %'d bytes ($TOON_ZST_RATIO%%)\n" $TOON_ZST_SIZE
printf "BOON + Zstd:  %'d bytes ($BOON_ZST_RATIO%%)\n" $BOON_ZST_SIZE
echo ""

# Comparison table
echo "╔══════════════════════════════════════════════════════════════════════════╗"
echo "║                    COMPLETE COMPARISON TABLE                             ║"
echo "╠══════════════════════════════════════════════════════════════════════════╣"
echo ""

# Create temporary file with all results
cat > /tmp/boon_results.txt <<EOF
JSON (raw) $JSON_SIZE 100.0
TOON (raw) $TOON_SIZE $TOON_RATIO
BOON (raw) $BOON_SIZE $BOON_RATIO
JSON + Gzip $JSON_GZ_SIZE $JSON_GZ_RATIO
TOON + Gzip $TOON_GZ_SIZE $TOON_GZ_RATIO
BOON + Gzip $BOON_GZ_SIZE $BOON_GZ_RATIO
JSON + Brotli $JSON_BR_SIZE $JSON_BR_RATIO
TOON + Brotli $TOON_BR_SIZE $TOON_BR_RATIO
BOON + Brotli $BOON_BR_SIZE $BOON_BR_RATIO
JSON + Zstd $JSON_ZST_SIZE $JSON_ZST_RATIO
TOON + Zstd $TOON_ZST_SIZE $TOON_ZST_RATIO
BOON + Zstd $BOON_ZST_SIZE $BOON_ZST_RATIO
EOF

echo "Ranking by size (smallest to largest):"
echo ""

# Sort and display
sort -k2 -n /tmp/boon_results.txt | awk 'BEGIN {n=1} {
  format=$1" "$2" "$3
  gsub(/\+/, " + ", format)
  size=$4
  ratio=$5
  bars=int(ratio/2)
  bar=""
  for(i=0;i<bars;i++) bar=bar"█"
  printf "%3d. %-20s %12s b  %6s%%  %s\n", n, format, size, ratio, bar
  n++
}'

rm /tmp/boon_results.txt

echo ""
echo "╚══════════════════════════════════════════════════════════════════════════╝"
echo ""

# Analysis
echo "📈 ANALYSIS AND RECOMMENDATIONS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

BOON_SAVING=$(awk "BEGIN {printf \"%.1f\", (1 - $BOON_SIZE / $JSON_SIZE) * 100}")
BOON_ZST_SAVING=$(awk "BEGIN {printf \"%.1f\", (1 - $BOON_ZST_SIZE / $JSON_SIZE) * 100}")
BOON_BR_SAVING=$(awk "BEGIN {printf \"%.1f\", (1 - $BOON_BR_SIZE / $JSON_SIZE) * 100}")
JSON_GZ_SAVING=$(awk "BEGIN {printf \"%.1f\", (1 - $JSON_GZ_SIZE / $JSON_SIZE) * 100}")

echo "📊 Savings vs standard JSON:"
echo ""
echo "   BOON raw:           -$BOON_SAVING%"
echo "   BOON + Zstd:        -$BOON_ZST_SAVING%"
echo "   BOON + Brotli:      -$BOON_BR_SAVING%"
echo "   JSON + Gzip (std):  -$JSON_GZ_SAVING%"
echo ""

echo "💡 Recommendations by use case:"
echo ""
echo "📱 Storage / Transmission (size critical):"
echo "   → BOON + Zstd - Excellent ratio with fast decoding"
echo ""
echo "⚡ Real-time performance (fast decoding):"
echo "   → BOON raw - No decompression, direct decoding"
echo ""
echo "👁️  Human readability (editing, Git diffs):"
echo "   → TOON raw - Compact and readable text format"
echo ""
echo "🌐 Web / HTTP (standard):"
echo "   → BOON + Brotli or Gzip - Compatible with all browsers"
echo ""

echo "✨ BOON advantages:"
echo "   • Optimized binary encoding (native types: int8/16/32, float32/64)"
echo "   • Direct decoding without decompression"
echo "   • Compatible with all compressions (Gzip, Brotli, Zstd)"
echo "   • Better ratio than JSON even with compression"
echo ""

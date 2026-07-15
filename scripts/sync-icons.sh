#!/usr/bin/env bash
#
# Sync service icons from root Icons/ → web + mobile.
# Run: bash scripts/sync-icons.sh
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SOURCE="$ROOT/Icons"
WEB_DEST="$ROOT/apps/web/public/service-icons"
MOBILE_SVG="$ROOT/apps/mobile/src/assets/service-icons"
MOBILE_XML="$ROOT/apps/mobile/src/assets/serviceIconXml.ts"

if [ ! -d "$SOURCE" ]; then
  echo "ERROR: Icons/ folder not found at $SOURCE"
  exit 1
fi

COUNT=$(ls -1 "$SOURCE"/*.svg 2>/dev/null | wc -l | tr -d ' ')
echo "Found $COUNT SVGs in Icons/"

echo "→ Copying to web (public/service-icons)..."
mkdir -p "$WEB_DEST"
cp "$SOURCE"/*.svg "$WEB_DEST/"
echo "  ✓ $COUNT SVGs → $WEB_DEST"

echo "→ Copying to mobile (assets/service-icons)..."
mkdir -p "$MOBILE_SVG"
cp "$SOURCE"/*.svg "$MOBILE_SVG/"
echo "  ✓ $COUNT SVGs → $MOBILE_SVG"

echo "→ Generating serviceIconXml.ts for React Native..."
node -e "
const fs = require('fs');
const path = require('path');
const dir = '$MOBILE_SVG';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.svg'));
const entries = files.map(f => {
  const xml = fs.readFileSync(path.join(dir, f), 'utf8').trim();
  return '  ' + JSON.stringify(f) + ': ' + JSON.stringify(xml);
});
const content = '/** Auto-generated from Icons/ — do not edit manually. Run: bash scripts/sync-icons.sh */\nexport const SERVICE_ICON_XML: Record<string, string> = {\n' + entries.join(',\n') + '\n};\n';
fs.writeFileSync('$MOBILE_XML', content);
console.log('  ✓ ' + files.length + ' icons → serviceIconXml.ts');
"

echo ""
echo "✓ Icons synced! Web: refresh browser. Mobile: Metro will hot-reload."

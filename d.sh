#!/bin/bash

# ─────────────────────────────────────────
#  Auto Obfuscator - An0nOtF Bot
# ─────────────────────────────────────────

# CONFIG - change this to your bot root path
BOT_DIR="/root/bot"

# Files to obfuscate (relative to BOT_DIR)
FILES=(
  "index.js"
  "plugins/tools/st.js"
  "plugins/tools/chk.js"
  "plugins/tools/ppcharge.js"
  "plugins/tools/tools.js"
  "plugins/tools/fake.js"
  "plugins/tools/proxy.js"
  "plugins/tools/group.js"
  "plugins/tools/security.js"
  "plugins/tools/games.js"
  "plugins/tools/fun.js"
  "plugins/tools/ai.js"
  "plugins/tools/pairing.js"
  "plugins/tools/settings.js"
)

# ─────────────────────────────────────────
# Check javascript-obfuscator is installed
# ─────────────────────────────────────────
if ! command -v javascript-obfuscator &> /dev/null; then
  echo "📦 Installing javascript-obfuscator..."
  npm install -g javascript-obfuscator
fi

# ─────────────────────────────────────────
# Backup original files first
# ─────────────────────────────────────────
BACKUP_DIR="$BOT_DIR/backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
echo "💾 Backing up originals to $BACKUP_DIR"

for FILE in "${FILES[@]}"; do
  SRC="$BOT_DIR/$FILE"
  if [ -f "$SRC" ]; then
    DEST="$BACKUP_DIR/$FILE"
    mkdir -p "$(dirname "$DEST")"
    cp "$SRC" "$DEST"
  fi
done

echo ""
echo "🔒 Starting obfuscation..."
echo ""

# ─────────────────────────────────────────
# Obfuscate each file
# ─────────────────────────────────────────
SUCCESS=0
FAILED=0

for FILE in "${FILES[@]}"; do
  SRC="$BOT_DIR/$FILE"

  if [ ! -f "$SRC" ]; then
    echo "⚠️  Skipped (not found): $FILE"
    continue
  fi

  # index.js gets extra flags to keep terminal logging intact
  if [ "$(basename $FILE)" = "index.js" ]; then
    javascript-obfuscator "$SRC" \
      --output "$SRC" \
      --compact true \
      --string-array true \
      --string-array-encoding base64 \
      --string-array-threshold 0.5 \
      --identifier-names-generator hexadecimal \
      --self-defending true \
      --dead-code-injection false \
      --debug-protection false \
      --reserved-names "^color$,^console$,^log$,^startBot$,^loadPlugins$,^cmd$,^loaded$,^failed$,^commandName$,^commands$,^entry$,^filename$,^reason$,^idle$,^removed$" \
      --reserved-strings "✅,❌,⚠️,🚀,🔄,📦,📊,📱,🌐,👤,🧹,╔,║,╚" \
      2>/dev/null
  else
    javascript-obfuscator "$SRC" \
      --output "$SRC" \
      --compact true \
      --string-array true \
      --string-array-encoding base64 \
      --string-array-threshold 0.75 \
      --identifier-names-generator hexadecimal \
      --self-defending true \
      --dead-code-injection false \
      --debug-protection false \
      2>/dev/null
  fi

  if [ $? -eq 0 ]; then
    echo "✅ Obfuscated: $FILE"
    ((SUCCESS++))
  else
    echo "❌ Failed:     $FILE"
    ((FAILED++))
  fi
done

# ─────────────────────────────────────────
# Summary
# ─────────────────────────────────────────
echo ""
echo "─────────────────────────────────────────"
echo "✅ Success: $SUCCESS file(s)"
echo "❌ Failed:  $FAILED file(s)"
echo "💾 Backup:  $BACKUP_DIR"
echo "─────────────────────────────────────────"
echo ""
echo "🚀 Done! Restart your bot: pm2 restart all"

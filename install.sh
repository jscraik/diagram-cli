#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "📦 Installing diagram CLI..."
cd "$SCRIPT_DIR"
npm install

echo ""
echo "✅ Installed!"
echo ""
echo "Add to your PATH or use directly:"
echo "  node $SCRIPT_DIR/src/diagram.js --help"
echo ""
echo "Or install globally:"
echo "  npm link"
echo ""

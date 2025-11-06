#!/bin/bash

echo "🚀 Starting V3X Electron Browser..."
echo "=================================="
echo ""
echo "✅ Features:"
echo "• Full web browsing with Chromium engine"
echo "• Navigation controls (back, forward, reload, home)"
echo "• Address bar with search functionality"
echo "• Real webview that loads actual websites"
echo "• Developer tools enabled"
echo ""
echo "🎯 Usage:"
echo "• Enter URLs in the address bar"
echo "• Use navigation buttons"
echo "• Press Enter to navigate"
echo "• Search queries are automatically sent to Google"
echo ""
echo "Starting browser..."

# Compile TypeScript
echo "Compiling..."
npx tsc -p tsconfig.main.json

# Start Electron
echo "Launching Electron browser..."
npm start

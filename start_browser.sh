#!/bin/bash

echo "🌐 V3X Browser Launcher"
echo "======================="
echo ""
echo "Choose your browser version:"
echo ""
echo "1. CLI Browser (Command Line) - ✅ Ready to use"
echo "   • Works in terminal"
echo "   • Fetches and displays web content"
echo "   • Full navigation, bookmarks, history"
echo "   • System browser integration"
echo ""
echo "2. GUI Browser (Tkinter) - ⚠️  Requires tkinter"
echo "   • Graphical interface"
echo "   • Multiple tabs"
echo "   • Visual bookmarks panel"
echo ""
echo "3. Electron Browser - ⚠️  Requires npm install"
echo "   • Modern web browser"
echo "   • Full HTML rendering"
echo "   • Advanced features"
echo ""

read -p "Enter your choice (1-3): " choice

case $choice in
    1)
        echo ""
        echo "🚀 Starting CLI Browser..."
        echo "Commands: go <url>, bookmark, bookmarks, help, quit"
        echo ""
        python3 cli_browser.py
        ;;
    2)
        echo ""
        echo "🚀 Starting GUI Browser..."
        if python3 -c "import tkinter" 2>/dev/null; then
            python3 browser.py
        else
            echo "❌ Error: tkinter not available"
            echo "💡 Try option 1 (CLI Browser) instead"
        fi
        ;;
    3)
        echo ""
        echo "🚀 Starting Electron Browser..."
        if [ -f "package.json" ]; then
            if [ -d "node_modules" ]; then
                npm run dev
            else
                echo "Installing dependencies..."
                npm install && npm run dev
            fi
        else
            echo "❌ Error: Electron browser files not found"
        fi
        ;;
    *)
        echo "❌ Invalid choice. Starting CLI Browser by default..."
        python3 cli_browser.py
        ;;
esac

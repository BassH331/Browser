#!/bin/bash
echo "Starting V3X Browser..."
echo "========================================"
echo "A lightweight web browser built with Python"
echo "Features:"
echo "• Multi-tab browsing"
echo "• Navigation controls (Back/Forward/Reload/Home)"
echo "• Address bar with search functionality"
echo "• Bookmarks management"
echo "• Integration with system browser"
echo "========================================"
echo ""

# Check if Python 3 is available
if command -v python3 &> /dev/null; then
    python3 browser.py
elif command -v python &> /dev/null; then
    python browser.py
else
    echo "Error: Python is not installed or not in PATH"
    echo "Please install Python 3 to run this browser"
    exit 1
fi

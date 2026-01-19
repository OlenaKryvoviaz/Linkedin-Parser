#!/bin/bash

echo "========================================"
echo "macOS Permission Diagnostic Tool"
echo "========================================"
echo ""

# Check if Cursor has Full Disk Access
echo "1. Checking Full Disk Access..."
echo ""

CRASHPAD_DIR="/Users/o.kryvoviaz/Library/Application Support/Google/Chrome/Crashpad"

if [ -d "$CRASHPAD_DIR" ]; then
    echo "   Crashpad directory exists: ✅"
    
    # Try to create a test directory
    if mkdir "$CRASHPAD_DIR/test-permission" 2>/dev/null; then
        echo "   Can write to Crashpad: ✅"
        rmdir "$CRASHPAD_DIR/test-permission"
        echo ""
        echo "   ✅ PERMISSIONS ARE WORKING!"
        echo "   The browser should be able to launch."
    else
        echo "   Can write to Crashpad: ❌"
        echo ""
        echo "   ❌ PERMISSION DENIED"
        echo "   Cursor does NOT have Full Disk Access."
        echo ""
        echo "   Please:"
        echo "   1. Open System Settings → Privacy & Security → Full Disk Access"
        echo "   2. Make sure 'Cursor' is in the list and ENABLED (checkbox is checked)"
        echo "   3. If not, add /Applications/Cursor.app using the '+' button"
        echo "   4. Quit Cursor completely (Cmd+Q) and reopen it"
    fi
else
    echo "   Crashpad directory doesn't exist yet"
    echo "   Attempting to create it..."
    
    if mkdir -p "$CRASHPAD_DIR/pending" 2>/dev/null; then
        echo "   Created successfully: ✅"
        echo ""
        echo "   ✅ PERMISSIONS ARE WORKING!"
    else
        echo "   Creation failed: ❌"
        echo ""
        echo "   ❌ PERMISSION DENIED"
        echo "   See instructions above."
    fi
fi

echo ""
echo "2. Checking if Cursor is running..."
if pgrep -x "Cursor" > /dev/null; then
    echo "   Cursor is running: ✅"
    echo "   (If you just granted permissions, you MUST restart Cursor with Cmd+Q)"
else
    echo "   Cursor is not running: ❌"
    echo "   (This script should be run from within Cursor)"
fi

echo ""
echo "========================================"
echo "Diagnostic complete"
echo "========================================"

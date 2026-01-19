# macOS Chrome Permission Fix

## Problem
Chrome cannot launch due to macOS System Integrity Protection (SIP) preventing extended attribute access to the Crashpad directory.

## Solution: Grant Full Disk Access to Terminal

### Steps:

1. **Open System Settings**
   - Click the Apple menu () → System Settings

2. **Navigate to Privacy & Security**
   - Click "Privacy & Security" in the left sidebar
   - Scroll down and click "Full Disk Access"

3. **Add Cursor.app** (IMPORTANT!)
   - Click the lock icon and enter your password
   - Click the "+" button
   - Navigate to `/Applications/` and select **Cursor.app**
   - Click "Open"

4. **Enable Full Disk Access**
   - Make sure the checkbox next to **Cursor** is ENABLED (checked)
   - Close System Settings

5. **Restart Cursor** (CRITICAL STEP!)
   - Press **Cmd + Q** to quit Cursor completely
   - Wait 3-5 seconds
   - Reopen Cursor from Applications
   - **DO NOT** just close the window - you MUST quit the app completely

6. **Test Again**
   ```bash
   npm run test-session
   ```

## Alternative: Run with sudo (Not Recommended)

If you cannot grant Full Disk Access, you can run with sudo, but this is **not recommended** for security reasons:

```bash
sudo npm run dev
```

## Verify It Worked

After granting Full Disk Access and restarting, you should see:
```
✅ Browser launched
🍪 Loaded saved cookies
📡 Navigating to LinkedIn...
```

Instead of:
```
❌ Error: Failed to launch the browser process
ERROR:crash_report_database_mac.mm
```

## How to Verify Full Disk Access is Set Up Correctly

1. Open System Settings → Privacy & Security → Full Disk Access
2. Look for **Cursor** in the list
3. Make sure the checkbox next to Cursor is **ENABLED (blue/checked)**
4. If you don't see Cursor, you need to add it using the "+" button

## Still Not Working?

If the issue persists after granting Full Disk Access:

1. **Double-check you added Cursor.app** (from /Applications/), not Terminal
2. **Verify the checkbox next to Cursor is enabled** in Full Disk Access
3. **Make sure you quit Cursor with Cmd+Q** and reopened it (not just closed the window)
4. Try removing and re-adding Cursor in Full Disk Access settings
5. As a last resort, restart your Mac

## Why This Happens

macOS System Integrity Protection (SIP) restricts applications from writing extended attributes (`xattr`) to certain directories. Chrome's Crashpad crash reporting system requires these permissions. Granting Full Disk Access allows the Terminal (and Node.js processes it launches) to bypass these restrictions.

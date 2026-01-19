# LinkedIn Login Flow

## How the System Handles Multiple Accounts

### Problem Solved
Previously, the system could get confused when:
- User provides their credentials but bot account is already logged in
- Multiple sessions conflict with each other
- Wrong account is pre-selected on login page

### Solution: Smart Account Management

## Flow for User Credentials (Own Profile Download)

1. **Separate Browser Instance**
   - Uses a completely separate Chrome profile (`.chrome-user-data-temp/`)
   - No conflict with bot account sessions
   - Browser is closed after download completes

2. **Account Verification**
   - Checks if someone is already logged in
   - Verifies if it's the correct account
   - Logs out if wrong account is detected

3. **Login Page Handling**
   - Detects pre-filled email addresses
   - Clicks "Sign in to another account" if needed
   - Clears pre-filled data if different from target account
   - Ensures clean login with user's credentials

4. **Session Isolation**
   - Bot cookies are NEVER loaded for user sessions
   - User session browser is completely closed after PDF generation
   - No cross-contamination between accounts

## Flow for Bot Account (URL-Based Download)

1. **Persistent Session**
   - Uses main browser instance with saved cookies
   - Session persists across requests for efficiency
   - Cookies saved in `linkedin-cookies.json`

2. **Session Reuse**
   - Checks if already logged in with bot account
   - Reuses session if valid
   - Only logs in again if session expired

## Login Process Steps

### For User Credentials:
```
1. Launch separate browser (isolated profile)
2. Navigate to LinkedIn
3. Check if anyone is logged in
4. If logged in:
   - Verify email matches user's email
   - If wrong account → logout
5. Navigate to login page
6. Check for "Sign in to another account" button
7. Clear any pre-filled email that doesn't match
8. Enter user credentials
9. Handle 2FA/verification if needed
10. Download profile
11. Close browser and clean up
```

### For Bot Account:
```
1. Use main browser instance
2. Load saved cookies
3. Navigate to LinkedIn
4. Check if logged in
5. If not logged in → perform login
6. Save cookies for next time
7. Download profile
8. Keep browser running for next request
```

## Benefits

✅ **No Account Conflicts**: User and bot sessions completely isolated

✅ **Clean Logins**: Always uses the correct account credentials

✅ **Handle Pre-filled Forms**: Detects and clears wrong pre-filled data

✅ **Account Switching**: Clicks "Sign in to another account" when needed

✅ **Automatic Logout**: Removes wrong sessions before login

✅ **Session Privacy**: User credentials never saved or mixed with bot account

## Debugging

If login fails, check these debug files:
- `debug-login-page.png` - Screenshot of login page
- `debug-user-profile.png` - Screenshot of user profile page
- `debug-public-profile.png` - Screenshot of public profile page (if applicable)

## Configuration

### Bot Account (in .env)
```
LINKEDIN_EMAIL=bot@example.com
LINKEDIN_PASSWORD=botpassword
```

These are ONLY used when:
- Downloading via LinkedIn profile URL
- No user credentials provided

### User Account
Provided per-request via API:
```json
{
  "userEmail": "user@example.com",
  "userPassword": "userpassword",
  "emailAddress": "delivery@example.com"
}
```

These are NEVER saved and only used for that specific request.

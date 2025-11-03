# Git Commit Log

This file tracks all git commits and pushes for easy reference.

**Note**: This file is automatically updated when commits are made. 

**To update this file:**
- When you ask me to "commit and push" or "push to git", I'll automatically add an entry here
- Just remind me: "update the git log" if I forget

**Format for each entry:**
- Date and time
- Branch name  
- Commit message/hash
- Summary of changes

---

## 2024-11-03

### Branch: APP-Interface

#### ✅ Add sticky navigation header with browser detection and git commit log tracking
- **Time**: 11:34 AM
- **Commit**: `01531bf`
- **Changes**:
  - Created `browserDetection.ts` utility for browser detection
  - Updated Navigation component with sticky positioning
  - Added Safari-specific `-webkit-sticky` support
  - Added browser detection hook for conditional CSS
  - Header now sticks to top on all browsers with Safari compatibility
  - Created `GIT_COMMIT_LOG.md` for tracking commits

#### 📝 Update git commit log with latest commit info
- **Time**: 11:35 AM
- **Commit**: `73c50df`
- **Changes**:
  - Fixed commit hash in git log
  - Updated timestamp

#### ✅ Fix Gmail multi-account support - proper account detection and individual disconnect
- **Time**: 11:54 AM
- **Commit**: `4e3e78f`
- **Changes**:
  - Fixed connection status detection to use `connectedAccounts.length` instead of old status check
  - Added individual account disconnect buttons (can disconnect specific accounts)
  - Updated backend disconnect endpoint to properly handle POST requests with email parameter
  - Improved email sending notifications to show which account was used
  - Added account list refresh after connect/disconnect/send operations
  - Updated AT Report email to refresh connected accounts after sending
  - Enhanced Connected Accounts UI with disconnect buttons and Add Account button
  - Fixed useEffect dependencies for Send As addresses fetching
  - All multi-account features now working per documentation

#### ✅ Implement Xero automatic token refresh - backend and frontend
- **Time**: 12:05 PM
- **Commit**: `80fc023`
- **Changes**:
  - Fixed backend `refresh_token()` to use direct HTTP requests instead of SDK OAuth2Token (fixes token refresh error)
  - Added `get_active_connection()` method that auto-refreshes tokens if expired or expiring within 5 minutes
  - Updated `_get_stored_token()` to use `get_active_connection()` for automatic refresh before API calls
  - Added frontend auto-refresh functionality:
    * Auto-refresh on status fetch if token expired/expiring
    * Periodic check every minute for tokens needing refresh
    * Silent auto-refresh (only shows notification on failure)
    * Prevents multiple simultaneous refresh attempts
  - Token refresh now works automatically without user intervention
  - Manual refresh button still available for user-triggered refresh

#### ✅ Configure timezone for Australia - backend and frontend
- **Time**: 12:19 PM
- **Commit**: `222e39a`
- **Changes**:
  - **Backend**: Updated Django TIME_ZONE from UTC to Australia/Sydney, LANGUAGE_CODE to en-au
  - **Frontend**: Created `dateFormatting.ts` utility using Luxon for consistent Australian timezone formatting
  - Updated all date displays to use Australian timezone:
    * XeroIntegration - connection dates, token expiry, sync logs
    * GmailIntegration - account connection, email sent times
    * SMSIntegration - message timestamps
    * NotesTest - note created/updated times
    * S3Integration - document upload dates
  - All dates now display in DD/MM/YYYY format with Australian Eastern Time (AEST/AEDT)
  - Automatic daylight saving time handling
  - No dependency on browser timezone settings
  - Created TIMEZONE_CONFIGURATION.md documentation

---

## Previous Commits (from main branch)

### Branch: main (merged from LettersV3)

#### ✅ Clean starting point - removed all custom alignment code
- **Date**: 2024-11-03
- **Changes**:
  - Removed all custom alignment CSS
  - Using standard Mantine defaults for layout
  - Clean starting point for APP-Interface work

---

## Notes

- Each commit entry should include:
  - Date
  - Branch name
  - Brief description
  - Key changes made
  - Any important notes


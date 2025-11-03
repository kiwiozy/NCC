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

## 2025-11-03 - SMS Webhook Implementation
  - Implemented inbound SMS webhook handler with support for GET and POST requests
  - Added support for JSON POST body with URL-encoded values from SMS Broadcast
  - Enhanced webhook logging for debugging
  - Fixed phone number parsing and cleaning (removes parentheses, spaces, dashes)
  - Implemented auto-refresh for SMS replies in frontend (5-second intervals)
  - Added reply count badges and modal for viewing message replies
  - Created comprehensive debugging guide for SMS webhook issues
  - Webhook now successfully receives replies from SMS Broadcast (POST with JSON body)
  - SMS replies now appearing automatically in the app within 5-10 seconds

## 2025-11-03 - S3 Integration Connection Fix
  - Fixed S3 Integration component to use HTTPS instead of HTTP
  - Updated all API endpoints (bucket_status, documents, upload, download, delete)
  - Added proper error handling with HTTP status code checks
  - S3 Document Storage now successfully connects to backend

## 2025-11-03 - AI Rewrite Button Fix
  - Fixed AI Generate Clinical Notes button in Notes component
  - Changed OpenAI API endpoint from HTTP to HTTPS
  - AI rewrite functionality now working correctly
  - Consistent with other API endpoint HTTPS fixes

## 2025-11-03 - AT Report API Endpoints Fix
  - Fixed all API endpoints in AT Report components (HTTP → HTTPS)
  - Updated generate-pdf, email-at-report, extract-at-report endpoints
  - Fixed AI rewrite endpoints in ATReportPart2 and ATReportPart3
  - Fixed Gmail connected-accounts endpoint in ATReport
  - All AT Report functionality now uses HTTPS consistently
  - Verified multi-account email sending (info@walkeasy.com.au and craig@walkeasy.com.au)
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

#### 🐛 Fix import paths for dateFormatting utility - use relative paths
- **Time**: 12:25 PM
- **Commit**: `2ab7cd8`
- **Changes**:
  - Fixed module resolution errors - changed from `@/app/utils/dateFormatting` to `../../utils/dateFormatting`
  - Updated all 5 components using dateFormatting utility:
    * XeroIntegration.tsx
    * GmailIntegration.tsx
    * SMSIntegration.tsx
    * NotesTest.tsx
    * S3Integration.tsx
  - Now matches existing import pattern used in codebase (e.g., browserDetection)
  - Resolves "Module not found" errors in Next.js

#### ✅ Add SMS webhook support with security and Cloudflare Tunnel setup
- **Time**: 2:52 PM
- **Commit**: Latest
- **Changes**:
  - Added webhook secret authentication (SMSB_WEBHOOK_SECRET in .env)
  - Updated ALLOWED_HOSTS to allow Cloudflare Tunnel domains for testing
  - Implemented inbound message webhook endpoint (`/api/sms/webhook/inbound/`)
  - Implemented delivery receipt (DLR) webhook endpoint (`/api/sms/webhook/dlr/`)
  - Added reply tracking in frontend - click message row to see replies
  - Added reply count badges on message history table
  - All webhook endpoints secured with optional secret token validation
  - Cloudflare Tunnel configured for local testing
  - Webhook URL configured in SMS Broadcast dashboard

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


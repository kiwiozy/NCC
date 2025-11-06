# S3 CORS Configuration Fix - Proper Solution

## Problem

The S3 bucket `walkeasy-nexus-documents` is rejecting requests from `http://localhost:3000` with a 403 CORS error:

```
Origin http://localhost:3000 is not allowed by Access-Control-Allow-Origin. Status code: 403
```

This prevents the blob URL approach from working in Safari, as the frontend cannot fetch the PDF from S3 to create the blob URL.

## Root Cause

The S3 bucket CORS configuration does not include `http://localhost:3000` in the allowed origins. This is required for:
1. Development environment
2. The blob URL fetch approach (Option A from ChatGPT solution)

## Proper Solution

### Update S3 Bucket CORS Configuration

The S3 bucket CORS configuration needs to be updated to allow both production and development origins.

#### Current CORS Configuration (Assumed)

Based on the documentation, the bucket likely has CORS configured for production only:
```json
[
  {
    "AllowedOrigins": ["https://app.walkeasy.au"],
    "AllowedMethods": ["PUT", "GET"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

#### Required CORS Configuration

Update the CORS configuration to include development origins:

```json
[
  {
    "AllowedOrigins": [
      "https://app.walkeasy.au",
      "http://localhost:3000",
      "http://localhost:8000",
      "https://localhost:3000"
    ],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag", "Content-Type", "Content-Length"],
    "MaxAgeSeconds": 3000
  }
]
```

### Steps to Update S3 CORS

1. **Access AWS Console**
   - Navigate to S3 → `walkeasy-nexus-documents` bucket
   - Go to **Permissions** tab
   - Scroll to **Cross-origin resource sharing (CORS)**

2. **Edit CORS Configuration**
   - Click **Edit**
   - Update the JSON with the configuration above
   - Save changes

3. **Verify Changes**
   - The changes take effect immediately
   - Test by fetching a PDF from `http://localhost:3000`

### Alternative: Environment-Specific CORS

If you want to keep production and development separate, you could use different buckets or conditionally configure CORS based on environment. However, the simplest approach is to allow both origins.

## Why This is the Right Fix

1. **No Code Changes Required** - Fixes the issue at the infrastructure level
2. **Allows Blob URL Approach** - The ChatGPT-recommended solution (Option A) will work
3. **Proper CORS** - Follows AWS best practices for S3 bucket CORS
4. **Development Friendly** - Allows local development without workarounds
5. **Production Safe** - Still restricts to specific origins

## Testing

After updating CORS:

1. Restart the frontend server
2. Try viewing a PDF in Safari
3. Check browser console - should no longer see CORS errors
4. PDF should load via blob URL approach

## Notes

- CORS changes take effect immediately (no bucket restart needed)
- The `ExposeHeaders` includes `Content-Type` and `Content-Length` which are needed for proper blob handling
- `HEAD` method is added to allow preflight checks
- Multiple localhost variants are included for different HTTPS setups


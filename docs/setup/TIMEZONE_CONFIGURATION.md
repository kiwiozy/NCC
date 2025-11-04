# Timezone Configuration

## Overview
This document describes the timezone configuration for the WalkEasy Nexus application, ensuring all dates and times are displayed consistently in **Australian Eastern Time (Australia/Sydney)**, which automatically handles daylight saving transitions (AEST/AEDT).

## Backend Configuration (Django)

### Settings
**File**: `backend/ncc_api/settings.py`

```python
TIME_ZONE = 'Australia/Sydney'  # Australian Eastern Time (handles daylight saving automatically)
USE_TZ = True  # Timezone-aware datetime objects
LANGUAGE_CODE = 'en-au'  # Australian English
```

### How It Works
- Django stores all datetime values in UTC in the database
- When retrieved, Django automatically converts to `TIME_ZONE` (Australia/Sydney)
- `timezone.now()` returns the current time in Australia/Sydney timezone
- All datetime fields in models use timezone-aware datetime objects

### Verification
```bash
cd backend
source venv/bin/activate
python manage.py shell -c "from django.utils import timezone; from django.conf import settings; print(f'TIME_ZONE: {settings.TIME_ZONE}'); print(f'Current time: {timezone.now()}')"
```

Expected output:
```
TIME_ZONE: Australia/Sydney
Current time: 2025-11-03 01:17:36.577149+00:00
```

## Frontend Configuration (Next.js/React)

### Date Formatting Utility
**File**: `frontend/app/utils/dateFormatting.ts`

A comprehensive utility module using Luxon for consistent Australian timezone formatting.

#### Available Functions

- `formatDateTimeAU(date, format?)` - Full date and time (default: 'dd/MM/yyyy h:mm:ss a')
- `formatDateOnlyAU(date)` - Date only (returns 'dd/MM/yyyy' format, e.g., "25/06/1949")
- `formatTimeOnlyAU(date)` - Time only (h:mm:ss a)
- `formatShortDateTimeAU(date)` - Short format (dd/MM/yyyy HH:mm)

**Important:** 
- Utility functions use **lowercase format tokens** (`dd`, `MM`, `yyyy`) for Luxon
- `DD` = Day of year (wrong), `dd` = Day of month (correct)
- `YYYY` = Week year (wrong), `yyyy` = Calendar year (correct)
- Dates are displayed as "DD MMM YYYY" format (e.g., "25 Jun 1949") in the UI
- The utility returns "dd/MM/yyyy" which is then converted to the display format
- `getCurrentTimeAU()` - Get current time in Australian timezone
- `parseToAUTimezone(dateString)` - Parse and convert to Australian timezone
- `getRelativeTimeAU(date)` - Relative time (e.g., "2 hours ago")

#### Usage Example
```typescript
import { formatDateTimeAU } from '@/app/utils/dateFormatting';

// In component
<Text>{formatDateTimeAU(user.created_at)}</Text>
// Output: "03/11/2024 2:05:00 PM" (in Australian time)
```

### Updated Components
The following components have been updated to use Australian timezone formatting:

1. **XeroIntegration.tsx**
   - Connection dates
   - Token expiration dates
   - Last refresh times
   - Sync log timestamps

2. **GmailIntegration.tsx**
   - Account connection dates
   - Token expiration dates
   - Last used timestamps
   - Sent email timestamps

3. **SMSIntegration.tsx**
   - Message sent/created timestamps

4. **NotesTest.tsx**
   - Note created/updated timestamps

5. **S3Integration.tsx**
   - Document upload dates

## Timezone Details

### Australia/Sydney Timezone
- **Standard Time**: Australian Eastern Standard Time (AEST) - UTC+10
- **Daylight Saving**: Australian Eastern Daylight Time (AEDT) - UTC+11
- **DST Period**: First Sunday in October to first Sunday in April

### Benefits
1. **Consistency**: All dates display in Australian time regardless of user's browser location
2. **Accuracy**: Automatic handling of daylight saving time transitions
3. **User-Friendly**: Dates are always in a familiar format for Australian users
4. **Data Integrity**: Backend stores in UTC, frontend displays in AEST/AEDT

## Testing

### Verify Backend Timezone
```bash
cd backend
source venv/bin/activate
python manage.py shell
>>> from django.utils import timezone
>>> from django.conf import settings
>>> settings.TIME_ZONE
'Australia/Sydney'
>>> timezone.now()
# Should show current time in Australia/Sydney
```

### Verify Frontend Formatting
1. Open any component displaying dates (Xero, Gmail, SMS, etc.)
2. Check that dates are displayed in DD/MM/YYYY format
3. Times should be in Australian Eastern Time (AEST/AEDT)
4. Compare with system time: `TZ=Australia/Sydney date`

## Important Notes

1. **Database Storage**: All datetimes are stored in UTC in the database
2. **API Responses**: Backend API returns ISO 8601 strings (UTC)
3. **Frontend Display**: Frontend converts to Australian timezone for display
4. **No Browser Dependency**: Dates are formatted server-side or using explicit timezone conversion
5. **Daylight Saving**: Automatically handled by Django and Luxon

## Future Enhancements

- [ ] Add user preference for timezone (if needed for international users)
- [ ] Add timezone indicator in date displays (AEST/AEDT)
- [ ] Consider adding timezone information to appointment scheduling
- [ ] Add timezone validation in date input components


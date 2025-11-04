# Communication Dialog

## Overview
Dialog for adding and editing communication entries (phone, mobile, email, address) for patients.

**Last Updated:** 2025-01-15

---

## Purpose
Allows users to add and edit multiple communication entries for a patient, with support for:
- Multiple phone numbers (home, work, mobile, other)
- Multiple mobile numbers (home, work, mobile, other)
- Multiple email addresses (home, work, mobile, other)
- Addresses (home, work, mobile, other)
- Default communication designation per type

---

## UI Components

### Dialog Structure
- **Title**: "New Coms for [Patient Name]" (new) or "Edit [Type] for [Patient Name]" (edit)
- **Size**: Large (`lg`) to prevent text wrapping
- **Close Button**: X icon in top right

### Input Fields

#### Type Selection
- **TYPE** dropdown (required)
  - Options: Phone, Mobile, Email, Address
  - Changes available fields dynamically

#### Name Selection
- **NAME** dropdown (required)
  - Options: Home, Work, Mobile, Other
  - Used as the identifier for the communication entry

#### Value Fields (Dynamic based on TYPE)

**Phone/Mobile/Email:**
- Single text input field
- Labeled as "PHONE", "MOBILE", or "EMAIL"
- Required field

**Address:**
- **ADDRESS** (required): Address line 1
- **Address 2** (optional): Address line 2
- **Suburb** (optional): Suburb name
- **Post Code** (optional): Postcode
- **State** (optional): Dropdown with Australian states (NSW, VIC, QLD, SA, WA, TAS, NT, ACT)

#### Default Toggle
- **Default** switch (all types)
  - Position: Bottom left, same row as Cancel/Save buttons
  - Description: "Set as the default for this communication type"
  - Only one default per communication type allowed
  - When enabled, removes default flag from all other entries of the same type

### Action Buttons
- **Cancel** (left): Closes dialog without saving, resets all fields
- **Save** (right): Validates and saves communication entry

---

## Data Structure

### Backend Storage

**Phone/Mobile/Email:**
```json
{
  "contact_json": {
    "phone": {
      "home": { "value": "0412345678", "default": true },
      "work": { "value": "0298765432", "default": false }
    },
    "mobile": {
      "home": { "value": "0412345678", "default": false }
    },
    "email": {
      "work": { "value": "john@example.com", "default": true }
    }
  }
}
```

**Address:**
```json
{
  "address_json": {
    "street": "123 Main St",
    "street2": "Unit 4",
    "suburb": "Sydney",
    "postcode": "2000",
    "state": "NSW",
    "type": "home",
    "default": true
  }
}
```

### Frontend Contact Interface
```typescript
interface Contact {
  communication?: {
    phone?: string | { [key: string]: string | { value: string; default?: boolean } };
    mobile?: string | { [key: string]: string | { value: string; default?: boolean } };
    email?: string | { [key: string]: string | { value: string; default?: boolean } };
  };
  address_json?: {
    street?: string;
    street2?: string;
    suburb?: string;
    postcode?: string;
    state?: string;
    type?: string;
    default?: boolean;
  };
}
```

---

## Functionality

### Adding New Communication
1. Click "+" icon next to "COMMUNICATION" label
2. Select TYPE (Phone, Mobile, Email, or Address)
3. Select NAME (Home, Work, Mobile, Other)
4. Enter value (or address fields for address type)
5. Optionally set as default
6. Click "Save"

### Editing Communication
1. Hover over communication entry row
2. Click edit icon (blue pencil)
3. Dialog opens with existing data pre-filled
4. Modify fields as needed
5. Click "Save"

### Deleting Communication
1. Hover over communication entry row
2. Click delete icon (red trash)
3. Entry is removed immediately (frontend and backend)

### Default Communication
- Only one entry per type can be marked as default
- When setting a new default, all other entries of that type are automatically unmarked
- Default entries display Type and Name in blue color
- Default toggle available for all communication types (including address)

---

## API Integration

### Save Endpoint
```
PATCH /api/patients/{id}/
```

**Request Body:**
```json
{
  "contact_json": {
    "phone": { "home": { "value": "0412345678", "default": true } },
    "mobile": { "work": { "value": "0411111111", "default": false } },
    "email": { "home": { "value": "patient@example.com", "default": true } }
  }
}
```

OR for address:
```json
{
  "address_json": {
    "street": "123 Main St",
    "suburb": "Sydney",
    "postcode": "2000",
    "state": "NSW",
    "type": "home",
    "default": true
  }
}
```

### Reload After Save
After successful save, patient data is reloaded from backend to ensure UI consistency:
```
GET /api/patients/{id}/?t={timestamp}
```
- Uses timestamp query parameter for cache-busting (avoids CORS issues with Cache-Control header)
- Ensures fresh data is loaded after save
- Updates both `selectedContact` and `allContacts` list

---

## Display Logic

### Communication Display
- Communication section displays if either `communication` data or `address_json` exists
- Communication entries displayed in a Paper component with border
- Each entry shows:
  - Type label (Phone, Mobile, Email, Address) - blue if default, dimmed if not
  - Name label (Home, Work, etc.) - blue if default, dimmed if not
  - Value (phone number, email, or address string)
  - Edit/Delete buttons (visible on hover)
- **Sorting**: Default entries sorted to the top of the list
- **Scroll Behavior**: Shows first 3 entries, with scrollable area if more exist
- **Scroll Indicator**: "Scroll for more... (X more)" text shown when more than 3 entries

### Legacy Format Support
- Supports both old string format: `{ phone: "0412345678" }`
- And new object format: `{ phone: { home: { value: "0412345678", default: true } } }`
- Legacy entries automatically converted to object format when edited
- Null-safe handling: Communication section works even when `communication` is `undefined` (only address exists)

---

## Error Handling

### Validation
- TYPE and NAME are required
- Value is required for Phone/Mobile/Email
- Address line 1 is required for Address type
- Save button disabled until all required fields are filled

### Error Messages
- API errors: Alert shown with error details
- Dialog stays open on error to allow retry
- Console logging for debugging

---

## State Management

### Dialog State
- `communicationDialogOpened`: boolean
- `communicationType`: string (phone, mobile, email, address)
- `communicationName`: string (home, work, mobile, other)
- `communicationValue`: string (for phone/mobile/email)
- `isDefault`: boolean
- `editingCommunication`: { type: string, name: string } | null
- `addressFields`: { address1, address2, suburb, postcode, state }

### Contact State
- `selectedContact`: Contact | null
- Updated after successful save with reloaded data from backend

---

## Next Steps / Future Enhancements

- [ ] Add validation for phone number format (Australian)
- [ ] Add validation for email format
- [ ] Add address autocomplete/search
- [ ] Support for international phone numbers
- [ ] Bulk edit communication entries
- [ ] Communication history/audit log
- [ ] Integration with SMS/email services for default communication

---

## Related Files
- `frontend/app/patients/page.tsx` - Main implementation
- `backend/patients/models.py` - Patient model with `contact_json` and `address_json`
- `backend/patients/serializers.py` - Patient serializer
- `backend/patients/views.py` - Patient API endpoints


# Layout Changes Needed for Step 1

## File: `frontend/app/layout.tsx` (PROTECTED - Manual Edit Required)

### Add Import:
```typescript
import { SMSProvider } from './contexts/SMSContext';
```

### Wrap Children:
Find where your existing providers are (likely MantineProvider, AuthProvider, etc.) and add SMSProvider:

```typescript
<SMSProvider>
  {/* Your existing content/children */}
  {children}
</SMSProvider>
```

### Example Structure:
```typescript
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <MantineProvider>
          <AuthProvider>
            <SMSProvider>  {/* ← ADD THIS */}
              {children}
            </SMSProvider>
          </AuthProvider>
        </MantineProvider>
      </body>
    </html>
  );
}
```

## To Test:
1. Check console for any errors
2. SMSContext should start polling immediately
3. Check Network tab - should see requests to /api/sms/unread-count/ every 5 seconds


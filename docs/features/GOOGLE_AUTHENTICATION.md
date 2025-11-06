# Google Authentication System

**Status:** ✅ Implemented  
**Last Updated:** 2025-01-15  
**OAuth Flow:** ✅ Seamless (no intermediate page)

---

## 📋 **Overview**

Unified Google OAuth authentication system that provides:
- **User Authentication**: Users log in with their Google account
- **Gmail Integration**: Automatically connects Gmail account for email functionality
- **Single Sign-On**: One login works across the entire system

---

## 🎯 **Features**

- ✅ Google OAuth login (reuses Gmail OAuth credentials)
- ✅ Seamless login flow - no intermediate "Sign In Via Google" page
- ✅ Automatic Gmail connection on login
- ✅ Session-based authentication
- ✅ Protected routes (redirects to login if not authenticated)
- ✅ User menu with logout in Navigation
- ✅ Authentication state management

---

## 🛠 **Implementation**

### **Backend**

1. **Django Allauth Integration** (`backend/ncc_api/settings.py`):
   - Installed `django-allauth` package
   - Configured Google OAuth provider
   - Reuses existing `GMAIL_CLIENT_ID` and `GMAIL_CLIENT_SECRET`
   - Requests both authentication and Gmail API scopes
   - **Key Settings for Seamless Flow**:
     - `SOCIALACCOUNT_LOGIN_ON_GET = True` - Skips intermediate "Sign In Via Google" page, starts OAuth immediately on GET
     - `SOCIALACCOUNT_AUTO_SIGNUP = True` - Automatically creates user account on first login
     - `SOCIALACCOUNT_QUERY_EMAIL = True` - Requests email from OAuth provider
     - `SOCIALACCOUNT_EMAIL_REQUIRED = True` - Requires email for OAuth accounts
     - `SOCIALACCOUNT_EMAIL_VERIFICATION = 'none'` - Skips email verification for OAuth accounts
   - **Note**: django-allauth uses "SOCIALACCOUNT" prefix for OAuth providers (Google, Microsoft, etc.) - this is library terminology, not social media

2. **Custom Adapter** (`backend/gmail_integration/adapters.py`):
   - `GmailSocialAccountAdapter`: Automatically creates/updates `GmailConnection` when user logs in with Google
   - Links Google login to Gmail functionality
   - Encrypts tokens using Fernet encryption

3. **Authentication Endpoints**:
   - `GET /api/auth/user/` - Check authentication status
   - `GET /api/auth/google/login/` - Custom endpoint that redirects directly to Google (skips intermediate page)
   - `GET /accounts/google/login/callback/` - OAuth callback (handled by allauth, automatically completes login)
   - `GET /api/auth/logout/` - Custom logout endpoint

### **Frontend**

1. **Login Page** (`frontend/app/login/page.tsx`):
   - Google Sign-In button
   - Redirects to Django allauth Google login
   - Auto-redirects if already authenticated

2. **Auth Context** (`frontend/app/contexts/AuthContext.tsx`):
   - Manages authentication state
   - Checks auth status on mount and route changes
   - Provides `login`, `logout`, `checkAuth` functions
   - Exposes `isAuthenticated`, `user`, `isLoading` state

3. **Template Wrapper** (`frontend/app/template.tsx`):
   - Wraps entire app with `AuthProvider`
   - Provides auth context to all pages

4. **Navigation Updates** (`frontend/app/components/Navigation.tsx`):
   - User menu with avatar and email
   - Logout button
   - Only shows when authenticated

5. **Protected Routes** (`frontend/app/components/ProtectedRoute.tsx`):
   - Component to protect routes
   - Redirects to login if not authenticated
   - Shows loading state during auth check

---

## 🔑 **Setup Requirements**

### **1. Google Cloud Console Configuration**

Your existing Gmail OAuth credentials will work, but you need to add the allauth callback URL:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** > **Credentials**
3. Edit your OAuth 2.0 Client ID
4. In **"Authorized redirect URIs"**, ensure you have **BOTH**:
   - `https://localhost:8000/gmail/oauth/callback/` (for Gmail integration)
   - `https://localhost:8000/accounts/google/login/callback/` (for user authentication) ⚠️ **Must include `/login/`!**
5. Click **"SAVE"**
6. Wait 1-2 minutes for changes to propagate

**Important**: The callback URL must be exactly `https://localhost:8000/accounts/google/login/callback/` (note the `/login/` in the path)

### **2. Environment Variables**

Ensure these are set in `backend/.env`:
```bash
# Google OAuth (same as Gmail integration)
GMAIL_CLIENT_ID=your_client_id_here
GMAIL_CLIENT_SECRET=your_client_secret_here

# Optional: Encryption key for tokens (if not set, generates one)
ENCRYPTION_KEY=your_encryption_key_here
```

### **3. Database Setup**

Run migrations to create allauth tables:
```bash
cd backend
source venv/bin/activate
python manage.py migrate
```

### **4. Create SocialApp in Database**

The OAuth credentials need to be stored in the database as a `SocialApp`:

```bash
cd backend
source venv/bin/activate
python manage.py shell -c "
from allauth.socialaccount.models import SocialApp
from django.contrib.sites.models import Site
import os
from dotenv import load_dotenv
load_dotenv()

site = Site.objects.get(pk=1)
client_id = os.getenv('GMAIL_CLIENT_ID')
client_secret = os.getenv('GMAIL_CLIENT_SECRET')

if client_id and client_secret:
    app, created = SocialApp.objects.get_or_create(
        provider='google',
        defaults={
            'name': 'Google OAuth',
            'client_id': client_id,
            'secret': client_secret,
        }
    )
    app.sites.add(site)
    print(f'✅ {\"Created\" if created else \"Updated\"} SocialApp')
else:
    print('❌ GMAIL_CLIENT_ID or GMAIL_CLIENT_SECRET not set')
"
```

---

## 🔄 **How It Works**

### **Seamless OAuth Flow** (No Intermediate Page)

1. **User clicks "Sign in with Google"** on `/login` page
2. **Frontend redirects** to `/api/auth/google/login/` (custom endpoint)
3. **Backend immediately redirects** to Google OAuth (no intermediate page)
4. **User selects account** and grants permissions on Google
5. **Google redirects back** to `/accounts/google/login/callback/` with OAuth code
6. **Allauth automatically processes** the OAuth response:
   - Validates OAuth state (CSRF protection)
   - Exchanges code for access token
   - Fetches user info from Google
   - Creates/updates Django user account
   - Creates OAuth account link
   - **Custom adapter** creates/updates `GmailConnection` automatically
7. **User is authenticated** and redirected to home page
8. **Session cookie** is set for subsequent API requests

### **Key Features**

- ✅ **No intermediate page** - Direct redirect to Google
- ✅ **Automatic user creation** - No signup form needed
- ✅ **Automatic Gmail connection** - Gmail account linked on first login
- ✅ **Session-based auth** - Secure cookies for API requests

---

## 🔐 **Security**

- ✅ All SMS patient endpoints require `IsAuthenticated`
- ✅ Session-based authentication (secure cookies)
- ✅ Tokens encrypted using Fernet
- ✅ CORS configured for credentials
- ✅ CSRF protection enabled

---

## 📝 **Usage**

### **Frontend: Check Authentication**

```typescript
import { useAuth } from '../contexts/AuthContext';

function MyComponent() {
  const { isAuthenticated, user, logout } = useAuth();
  
  if (!isAuthenticated) {
    return <div>Please log in</div>;
  }
  
  return (
    <div>
      <p>Welcome, {user?.email}!</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### **Frontend: Protect Routes**

```typescript
import ProtectedRoute from '../components/ProtectedRoute';

export default function MyPage() {
  return (
    <ProtectedRoute>
      <Navigation>
        {/* Protected content */}
      </Navigation>
    </ProtectedRoute>
  );
}
```

### **Backend: Check Authentication**

```python
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_protected_endpoint(request):
    # request.user is available
    return Response({'user': request.user.email})
```

---

## 🎨 **User Experience**

1. **First Visit**: User sees login page with Google Sign-In button
2. **After Login**: 
   - User menu appears in Navigation (avatar + email)
   - Can access all protected features
   - Gmail account automatically connected
3. **Logout**: Click user menu → "Sign out" → Redirected to login

---

## 🔗 **Integration with Gmail**

When a user logs in with Google:
- Their Gmail account is **automatically connected**
- Tokens are stored in `GmailConnection` model
- Can immediately send emails without separate Gmail setup
- **One login = Authentication + Gmail access**

---

## 🐛 **Troubleshooting**

### **"Redirect URI mismatch" error**
- Ensure callback URL is added to Google Cloud Console
- URL must match exactly: `https://localhost:8000/accounts/google/login/callback/` (note the `/login/` in the path)
- See [Troubleshooting Guide](../architecture/TROUBLESHOOTING.md#google-oauth-redirect-uri-mismatch-error) for detailed steps

### **"Authentication credentials not provided" (403)**
- User needs to log in first
- Check that session cookies are being sent (`credentials: 'include'`)

### **Gmail connection not created after login**
- Check backend logs for adapter errors
- Verify `ENCRYPTION_KEY` is set (or adapter will generate one)
- Check that `GmailConnection` model exists and migrations are run

### **Login redirects but user not authenticated**
- Check browser console for errors
- Verify `AuthProvider` is wrapping the app (check `template.tsx`)
- Check that `/api/auth/user/` endpoint returns correct data

### **Intermediate "Sign In Via Google" page appears**
- Ensure `SOCIALACCOUNT_LOGIN_ON_GET = True` is set in `settings.py`
- Verify you're using the custom endpoint `/api/auth/google/login/` (not `/accounts/google/login/`)
- Check backend logs for any errors during OAuth flow

---

## 📚 **Related Documentation**

- [Troubleshooting Guide](../architecture/TROUBLESHOOTING.md#google-oauth-redirect-uri-mismatch-error) - Common OAuth issues and solutions
- [Gmail Integration](../Email/GMAIL_QUICK_REFERENCE.md) - Gmail API integration details
- [Database Schema](../architecture/DATABASE_SCHEMA.md) - Database structure

---

## 🔍 **Technical Details**

### **Why "SOCIALACCOUNT" Terminology?**

django-allauth uses the `SOCIALACCOUNT_` prefix for all OAuth providers (Google, Microsoft, etc.). This is the library's naming convention, not a reference to social media. In this business application, it's used for:

- **Business Authentication**: Google Workspace accounts for clinic staff
- **OAuth Providers**: Any OAuth2/OIDC provider (Google, Microsoft, etc.)
- **Enterprise SSO**: Single Sign-On for business applications

The terminology doesn't affect functionality - it's just django-allauth's convention.

### **Custom Login Endpoint**

The custom `/api/auth/google/login/` endpoint (`google_login_direct` in `backend/ncc_api/auth_views.py`) uses `OAuth2LoginView.adapter_view(GoogleOAuth2Adapter)` to:

1. Properly set up OAuth state in session
2. Build correct OAuth URL with all required parameters
3. Redirect directly to Google (skipping intermediate page)
4. Maintain session state for callback validation

### **Custom Adapter**

The `GmailSocialAccountAdapter` (`backend/gmail_integration/adapters.py`) automatically:

1. Creates/updates `GmailConnection` when user logs in with Google
2. Encrypts tokens using Fernet encryption
3. Links Google OAuth login to Gmail functionality
4. Stores refresh tokens for Gmail API access

---

**Status:** ✅ Production Ready


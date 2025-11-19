"""
Authentication views for checking user status
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth import get_user_model, logout as django_logout
from django.contrib.auth.decorators import login_required
from django.shortcuts import redirect
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from allauth.socialaccount.providers.google.views import oauth2_login
from allauth.socialaccount.models import SocialApp
from django.contrib.sites.models import Site
from django.conf import settings

User = get_user_model()


@api_view(['GET'])
@permission_classes([AllowAny])
def user_info(request):
    """
    Get current user information
    Returns user data if authenticated, 401 if not
    """
    if request.user.is_authenticated:
        # Get social account if exists
        social_account = None
        try:
            from allauth.socialaccount.models import SocialAccount
            social_account = SocialAccount.objects.filter(user=request.user, provider='google').first()
        except:
            pass
        
        return Response({
            'authenticated': True,
            'username': request.user.username,
            'email': request.user.email,
            'is_staff': request.user.is_staff,
            'is_superuser': request.user.is_superuser,
            'provider': social_account.provider if social_account else None,
        })
    else:
        return Response({
            'authenticated': False,
        }, status=401)


@api_view(['GET'])
@permission_classes([AllowAny])
def login_redirect(request):
    """
    Root endpoint - return API info instead of redirecting
    """
    return Response({
        'message': 'Nexus Core Clinic API',
        'version': '1.0',
        'endpoints': {
            'api': '/api/',
            'admin': '/admin/',
            'docs': 'See API endpoints at /api/'
        }
    })


def google_login_direct(request):
    """
    Direct Google OAuth login - skips the intermediate "Sign In Via Google" page
    and goes straight to Google's account selection
    """
    # Get the Google SocialApp
    try:
        site = Site.objects.get(pk=settings.SITE_ID)
        app = SocialApp.objects.filter(provider='google', sites=site).first()
        
        if not app:
            from django.http import HttpResponse
            return HttpResponse('Google OAuth not configured', status=500)
        
        # Use OAuth2LoginView to properly set up the OAuth flow
        # This ensures the state is stored correctly in the session
        from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
        from allauth.socialaccount.providers.oauth2.views import OAuth2LoginView
        
        # Create adapter
        adapter = GoogleOAuth2Adapter(request)
        
        # Create the login view (returns a function)
        view = OAuth2LoginView.adapter_view(adapter)
        
        # Call the view function directly (it handles GET requests)
        # This will properly set up the OAuth flow and store the state in the session
        response = view(request)
        
        # Check if it's a redirect to Google
        if hasattr(response, 'url') and 'accounts.google.com' in response.url:
            return response
        else:
            # If it's not a redirect, it might be showing the intermediate page
            # In that case, we need to extract the redirect URL from the response
            # The response might be HTML, so we need to build the URL manually
            # But first, let's check if the state was stored
            if hasattr(request, 'session'):
                state = request.session.get('socialaccount_state')
                if state:
                    # State is stored, so we can build the URL manually
                    from allauth.socialaccount.providers.oauth2.client import OAuth2Client
                    from django.urls import reverse
                    
                    callback_url = reverse('google_callback')
                    callback_url = request.build_absolute_uri(callback_url)
                    
                    provider = adapter.get_provider()
                    provider_settings = provider.get_settings()
                    scope = provider_settings.get('SCOPE', ['profile', 'email'])
                    if isinstance(scope, str):
                        scope = scope.split()
                    auth_params = provider_settings.get('AUTH_PARAMS', {})
                    
                    client = OAuth2Client(
                        request,
                        app.client_id,
                        app.secret,
                        adapter.access_token_url,
                        adapter.authorize_url,
                        callback_url
                    )
                    
                    extra_params = auth_params.copy() if auth_params else {}
                    auth_url = client.get_redirect_url(adapter.authorize_url, scope, extra_params)
                    
                    # Save session to ensure state is persisted
                    request.session.save()
                    
                    return redirect(auth_url)
            
            # If we get here, something went wrong
            return response
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        from django.http import HttpResponse
        return HttpResponse(f'Error: {str(e)}', status=500)


@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def logout_view(request):
    """
    Custom logout endpoint that properly clears the session
    """
    if request.user.is_authenticated:
        # Use Django's logout function to properly clear the session
        django_logout(request)
    
    # Return JSON response with redirect URL
    return Response({
        'success': True,
        'message': 'Logged out successfully',
        'location': 'https://localhost:3000/login/'
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def csrf_token(request):
    """
    Get CSRF token for frontend POST requests
    """
    from django.middleware.csrf import get_token
    token = get_token(request)
    return Response({
        'csrfToken': token
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])  # ✅ SECURITY: Only authenticated users can list users
def list_users(request):
    """
    List all Django User accounts for linking to clinician profiles
    SECURITY: Requires authentication. Only staff can see all users, 
    regular users can only see their own account.
    """
    # Staff users can see all users
    if request.user.is_staff:
        users = User.objects.all().order_by('username')
    else:
        # Non-staff users can only see their own account
        users = User.objects.filter(id=request.user.id)
    
    user_list = [
        {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'is_active': user.is_active,
        }
        for user in users
    ]
    return Response(user_list)


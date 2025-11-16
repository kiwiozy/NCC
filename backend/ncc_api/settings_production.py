"""
Production settings for Nexus Core Clinic

This file contains production-specific settings that override the base settings.
Secrets are managed via Google Cloud Secret Manager.
"""

import os
from .settings import *

# Environment
DEBUG = False
ENVIRONMENT = os.getenv('ENVIRONMENT', 'production')

# Security
SECRET_KEY = os.getenv('SECRET_KEY')  # From Secret Manager
ALLOWED_HOSTS = [
    'nexus-production-backend-892000689828.australia-southeast1.run.app',
    'nexus.walkeasy.com.au',
    '.run.app',  # Allow all Cloud Run domains
]

# Production Security Settings
# Note: SECURE_SSL_REDIRECT disabled - Cloud Run handles HTTPS at load balancer
SECURE_SSL_REDIRECT = False
# Disable trailing slash redirects to prevent redirect loops
APPEND_SLASH = False
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
CSRF_TRUSTED_ORIGINS = [
    'https://nexus.walkeasy.com.au',
    'https://nexus-production-backend-892000689828.australia-southeast1.run.app',
]
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'

# Database - Cloud SQL PostgreSQL
# When connecting via Cloud SQL Proxy locally, use 127.0.0.1
# When running on Cloud Run, use Unix socket
if os.getenv('USE_CLOUD_SQL_PROXY'):
    # Local development via proxy
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': 'nexus_production',
            'USER': 'postgres',
            'PASSWORD': os.getenv('DB_PASSWORD', 'postgres'),  # From Secret Manager or env
            'HOST': '127.0.0.1',
            'PORT': '5432',
            'CONN_MAX_AGE': 600,
        }
    }
else:
    # Cloud Run production
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': 'nexus_production',
            'USER': 'postgres',
            'PASSWORD': os.getenv('DB_PASSWORD'),  # From Secret Manager
            'HOST': '/cloudsql/nexus-walkeasy-prod:australia-southeast1:nexus-production-db',
            'PORT': '5432',
            'CONN_MAX_AGE': 600,
            'OPTIONS': {
                'connect_timeout': 10,
            }
        }
    }

# Static files for Cloud Run
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

# AWS S3 Settings (from Secret Manager)
AWS_ACCESS_KEY_ID = os.getenv('AWS_ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY = os.getenv('AWS_SECRET_ACCESS_KEY')
AWS_REGION = os.getenv('AWS_REGION', 'ap-southeast-2')
AWS_S3_BUCKET_NAME = os.getenv('AWS_S3_BUCKET_NAME', 'walkeasy-nexus-documents')

# Xero Integration (from Secret Manager)
XERO_CLIENT_ID = os.getenv('XERO_CLIENT_ID')
XERO_CLIENT_SECRET = os.getenv('XERO_CLIENT_SECRET')
XERO_REDIRECT_URI = 'https://nexus-production-backend-892000689828.australia-southeast1.run.app/xero/oauth/callback'

# Gmail Integration (from Secret Manager)
GMAIL_CLIENT_ID = os.getenv('GMAIL_CLIENT_ID')
GMAIL_CLIENT_SECRET = os.getenv('GMAIL_CLIENT_SECRET')
GMAIL_REDIRECT_URI = 'https://nexus-production-backend-892000689828.australia-southeast1.run.app/gmail/oauth/callback/'

# SMS Broadcast Integration (from Secret Manager)
SMSB_USERNAME = os.getenv('SMSB_USERNAME')
SMSB_PASSWORD = os.getenv('SMSB_PASSWORD')
SMSB_FROM = 'WalkEasy'
SMSB_SENDER_ID = '61488868772'
SMSB_WEBHOOK_SECRET = os.getenv('SMSB_WEBHOOK_SECRET')

# OpenAI (from Secret Manager)
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')

# GCP Project Settings
GCP_PROJECT_ID = 'nexus-walkeasy-prod'
GCP_REGION = 'australia-southeast1'

# CORS Settings (allow Next.js frontend)
CORS_ALLOWED_ORIGINS = [
    'https://nexus.walkeasy.com.au',
]
CORS_ALLOW_CREDENTIALS = True

# Override middleware to remove CommonMiddleware (prevents trailing slash redirect loops)
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    # 'django.middleware.common.CommonMiddleware',  # REMOVED - causes redirect loops on Cloud Run
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'allauth.account.middleware.AccountMiddleware',
]

# Logging - Simplified for local proxy connection
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
}

# Cache (optional - for future)
# CACHES = {
#     'default': {
#         'BACKEND': 'django.core.cache.backends.redis.RedisCache',
#         'LOCATION': 'redis://redis:6379/0',
#     }
# }


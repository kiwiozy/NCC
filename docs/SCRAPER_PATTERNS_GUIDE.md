# 🕷️ Web Scraper Architecture & Patterns Guide

**Purpose:** Comprehensive analysis of existing integration patterns to inform new web scraping implementations

**Last Updated:** 2025-10-31

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Existing Service Patterns](#existing-service-patterns)
3. [Key Libraries & Dependencies](#key-libraries--dependencies)
4. [Service Class Architecture](#service-class-architecture)
5. [Database Models Pattern](#database-models-pattern)
6. [API Integration Patterns](#api-integration-patterns)
7. [Error Handling & Logging](#error-handling--logging)
8. [Configuration Management](#configuration-management)
9. [FileMaker Data API Pattern](#filemaker-data-api-pattern)
10. [Recommended Scraper Architecture](#recommended-scraper-architecture)

---

## 1. Overview

This codebase follows a **Service-Oriented Architecture** with:
- ✅ Dedicated Django apps for each external integration
- ✅ Service classes that encapsulate API logic
- ✅ Django models for data persistence and audit trails
- ✅ Environment-based configuration management
- ✅ Comprehensive error handling and retry logic

---

## 2. Existing Service Patterns

### 🔍 Current Integrations

| Integration | App | Service File | Purpose |
|-------------|-----|--------------|---------|
| **SMS Broadcast** | `sms_integration` | `services.py` | Send SMS messages via API |
| **Xero Accounting** | `xero_integration` | `services.py` | OAuth2 + Invoice sync |
| **OpenAI** | `ai_services` | `services.py` | Clinical note enhancement |
| **AWS S3** | `documents` | `services.py` | File upload/download |

---

## 3. Key Libraries & Dependencies

### Current Backend Dependencies

```python
# API Requests
requests>=2.31.0           # HTTP client
urllib3>=2.0.0            # URL handling

# AI Integration
openai==2.6.1             # OpenAI API client

# Xero Integration
xero-python               # Official Xero SDK

# AWS Integration
boto3                     # AWS SDK

# Environment Management
python-dotenv>=1.0.0     # Load .env files

# Django Core
django                    # Web framework
djangorestframework       # REST API framework
psycopg2-binary          # PostgreSQL adapter
```

### Recommended for Web Scraping

```python
# Add to backend/requirements.txt when implementing scrapers:

# HTTP & Web Scraping
requests>=2.31.0          # ✅ Already installed
beautifulsoup4>=4.12.0    # HTML parsing
lxml>=4.9.0              # Fast XML/HTML parser
httpx>=0.25.0            # Modern async HTTP client

# Browser Automation (if needed)
selenium>=4.15.0         # WebDriver automation
playwright>=1.40.0       # Modern browser automation (recommended)

# Rate Limiting & Throttling
ratelimit>=2.2.1         # Rate limiting decorator
tenacity>=8.2.3          # Retry with exponential backoff

# Data Extraction
scrapy>=2.11.0           # Full-featured scraping framework (optional)
pandas>=2.1.0            # Data manipulation (if needed)

# Session Management
requests-cache>=1.1.0    # HTTP caching
```

---

## 4. Service Class Architecture

### 🎯 Standard Pattern (SMS Service Example)

```python
"""
{Integration Name} Service
Handles {functionality} via {API/scraper}
"""
import os
import requests
from typing import Dict, Optional
from django.utils import timezone
from .models import {ModelName}


class {ServiceName}Service:
    """
    Service for {purpose}
    """
    
    def __init__(self):
        # Load credentials from environment
        self.api_key = os.getenv('SERVICE_API_KEY', '')
        self.api_url = os.getenv('SERVICE_API_URL', 'https://api.example.com')
        self.timeout = int(os.getenv('SERVICE_TIMEOUT', '30'))
    
    def _check_credentials(self):
        """Validate credentials are configured"""
        if not self.api_key:
            raise ValueError("SERVICE_API_KEY must be set in environment")
    
    def fetch_data(self, params: Dict) -> Dict:
        """
        Main data fetching method
        
        Args:
            params: Request parameters
            
        Returns:
            Parsed response data
        """
        self._check_credentials()
        
        try:
            response = requests.get(
                self.api_url,
                params=params,
                headers=self._get_headers(),
                timeout=self.timeout
            )
            response.raise_for_status()
            return response.json()
            
        except requests.exceptions.RequestException as e:
            # Log error and handle gracefully
            raise Exception(f"API request failed: {str(e)}")
    
    def _get_headers(self) -> Dict[str, str]:
        """Build request headers"""
        return {
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json',
            'User-Agent': 'NexusCore/1.0'
        }


# Singleton instance for easy import
service_instance = {ServiceName}Service()
```

### Key Features:

1. ✅ **Environment-based configuration** - All credentials via `os.getenv()`
2. ✅ **Credential validation** - `_check_credentials()` method
3. ✅ **Timeout handling** - Configurable timeouts
4. ✅ **Error handling** - Try/except with meaningful messages
5. ✅ **Singleton pattern** - Global instance for easy imports
6. ✅ **Type hints** - For better IDE support and documentation

---

## 5. Database Models Pattern

### 🗄️ Standard Model Structure

All integrations follow this pattern:

```python
"""
{Integration Name} Models
{Brief description of purpose}
"""
import uuid
from django.db import models
from django.utils import timezone


class {ModelName}(models.Model):
    """
    {Model purpose and description}
    """
    
    # === PRIMARY KEY ===
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # === RELATIONSHIPS ===
    related_entity = models.ForeignKey(
        'app.Entity',
        on_delete=models.CASCADE,
        related_name='items',
        help_text="Description of relationship"
    )
    
    # === DATA FIELDS ===
    name = models.CharField(max_length=255, help_text="Field description")
    data = models.JSONField(default=dict, blank=True, help_text="Flexible JSON storage")
    
    # === STATUS TRACKING ===
    status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending'),
            ('processing', 'Processing'),
            ('completed', 'Completed'),
            ('failed', 'Failed'),
        ],
        default='pending'
    )
    
    # === AUDIT FIELDS ===
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    
    # === ERROR TRACKING ===
    error_message = models.TextField(blank=True)
    retry_count = models.IntegerField(default=0)
    last_attempt_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'app_table_name'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', '-created_at']),
            models.Index(fields=['related_entity', '-created_at']),
        ]
    
    def __str__(self):
        return f"{self.name} - {self.status}"
```

### 📊 Common Model Patterns

#### 1. **Sync/Integration Log Model** (Xero Example)

```python
class XeroSyncLog(models.Model):
    """Audit log for all sync operations"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    operation_type = models.CharField(max_length=50)
    status = models.CharField(max_length=20, choices=[...])
    
    # Request/Response tracking
    request_data = models.JSONField(null=True, blank=True)
    response_data = models.JSONField(null=True, blank=True)
    error_message = models.TextField(blank=True)
    
    # Related entities
    local_entity_type = models.CharField(max_length=50)
    local_entity_id = models.UUIDField(null=True, blank=True)
    external_entity_id = models.CharField(max_length=255)
    
    # Performance tracking
    duration_ms = models.IntegerField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
```

#### 2. **Link/Mapping Model** (Contact Sync Example)

```python
class XeroContactLink(models.Model):
    """Link local entities to external IDs"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    
    # Local entity
    local_type = models.CharField(max_length=20)  # 'patient', 'clinician'
    local_id = models.UUIDField()
    
    # External entity
    external_id = models.CharField(max_length=255, unique=True)
    external_name = models.CharField(max_length=255)
    
    # Status
    is_active = models.BooleanField(default=True)
    last_synced_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = [['local_type', 'local_id']]
```

---

## 6. API Integration Patterns

### 🔄 Authentication Patterns

#### 1. **Basic Auth** (SMS Broadcast)

```python
def send_request(self):
    response = requests.get(
        self.api_url,
        params={'username': self.username, 'password': self.password},
        timeout=30
    )
```

#### 2. **Bearer Token** (OpenAI)

```python
def send_request(self):
    headers = {'Authorization': f'Bearer {self.api_key}'}
    response = requests.post(
        self.api_url,
        headers=headers,
        json=payload
    )
```

#### 3. **OAuth2 Flow** (Xero)

```python
def get_authorization_url(self) -> str:
    """Step 1: Redirect user to OAuth provider"""
    auth_url = (
        f"{AUTH_BASE}/authorize?"
        f"response_type=code&"
        f"client_id={self.client_id}&"
        f"redirect_uri={self.redirect_uri}&"
        f"scope={'+'.join(scopes)}"
    )
    return auth_url

def exchange_code_for_token(self, code: str):
    """Step 2: Exchange code for access token"""
    response = requests.post(
        f"{AUTH_BASE}/token",
        auth=(self.client_id, self.client_secret),  # Basic Auth
        data={
            'grant_type': 'authorization_code',
            'code': code,
            'redirect_uri': self.redirect_uri
        }
    )
    token_data = response.json()
    
    # Store tokens in database
    connection = XeroConnection.objects.create(
        access_token=token_data['access_token'],
        refresh_token=token_data['refresh_token'],
        expires_at=timezone.now() + timedelta(seconds=token_data['expires_in'])
    )

def refresh_token(self, connection):
    """Step 3: Refresh expired token"""
    response = requests.post(
        f"{AUTH_BASE}/token",
        auth=(self.client_id, self.client_secret),
        data={
            'grant_type': 'refresh_token',
            'refresh_token': connection.refresh_token
        }
    )
```

### 📡 Response Parsing Patterns

#### 1. **JSON API** (Most Common)

```python
response = requests.get(url, headers=headers)
response.raise_for_status()
data = response.json()

# Navigate nested JSON
items = data.get('response', {}).get('data', [])
```

#### 2. **Text-based API** (SMS Broadcast)

```python
response = requests.get(url, params=params)
result = response.text.strip()

# Parse custom format: "OK: 0: {message_id}"
if result.startswith('OK'):
    parts = result.split(':')
    message_id = parts[2].strip()
elif result.startswith('ERROR'):
    error_message = result
    raise ValueError(f"API error: {error_message}")
```

#### 3. **Binary/File Downloads** (FileMaker Containers)

```python
response = requests.get(url, headers=headers, stream=True)
response.raise_for_status()

with open(filepath, 'wb') as f:
    for chunk in response.iter_content(chunk_size=8192):
        f.write(chunk)
```

---

## 7. Error Handling & Logging

### 🚨 Standard Error Pattern

```python
import time
from django.utils import timezone

def sync_operation(self, entity):
    """Standard sync operation with error handling"""
    start_time = time.time()
    
    try:
        # Perform operation
        result = self._fetch_data(entity)
        
        # Update entity
        entity.status = 'completed'
        entity.data = result
        entity.last_synced_at = timezone.now()
        entity.error_message = ''
        
        # Log success
        SyncLog.objects.create(
            operation_type='fetch_data',
            status='success',
            entity_id=entity.id,
            duration_ms=int((time.time() - start_time) * 1000),
            response_data=result
        )
        
        return result
        
    except requests.exceptions.Timeout as e:
        # Handle timeout
        entity.status = 'failed'
        entity.error_message = f"Request timeout: {str(e)}"
        entity.retry_count += 1
        
        SyncLog.objects.create(
            operation_type='fetch_data',
            status='failed',
            entity_id=entity.id,
            error_message=str(e),
            duration_ms=int((time.time() - start_time) * 1000)
        )
        raise
        
    except requests.exceptions.RequestException as e:
        # Handle all other request errors
        entity.status = 'failed'
        entity.error_message = str(e)
        entity.retry_count += 1
        
        SyncLog.objects.create(
            operation_type='fetch_data',
            status='failed',
            entity_id=entity.id,
            error_message=str(e),
            duration_ms=int((time.time() - start_time) * 1000)
        )
        raise
        
    finally:
        entity.last_attempt_at = timezone.now()
        entity.save()
```

### 📊 Logging Best Practices

1. ✅ **Always log operation type** - Know what failed
2. ✅ **Track timing** - `duration_ms` for performance monitoring
3. ✅ **Store request/response** - For debugging (sanitize sensitive data)
4. ✅ **Link to entities** - Both local and external IDs
5. ✅ **Separate success/failure** - Clear status tracking

---

## 8. Configuration Management

### 🔐 Environment Variables Pattern

**Backend `.env` file structure:**

```bash
# === DATABASE ===
DATABASE_URL=postgresql://user:pass@localhost:5432/dbname

# === AWS S3 ===
AWS_REGION=ap-southeast-2
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_S3_BUCKET_NAME=nexus-docs-dev

# === SMS BROADCAST ===
SMSB_USERNAME=your-username
SMSB_PASSWORD=your-password
SMSB_SENDER_ID=WalkEasy

# === XERO ===
XERO_CLIENT_ID=your-client-id
XERO_CLIENT_SECRET=your-client-secret
XERO_REDIRECT_URI=http://localhost:8000/xero/oauth/callback

# === OPENAI ===
OPENAI_API_KEY=sk-proj-...

# === FILEMAKER (for scraping/migration) ===
FM_BASE_URL=https://server.fmcloud.fm
FM_DB_NAME=DatabaseName
FM_USERNAME=username
FM_PASSWORD=password
```

### 🔧 Service Configuration Loading

```python
import os
from django.conf import settings

class ScraperService:
    def __init__(self):
        # Required settings
        self.api_url = os.getenv('SCRAPER_API_URL')
        if not self.api_url:
            raise ValueError("SCRAPER_API_URL must be set")
        
        # Optional with defaults
        self.timeout = int(os.getenv('SCRAPER_TIMEOUT', '30'))
        self.max_retries = int(os.getenv('SCRAPER_MAX_RETRIES', '3'))
        self.rate_limit = int(os.getenv('SCRAPER_RATE_LIMIT', '10'))  # requests/min
        
        # Session configuration
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': os.getenv('SCRAPER_USER_AGENT', 'NexusCore/1.0')
        })
```

---

## 9. FileMaker Data API Pattern

### 🗂️ Complete Example (from `etl/test_fm_api.py`)

This is a **gold standard** example of API integration:

```python
class FileMakerAPI:
    """
    FileMaker Data API Client
    
    Demonstrates:
    - Session management (login/logout)
    - Token-based authentication
    - Record fetching with pagination
    - Binary file downloads
    - Error handling
    """
    
    def __init__(self, base_url, database, username, password):
        self.base_url = base_url.rstrip('/')
        self.database = database
        self.username = username
        self.password = password
        self.token = None
        self.session = requests.Session()
        self.verify_ssl = True  # Set False for self-signed certs
    
    def authenticate(self) -> bool:
        """Get API token via Basic Auth"""
        url = f"{self.base_url}/fmi/data/vLatest/databases/{self.database}/sessions"
        
        try:
            response = self.session.post(
                url,
                auth=(self.username, self.password),
                headers={"Content-Type": "application/json"},
                verify=self.verify_ssl,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                self.token = data.get("response", {}).get("token")
                return bool(self.token)
            else:
                print(f"Auth failed: {response.status_code} - {response.text}")
                return False
                
        except requests.exceptions.RequestException as e:
            print(f"Connection error: {e}")
            return False
    
    def list_layouts(self) -> Optional[List]:
        """Fetch available layouts (tables)"""
        if not self.token:
            return None
            
        url = f"{self.base_url}/fmi/data/vLatest/databases/{self.database}/layouts"
        headers = {"Authorization": f"Bearer {self.token}"}
        
        try:
            response = self.session.get(url, headers=headers, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            return data.get("response", {}).get("layouts", [])
        except requests.exceptions.RequestException as e:
            print(f"Failed to list layouts: {e}")
            return None
    
    def fetch_records(self, layout_name: str, limit: int = 100, offset: int = 1):
        """Fetch records with pagination"""
        if not self.token:
            return None
            
        url = f"{self.base_url}/fmi/data/vLatest/databases/{self.database}/layouts/{layout_name}/records"
        headers = {"Authorization": f"Bearer {self.token}"}
        params = {
            "_limit": limit,
            "_offset": offset
        }
        
        try:
            response = self.session.get(url, headers=headers, params=params, timeout=30)
            response.raise_for_status()
            
            data = response.json()
            return data.get("response", {}).get("data", [])
        except requests.exceptions.RequestException as e:
            print(f"Failed to fetch records: {e}")
            return None
    
    def download_container(self, container_url: str, filepath: Path):
        """Download binary file from container field"""
        if not self.token:
            return False
            
        headers = {"Authorization": f"Bearer {self.token}"}
        
        try:
            response = self.session.get(
                container_url,
                headers=headers,
                verify=self.verify_ssl,
                timeout=30,
                stream=True
            )
            response.raise_for_status()
            
            # Stream to file
            with open(filepath, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
            
            return True
        except requests.exceptions.RequestException as e:
            print(f"Download failed: {e}")
            return False
    
    def logout(self):
        """Close API session"""
        if not self.token:
            return
            
        url = f"{self.base_url}/fmi/data/vLatest/databases/{self.database}/sessions/{self.token}"
        headers = {"Authorization": f"Bearer {self.token}"}
        
        try:
            self.session.delete(url, headers=headers, timeout=10)
        except requests.exceptions.RequestException:
            pass  # Ignore logout errors


# === USAGE EXAMPLE ===
api = FileMakerAPI(
    base_url="https://server.fmcloud.fm",
    database="DatabaseName",
    username="user",
    password="pass"
)

if api.authenticate():
    layouts = api.list_layouts()
    records = api.fetch_records("Patients", limit=100)
    
    # Process records...
    
    api.logout()
```

---

## 10. Recommended Scraper Architecture

### 🏗️ Proposed Structure

```
backend/
├── scraper_integration/           # New Django app
│   ├── __init__.py
│   ├── apps.py
│   ├── models.py                  # ScraperJob, ScrapedData, ScraperLog
│   ├── services.py                # Main scraper service classes
│   ├── scrapers/                  # Individual scraper modules
│   │   ├── __init__.py
│   │   ├── base.py               # Base scraper class
│   │   ├── website_a.py          # Website A scraper
│   │   └── website_b.py          # Website B scraper
│   ├── serializers.py
│   ├── views.py                   # API endpoints
│   ├── urls.py
│   ├── tasks.py                   # Celery tasks (if async)
│   └── tests.py
```

### 🧩 Base Scraper Class

```python
"""
Base Scraper Class
All website scrapers inherit from this
"""
import time
import requests
from abc import ABC, abstractmethod
from typing import Dict, List, Optional
from django.utils import timezone
from .models import ScraperJob, ScrapedData, ScraperLog


class BaseScraper(ABC):
    """
    Abstract base class for all scrapers
    """
    
    # Override in subclasses
    SCRAPER_NAME = "base"
    BASE_URL = ""
    RATE_LIMIT_DELAY = 1  # seconds between requests
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        })
        self.last_request_time = 0
    
    @abstractmethod
    def scrape(self, **kwargs) -> List[Dict]:
        """
        Main scraping method - must be implemented by subclasses
        
        Returns:
            List of scraped data dictionaries
        """
        pass
    
    def run(self, job_params: Dict) -> ScraperJob:
        """
        Execute scraper with full error handling and logging
        
        Args:
            job_params: Parameters for this scraping job
            
        Returns:
            ScraperJob instance with results
        """
        # Create job record
        job = ScraperJob.objects.create(
            scraper_name=self.SCRAPER_NAME,
            status='running',
            parameters=job_params
        )
        
        start_time = time.time()
        
        try:
            # Run scraper
            results = self.scrape(**job_params)
            
            # Store results
            for data in results:
                ScrapedData.objects.create(
                    job=job,
                    data_type=data.get('type', 'default'),
                    raw_data=data
                )
            
            # Update job
            job.status = 'completed'
            job.records_scraped = len(results)
            job.completed_at = timezone.now()
            
            # Log success
            self._log(
                job=job,
                level='success',
                message=f"Scraped {len(results)} records",
                duration_ms=int((time.time() - start_time) * 1000)
            )
            
        except Exception as e:
            # Handle failure
            job.status = 'failed'
            job.error_message = str(e)
            job.completed_at = timezone.now()
            
            self._log(
                job=job,
                level='error',
                message=str(e),
                duration_ms=int((time.time() - start_time) * 1000)
            )
            
            raise
        
        finally:
            job.save()
        
        return job
    
    def _request(self, url: str, method: str = 'GET', **kwargs) -> requests.Response:
        """
        Make HTTP request with rate limiting and error handling
        """
        # Rate limiting
        elapsed = time.time() - self.last_request_time
        if elapsed < self.RATE_LIMIT_DELAY:
            time.sleep(self.RATE_LIMIT_DELAY - elapsed)
        
        # Make request
        response = self.session.request(
            method=method,
            url=url,
            timeout=kwargs.pop('timeout', 30),
            **kwargs
        )
        
        self.last_request_time = time.time()
        response.raise_for_status()
        
        return response
    
    def _log(self, job: ScraperJob, level: str, message: str, **kwargs):
        """Create log entry"""
        ScraperLog.objects.create(
            job=job,
            level=level,
            message=message,
            **kwargs
        )


# === EXAMPLE SCRAPER ===
class ExampleScraper(BaseScraper):
    """
    Scraper for Example Website
    """
    
    SCRAPER_NAME = "example_website"
    BASE_URL = "https://example.com"
    
    def scrape(self, category: str, limit: int = 100) -> List[Dict]:
        """
        Scrape products from example website
        
        Args:
            category: Product category to scrape
            limit: Maximum products to scrape
            
        Returns:
            List of product data
        """
        products = []
        page = 1
        
        while len(products) < limit:
            # Fetch page
            url = f"{self.BASE_URL}/api/products"
            response = self._request(url, params={
                'category': category,
                'page': page,
                'per_page': 50
            })
            
            data = response.json()
            items = data.get('items', [])
            
            if not items:
                break
            
            # Parse items
            for item in items:
                products.append({
                    'type': 'product',
                    'external_id': item['id'],
                    'name': item['name'],
                    'price': item['price'],
                    'url': f"{self.BASE_URL}/products/{item['id']}",
                    'scraped_at': timezone.now().isoformat()
                })
            
            page += 1
        
        return products[:limit]
```

### 📊 Required Models

```python
"""
Scraper Models
"""
import uuid
from django.db import models
from django.utils import timezone


class ScraperJob(models.Model):
    """Scraping job record"""
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('running', 'Running'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    scraper_name = models.CharField(max_length=100, help_text="Name of scraper")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # Job parameters
    parameters = models.JSONField(default=dict, help_text="Scraping parameters")
    
    # Results
    records_scraped = models.IntegerField(default=0)
    error_message = models.TextField(blank=True)
    
    # Timing
    created_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    # Retry
    retry_count = models.IntegerField(default=0)
    max_retries = models.IntegerField(default=3)
    
    class Meta:
        db_table = 'scraper_jobs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['scraper_name', 'status']),
            models.Index(fields=['-created_at']),
        ]


class ScrapedData(models.Model):
    """Individual scraped records"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    job = models.ForeignKey(ScraperJob, on_delete=models.CASCADE, related_name='data')
    
    # Data classification
    data_type = models.CharField(max_length=50, help_text="Type of data (product, article, etc)")
    external_id = models.CharField(max_length=255, blank=True, help_text="ID from source")
    
    # Raw scraped data
    raw_data = models.JSONField(help_text="Complete scraped data")
    
    # Processing
    is_processed = models.BooleanField(default=False)
    processed_at = models.DateTimeField(null=True, blank=True)
    
    # Timestamps
    scraped_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'scraped_data'
        ordering = ['-scraped_at']
        indexes = [
            models.Index(fields=['job', 'data_type']),
            models.Index(fields=['external_id']),
            models.Index(fields=['is_processed']),
        ]


class ScraperLog(models.Model):
    """Scraper operation logs"""
    
    LEVEL_CHOICES = [
        ('debug', 'Debug'),
        ('info', 'Info'),
        ('warning', 'Warning'),
        ('error', 'Error'),
        ('success', 'Success'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    job = models.ForeignKey(ScraperJob, on_delete=models.CASCADE, related_name='logs')
    
    level = models.CharField(max_length=20, choices=LEVEL_CHOICES)
    message = models.TextField()
    
    # Performance
    duration_ms = models.IntegerField(null=True, blank=True)
    
    # Context
    extra_data = models.JSONField(default=dict, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'scraper_logs'
        ordering = ['-created_at']
```

---

## 🎯 Summary & Best Practices

### ✅ Key Takeaways

1. **Service Layer Pattern**
   - One service class per integration
   - Credential validation in `__init__`
   - Singleton instance for easy imports

2. **Database Models**
   - UUID primary keys
   - Comprehensive audit fields (created_at, updated_at)
   - Status tracking for async operations
   - Error logging (error_message, retry_count)
   - Performance metrics (duration_ms)

3. **Error Handling**
   - Try/except with specific exception types
   - Always log to database
   - Update entity status
   - Track retry attempts

4. **Configuration**
   - All secrets in environment variables
   - Sensible defaults for optional settings
   - Validation on service init

5. **API Patterns**
   - Session reuse for performance
   - Configurable timeouts
   - Rate limiting respect
   - Proper User-Agent headers

### 🚀 Next Steps for Scraper Implementation

1. Create `scraper_integration` Django app
2. Implement models (ScraperJob, ScrapedData, ScraperLog)
3. Build BaseScraper abstract class
4. Implement specific scrapers inheriting from BaseScraper
5. Add API endpoints for job management
6. Optional: Add Celery tasks for async scraping
7. Add monitoring/alerting for failed jobs

---

**Document maintained by:** Nexus Core Development Team  
**For questions:** See main project documentation



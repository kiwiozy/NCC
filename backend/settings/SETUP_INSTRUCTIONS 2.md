# Settings App Setup Instructions

## Required Manual Steps

Since `ncc_api/settings.py` and `ncc_api/urls.py` are protected files, you need to manually add the following:

### 1. Add to INSTALLED_APPS

In `backend/ncc_api/settings.py`, add `'settings'` to `INSTALLED_APPS`:

```python
INSTALLED_APPS = [
    # ... existing apps ...
    'settings',  # Add this line
]
```

### 2. Add URL Routing

In `backend/ncc_api/urls.py`, add the settings URLs:

```python
urlpatterns = [
    # ... existing patterns ...
    path('api/settings/', include('settings.urls')),  # Add this line
]
```

### 3. Run Migration

```bash
cd backend
source venv/bin/activate
python manage.py makemigrations settings
python manage.py migrate
```

### 4. Create Default Funding Sources

After migration, you can create default funding sources via Django admin or shell:

```python
python manage.py shell
```

```python
from settings.models import FundingSource

FundingSource.objects.get_or_create(name='NDIS', defaults={'code': 'NDIS', 'order': 1})
FundingSource.objects.get_or_create(name='Private', defaults={'code': 'PRV', 'order': 2})
FundingSource.objects.get_or_create(name='DVA', defaults={'code': 'DVA', 'order': 3})
FundingSource.objects.get_or_create(name='Workers Comp', defaults={'code': 'WC', 'order': 4})
FundingSource.objects.get_or_create(name='Medicare', defaults={'code': 'MC', 'order': 5})
```

## API Endpoints

After setup, the following endpoints will be available:

- `GET /api/settings/funding-sources/` - List all funding sources
- `GET /api/settings/funding-sources/?active=true` - List only active funding sources
- `POST /api/settings/funding-sources/` - Create new funding source
- `GET /api/settings/funding-sources/:id/` - Get single funding source
- `PUT /api/settings/funding-sources/:id/` - Update funding source
- `DELETE /api/settings/funding-sources/:id/` - Delete funding source


# Backend Changes Needed for Step 1

## File: `backend/sms_integration/views.py`

Add this function (check if imports exist first):

```python
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .models import SMSInbound

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def global_unread_count(request):
    """
    Get total count of unread SMS messages across all patients
    Returns count + latest message ID (for change detection)
    """
    try:
        # Count all unread inbound messages
        unread_count = SMSInbound.objects.filter(is_processed=False).count()
        
        # Get latest message ID
        latest_message = SMSInbound.objects.order_by('-received_at').first()
        latest_id = str(latest_message.id) if latest_message else None
        
        return Response({
            'unread_count': unread_count,
            'latest_message_id': latest_id
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
```

## File: `backend/sms_integration/urls.py`

Add this line to urlpatterns:

```python
path('unread-count/', views.global_unread_count, name='global_unread_count'),
```

## To Test:

1. Restart Django server
2. Visit: https://localhost:8000/api/sms/unread-count/
3. Should return: `{"unread_count": N, "latest_message_id": "uuid"}`


"""
SMS Service
Handles SMS sending via SMS Broadcast API
"""
import os
import requests
import uuid
from typing import Dict, Optional
from django.utils import timezone
from django.conf import settings
from .models import SMSMessage, SMSTemplate


class SMSService:
    """
    Service for sending SMS via SMS Broadcast
    """
    
    def __init__(self):
        self.username = os.getenv('SMSB_USERNAME', '')
        self.password = os.getenv('SMSB_PASSWORD', '')
        # Sender ID must be approved in SMS Broadcast
        # FileMaker uses: 0488868772 (formatted as 61488868772 for SMS Broadcast)
        # If not set, will use the verified number from FileMaker config
        sender_id_env = os.getenv('SMSB_SENDER_ID', '').strip()
        
        if sender_id_env:
            self.sender_id = sender_id_env
        else:
            # Use the verified number from FileMaker config (0488868772 -> 61488868772)
            # This is the approved sender ID that works in FileMaker
            self.sender_id = '61488868772'
        
        self.api_url = 'https://api.smsbroadcast.com.au/api-adv.php'
    
    def _check_credentials(self):
        """Check if SMS Broadcast credentials are configured"""
        if not self.username or not self.password:
            raise ValueError("SMSB_USERNAME and SMSB_PASSWORD must be set in environment. See .env.example for setup.")
    
    def send_sms(
        self,
        phone_number: str,
        message: str,
        patient_id: Optional[uuid.UUID] = None,
        appointment_id: Optional[uuid.UUID] = None,
        template_id: Optional[uuid.UUID] = None,
        media_url: Optional[str] = None  # MMS support
    ) -> SMSMessage:
        """
        Send an SMS or MMS message
        
        Args:
            phone_number: Recipient phone number (format: 61412345678 or +61412345678)
            message: Message content (optional if media_url provided)
            patient_id: Optional patient UUID
            appointment_id: Optional appointment UUID
            template_id: Optional template UUID
            media_url: Optional media URL for MMS (public S3 URL)
        
        Returns:
            SMSMessage object with send status
        """
        self._check_credentials()
        
        # Clean phone number
        phone_number = self._format_phone_number(phone_number)
        
        # Create SMS message record
        from patients.models import Patient
        from appointments.models import Appointment
        
        sms_message = SMSMessage.objects.create(
            patient_id=patient_id,
            appointment_id=appointment_id,
            template_id=template_id,
            phone_number=phone_number,
            message=message,
            status='pending',
            # MMS support
            has_media=bool(media_url),
            media_url=media_url or ''
        )
        
        try:
            # Send via SMS Broadcast API
            params = {
                'username': self.username,
                'password': self.password,
                'to': phone_number,
                'message': message,
                'maxsplit': '10',  # Allow up to 10 SMS segments
                'ref': str(sms_message.id)  # Our internal reference
            }
            
            # Add media for MMS (SMS Broadcast requires base64-encoded media)
            if media_url:
                print(f"[SMS Service] Sending MMS with media: {media_url}")
                
                # Download image from S3 and encode to base64
                import requests
                import base64
                from urllib.parse import urlparse
                
                try:
                    # Download image from S3
                    response = requests.get(media_url, timeout=30)
                    response.raise_for_status()
                    
                    # Get content type and filename
                    content_type = response.headers.get('Content-Type', 'image/jpeg')
                    filename = media_url.split('/')[-1].split('?')[0]  # Extract filename from URL
                    
                    # Encode to base64
                    media_base64 = base64.b64encode(response.content).decode('utf-8')
                    
                    # SMS Broadcast MMS API format
                    params['attachment0'] = media_base64
                    params['type0'] = content_type
                    params['name0'] = filename
                    
                    print(f"[SMS Service] Encoded image: {len(media_base64)} chars, type={content_type}, name={filename}")
                except Exception as e:
                    print(f"[SMS Service] ❌ Failed to download/encode media: {e}")
                    # Continue without media - send as SMS
            
            # Only include 'from' parameter if sender_id is set and approved
            # If sender_id is None or empty, SMS Broadcast will use account default
            if self.sender_id:
                params['from'] = self.sender_id[:11]  # SMS Broadcast limits to 11 chars
            
            print(f"[SMS Service] Request params: username={self.username}, to={phone_number}, from={params.get('from', 'DEFAULT')}, message_len={len(message)}")
            if not self.sender_id:
                print(f"[SMS Service] ⚠️ No sender ID set - using SMS Broadcast default (may be rejected if no default configured)")
            
            response = requests.get(self.api_url, params=params, timeout=30)
            response.raise_for_status()
            
            # Parse response
            # SMS Broadcast returns: OK: {phone_number}: {message_id}
            # or ERROR: {error_code}: {error_message}
            # or BAD: {error_code}: {error_message}
            result = response.text.strip()
            
            # Log the raw response for debugging
            print(f"[SMS Service] API Response: {result}")
            print(f"[SMS Service] Phone: {phone_number}, Message: {message[:50]}...")
            
            if result.startswith('OK'):
                # Success - Format: OK: {phone}: {message_id} or OK: {message_id}
                parts = result.split(':')
                if len(parts) >= 3:
                    message_id = parts[2].strip()
                elif len(parts) == 2:
                    message_id = parts[1].strip()
                else:
                    message_id = ''
                
                print(f"[SMS Service] ✓ Message accepted. External ID: {message_id}")
                
                sms_message.status = 'sent'
                sms_message.external_message_id = message_id
                sms_message.sent_at = timezone.now()
                sms_message.error_message = ''
            
            elif result.startswith('BAD'):
                # Bad credentials or invalid request
                error_msg = result
                print(f"[SMS Service] ✗ Authentication failed: {error_msg}")
                sms_message.status = 'failed'
                sms_message.error_message = error_msg
                raise ValueError(f"SMS Broadcast authentication failed: {error_msg}")
            
            elif result.startswith('ERROR'):
                # Other error (insufficient credits, invalid number, etc.)
                error_msg = result
                print(f"[SMS Service] ✗ Send failed: {error_msg}")
                sms_message.status = 'failed'
                sms_message.error_message = error_msg
                raise ValueError(f"SMS sending failed: {error_msg}")
            
            else:
                # Unknown response
                print(f"[SMS Service] ⚠ Unexpected response: {result}")
                sms_message.status = 'failed'
                sms_message.error_message = f"Unknown response: {result}"
                raise ValueError(f"Unexpected response from SMS Broadcast: {result}")
        
        except Exception as e:
            sms_message.status = 'failed'
            sms_message.error_message = str(e)
            sms_message.retry_count += 1
            raise
        
        finally:
            sms_message.save()
        
        return sms_message
    
    def send_from_template(
        self,
        template_name: str,
        phone_number: str,
        context: Dict[str, str],
        patient_id: Optional[uuid.UUID] = None,
        appointment_id: Optional[uuid.UUID] = None
    ) -> SMSMessage:
        """
        Send SMS using a template
        
        Args:
            template_name: Name of the template to use
            phone_number: Recipient phone number
            context: Dictionary of template variables (e.g., {'patient_name': 'John'})
            patient_id: Optional patient UUID
            appointment_id: Optional appointment UUID
        
        Returns:
            SMSMessage object
        """
        template = SMSTemplate.objects.get(name=template_name, is_active=True)
        message = template.render(context)
        
        return self.send_sms(
            phone_number=phone_number,
            message=message,
            patient_id=patient_id,
            appointment_id=appointment_id,
            template_id=template.id
        )
    
    def send_appointment_reminder(self, appointment_id: uuid.UUID) -> SMSMessage:
        """
        Send appointment reminder SMS
        
        Args:
            appointment_id: Appointment UUID
        
        Returns:
            SMSMessage object
        """
        from appointments.models import Appointment
        
        appointment = Appointment.objects.select_related('patient', 'clinic', 'clinician').get(id=appointment_id)
        
        # Get patient mobile number
        phone_number = appointment.patient.get_mobile()
        if not phone_number:
            raise ValueError(f"Patient {appointment.patient.get_full_name()} has no mobile number")
        
        # Prepare context
        context = {
            'patient_name': appointment.patient.first_name,
            'appointment_date': appointment.start_time.strftime('%A, %B %d'),
            'appointment_time': appointment.start_time.strftime('%I:%M %p'),
            'clinic_name': appointment.clinic.name,
            'clinician_name': appointment.clinician.full_name if appointment.clinician else 'our team',
        }
        
        return self.send_from_template(
            template_name='appointment_reminder',
            phone_number=phone_number,
            context=context,
            patient_id=appointment.patient.id,
            appointment_id=appointment.id
        )
    
    def _format_phone_number(self, phone: str) -> str:
        """
        Format phone number for SMS Broadcast
        Expects: 61412345678 (country code + number, no +)
        """
        original = phone
        # Remove all non-digit characters
        phone = ''.join(filter(str.isdigit, phone))
        
        # If starts with 0, replace with 61
        if phone.startswith('0'):
            phone = '61' + phone[1:]
        
        # If starts with +61, remove the +
        if phone.startswith('61') and original.startswith('+61'):
            pass  # Already correct
        elif phone.startswith('61'):
            pass  # Already correct
        # If doesn't start with 61, assume Australian and prepend
        elif not phone.startswith('61'):
            # Check if it's a valid 9 or 10 digit Australian number
            if len(phone) == 9:  # Mobile without leading 0
                phone = '61' + phone
            elif len(phone) == 10:  # Mobile with leading 0
                phone = '61' + phone[1:]
            elif len(phone) == 8:  # Landline format
                phone = '61' + phone
            else:
                phone = '61' + phone
        
        print(f"[SMS Service] Phone formatting: {original} -> {phone}")
        return phone
    
    def get_balance(self) -> Dict[str, any]:
        """
        Get SMS credit balance from SMS Broadcast
        
        Returns:
            Dictionary with balance info
        """
        self._check_credentials()
        
        params = {
            'username': self.username,
            'password': self.password,
            'action': 'balance'
        }
        
        try:
            response = requests.get(self.api_url, params=params, timeout=10)
            response.raise_for_status()
            
            # Response format: OK: {balance}
            result = response.text.strip()
            
            if result.startswith('OK'):
                balance = float(result.split(':')[1].strip())
                return {
                    'success': True,
                    'balance': balance,
                    'currency': 'AUD'
                }
            else:
                return {
                    'success': False,
                    'error': result
                }
        
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }


# Singleton instance
sms_service = SMSService()


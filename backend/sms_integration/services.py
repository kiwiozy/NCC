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
        self.sender_id = os.getenv('SMSB_SENDER_ID', 'Walk Easy')
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
        template_id: Optional[uuid.UUID] = None
    ) -> SMSMessage:
        """
        Send an SMS message
        
        Args:
            phone_number: Recipient phone number (format: 61412345678 or +61412345678)
            message: Message content
            patient_id: Optional patient UUID
            appointment_id: Optional appointment UUID
            template_id: Optional template UUID
        
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
            status='pending'
        )
        
        try:
            # Send via SMS Broadcast API
            params = {
                'username': self.username,
                'password': self.password,
                'to': phone_number,
                'from': self.sender_id,
                'message': message,
                'maxsplit': '10',  # Allow up to 10 SMS segments
                'ref': str(sms_message.id)  # Our internal reference
            }
            
            response = requests.get(self.api_url, params=params, timeout=30)
            response.raise_for_status()
            
            # Parse response
            # SMS Broadcast returns: OK: 0: {message_id}
            # or ERROR: {error_code}: {error_message}
            result = response.text.strip()
            
            if result.startswith('OK'):
                # Success
                parts = result.split(':')
                message_id = parts[2].strip() if len(parts) >= 3 else ''
                
                sms_message.status = 'sent'
                sms_message.external_message_id = message_id
                sms_message.sent_at = timezone.now()
                sms_message.error_message = ''
            
            elif result.startswith('BAD'):
                # Bad credentials
                sms_message.status = 'failed'
                sms_message.error_message = result
                raise ValueError(f"SMS Broadcast authentication failed: {result}")
            
            elif result.startswith('ERROR'):
                # Other error
                sms_message.status = 'failed'
                sms_message.error_message = result
                raise ValueError(f"SMS sending failed: {result}")
            
            else:
                # Unknown response
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
        # Remove all non-digit characters
        phone = ''.join(filter(str.isdigit, phone))
        
        # If starts with 0, replace with 61
        if phone.startswith('0'):
            phone = '61' + phone[1:]
        
        # If starts with +61, remove the +
        if phone.startswith('+61'):
            phone = phone[1:]
        
        # If doesn't start with 61, assume Australian and prepend
        if not phone.startswith('61'):
            phone = '61' + phone
        
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


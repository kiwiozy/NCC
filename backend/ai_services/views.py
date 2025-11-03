from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser
from django.http import HttpResponse
import os
from .services import OpenAIService
from .pdf_generator import generate_at_report_pdf
from .email_service import get_email_service
from .at_report_email import send_at_report_email_via_gmail


class RewriteClinicalNotesView(APIView):
    """
    API endpoint to rewrite text as clinical notes using OpenAI
    
    POST /api/ai/rewrite-clinical-notes/
    {
        "content": "original note text",
        "custom_prompt": "optional refinement instructions"
    }
    """
    
    def post(self, request):
        import time
        import logging
        logger = logging.getLogger(__name__)
        
        start_time = time.time()
        content = request.data.get('content')
        custom_prompt = request.data.get('custom_prompt')
        
        logger.info(f'🤖 OpenAI Request Received - Content length: {len(content) if content else 0}, Custom prompt: {bool(custom_prompt)}')
        
        if not content:
            logger.warning('❌ OpenAI Request Rejected - No content provided')
            return Response(
                {'error': 'Content is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            logger.info('🔧 Initializing OpenAI service...')
            ai_service = OpenAIService()
            logger.info(f'📝 Calling OpenAI API with model: {ai_service.model}')
            
            api_start_time = time.time()
            result = ai_service.rewrite_clinical_notes(content, custom_prompt)
            api_duration = time.time() - api_start_time
            
            logger.info(f'✅ OpenAI API Success - Duration: {api_duration:.2f}s, Result length: {len(result) if result else 0}')
            
            total_duration = time.time() - start_time
            logger.info(f'✨ Total request duration: {total_duration:.2f}s')
            
            return Response({
                'success': True,
                'result': result,
                'model': ai_service.model
            })
            
        except ValueError as e:
            logger.error(f'❌ OpenAI Configuration Error: {str(e)}')
            return Response(
                {'error': str(e), 'message': 'OpenAI API key not configured'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        except Exception as e:
            logger.error(f'❌ OpenAI Request Failed: {str(e)}', exc_info=True)
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ExtractATReportView(APIView):
    """
    API endpoint to extract structured data from AT report PDFs
    
    POST /api/ai/extract-at-report/
    {
        "pdf_file": <file>,
        "report_type": "general" | "prosthetics_orthotics"  (optional, default: "general")
    }
    """
    parser_classes = (MultiPartParser, FormParser)
    
    def post(self, request):
        pdf_file = request.FILES.get('pdf_file')
        report_type = request.data.get('report_type', 'general')
        
        if not pdf_file:
            return Response(
                {'error': 'PDF file is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate file type
        if not pdf_file.name.endswith('.pdf'):
            return Response(
                {'error': 'File must be a PDF'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate report type
        if report_type not in ['general', 'prosthetics_orthotics']:
            return Response(
                {'error': 'Invalid report_type. Must be "general" or "prosthetics_orthotics"'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            ai_service = OpenAIService()
            
            # Step 1: Extract text from PDF
            pdf_text = ai_service.extract_text_from_pdf(pdf_file)
            
            if not pdf_text.strip():
                return Response(
                    {'error': 'No text could be extracted from the PDF'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Step 2: Extract structured data using AI
            extracted_data = ai_service.extract_at_report_data(pdf_text, report_type)
            
            return Response({
                'success': True,
                'data': extracted_data,
                'report_type': report_type,
                'model': ai_service.model,
                'pages_extracted': pdf_text.count('--- Page')
            })
            
        except ValueError as e:
            return Response(
                {'error': str(e), 'message': 'OpenAI API key not configured'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class GenerateATPDFView(APIView):
    """
    API endpoint to generate PDF from completed AT Report data
    
    POST /api/ai/generate-at-pdf/
    {
        "data": {
            "participant": {...},
            "assessor": {...},
            ...all form data...
        }
    }
    
    Returns: PDF file download
    """
    
    def post(self, request):
        form_data = request.data.get('data')
        
        if not form_data:
            return Response(
                {'error': 'Form data is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Find NDIS logo
            logo_path = os.path.join(
                os.path.dirname(os.path.dirname(__file__)),
                '../docs/AT Report/NDIS_Menu_Large.jpg'
            )
            
            if not os.path.exists(logo_path):
                # Try alternative path
                logo_path = os.path.join(
                    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
                    'docs/AT Report/NDIS_Menu_Large.jpg'
                )
            
            if not os.path.exists(logo_path):
                logo_path = None  # Generate without logo
            
            # Generate PDF
            pdf_buffer = generate_at_report_pdf(form_data, logo_path=logo_path)
            
            # Prepare response
            response = HttpResponse(pdf_buffer.getvalue(), content_type='application/pdf')
            
            # Generate filename: ParticipantName_NDISNumber.pdf
            participant_name = form_data.get('participant', {}).get('name', 'Report')
            ndis_number = form_data.get('participant', {}).get('ndisNumber', '')
            
            # Clean filename (remove special characters)
            safe_name = ''.join(c for c in participant_name if c.isalnum() or c in (' ', '-', '_'))
            safe_name = safe_name.replace(' ', '_')
            safe_ndis = ''.join(c for c in ndis_number if c.isalnum())
            
            if safe_ndis:
                filename = f'{safe_name}_{safe_ndis}.pdf'
            else:
                filename = f'{safe_name}.pdf'
            
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            
            return response
            
        except Exception as e:
            return Response(
                {'error': str(e), 'details': 'Failed to generate PDF'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class EmailATReportView(APIView):
    """
    API endpoint to email AT Report PDF
    
    POST /api/ai/email-at-report/
    {
        "data": {...complete form data...},
        "to_emails": ["recipient@example.com"],
        "cc_emails": ["cc@example.com"],  // optional
        "custom_message": "Custom message text"  // optional
    }
    
    Returns: Success/error message
    """
    
    def post(self, request):
        form_data = request.data.get('data')
        to_emails = request.data.get('to_emails', [])
        cc_emails = request.data.get('cc_emails', [])
        custom_message = request.data.get('custom_message', '')
        from_address = request.data.get('from_address', None)
        connection_email = request.data.get('connection_email', None)
        
        # Validation
        if not form_data:
            return Response(
                {'error': 'Form data is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not to_emails or not isinstance(to_emails, list):
            return Response(
                {'error': 'At least one recipient email address is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Try Gmail integration first
            try:
                result = send_at_report_email_via_gmail(
                    form_data=form_data,
                    to_emails=to_emails,
                    cc_emails=cc_emails if cc_emails else None,
                    custom_message=custom_message if custom_message else None,
                    from_address=from_address if from_address else None,
                    connection_email=connection_email if connection_email else None
                )
                
                return Response({
                    'success': True,
                    'message': result['message'],
                    'recipients': result['recipients'],
                    'method': 'gmail_api'
                })
                
            except Exception as gmail_error:
                # Gmail failed, fall back to SMTP
                print(f"Gmail API failed: {gmail_error}, falling back to SMTP")
                
                # Generate PDF for SMTP fallback
                logo_path = os.path.join(
                    os.path.dirname(os.path.dirname(__file__)),
                    '../docs/AT Report/NDIS_Menu_Large.jpg'
                )
                
                if not os.path.exists(logo_path):
                    logo_path = os.path.join(
                        os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
                        'docs/AT Report/NDIS_Menu_Large.jpg'
                    )
                
                if not os.path.exists(logo_path):
                    logo_path = None
                
                pdf_buffer = generate_at_report_pdf(form_data, logo_path=logo_path)
                pdf_content = pdf_buffer.getvalue()
                
                # Generate filename
                participant_name = form_data.get('participant', {}).get('name', 'Report')
                ndis_number = form_data.get('participant', {}).get('ndisNumber', '')
                
                safe_name = ''.join(c for c in participant_name if c.isalnum() or c in (' ', '-', '_'))
                safe_name = safe_name.replace(' ', '_')
                safe_ndis = ''.join(c for c in ndis_number if c.isalnum())
                
                if safe_ndis:
                    pdf_filename = f'{safe_name}_{safe_ndis}.pdf'
                else:
                    pdf_filename = f'{safe_name}.pdf'
                
                # Send via SMTP
                email_service = get_email_service()
                result = email_service.send_at_report_email(
                    to_emails=to_emails,
                    participant_name=participant_name,
                    ndis_number=ndis_number or 'N/A',
                    pdf_content=pdf_content,
                    pdf_filename=pdf_filename,
                    cc_emails=cc_emails if cc_emails else None,
                    custom_message=custom_message if custom_message else None
                )
                
                if result['success']:
                    return Response({
                        'success': True,
                        'message': result['message'],
                        'recipients': len(to_emails) + len(cc_emails),
                        'method': 'smtp_fallback'
                    })
                else:
                    return Response(
                        {'error': result['message']},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )
            
        except Exception as e:
            return Response(
                {'error': str(e), 'details': 'Failed to send email'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class TestEmailView(APIView):
    """
    API endpoint to test email configuration
    
    POST /api/ai/test-email/
    {
        "to_email": "test@example.com"
    }
    """
    
    def post(self, request):
        to_email = request.data.get('to_email')
        
        if not to_email:
            return Response(
                {'error': 'Email address is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            email_service = get_email_service()
            result = email_service.send_test_email(to_email)
            
            if result['success']:
                return Response({
                    'success': True,
                    'message': result['message']
                })
            else:
                return Response(
                    {'error': result['message']},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

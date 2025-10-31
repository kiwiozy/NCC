from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser
from .services import OpenAIService


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
        content = request.data.get('content')
        custom_prompt = request.data.get('custom_prompt')
        
        if not content:
            return Response(
                {'error': 'Content is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            ai_service = OpenAIService()
            result = ai_service.rewrite_clinical_notes(content, custom_prompt)
            
            return Response({
                'success': True,
                'result': result,
                'model': ai_service.model
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

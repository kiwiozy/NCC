from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
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

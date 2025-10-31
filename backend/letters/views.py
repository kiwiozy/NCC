from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.conf import settings
import json
import os
from io import BytesIO
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageTemplate, Frame
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_JUSTIFY, TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.pdfgen import canvas
from html.parser import HTMLParser
import re


class LetterheadCanvas(canvas.Canvas):
    """Custom canvas that draws letterhead background on each page"""
    
    def __init__(self, *args, **kwargs):
        canvas.Canvas.__init__(self, *args, **kwargs)
        self.pages = []
        
        # Path to letterhead image
        self.letterhead_path = os.path.join(
            settings.BASE_DIR.parent,
            'docs',
            'Letters',
            'Walk-Easy_Letterhead-Pad-Final.png'
        )
        
    def showPage(self):
        """Override to add letterhead to each page before showing"""
        self.pages.append(dict(self.__dict__))
        self._startPage()
        
    def save(self):
        """Override to add letterhead to all pages"""
        num_pages = len(self.pages)
        for page in self.pages:
            self.__dict__.update(page)
            self._draw_letterhead()
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)
        
    def _draw_letterhead(self):
        """Draw the letterhead background image"""
        if os.path.exists(self.letterhead_path):
            # Get page dimensions
            page_width, page_height = letter
            
            # Draw letterhead as background (full page)
            self.drawImage(
                self.letterhead_path,
                0, 0,  # x, y position (bottom-left corner)
                width=page_width,
                height=page_height,
                preserveAspectRatio=True,
                mask='auto'
            )


class HTML2ReportLabConverter:
    """Convert HTML to ReportLab elements"""
    
    def __init__(self):
        self.styles = getSampleStyleSheet()
        self.elements = []
        
    def html_to_pdf_elements(self, html_content):
        """Convert HTML to ReportLab flowables"""
        # Clean HTML
        html_content = html_content.replace('<br>', '<br/>').replace('<br />', '<br/>')
        
        # Split by paragraph tags
        paragraphs = re.split(r'</?p[^>]*>', html_content)
        elements = []
        
        for para in paragraphs:
            if not para.strip():
                continue
                
            # Convert HTML formatting to ReportLab formatting
            text = self._convert_html_to_reportlab(para)
            
            if not text.strip():
                elements.append(Spacer(1, 0.2 * inch))
                continue
            
            # Determine style based on HTML tags
            style = self._get_style(para)
            
            try:
                p = Paragraph(text, style)
                elements.append(p)
                elements.append(Spacer(1, 0.1 * inch))
            except Exception as e:
                print(f"Error creating paragraph: {e}, text: {text}")
                continue
                
        return elements
    
    def _convert_html_to_reportlab(self, html_text):
        """Convert HTML tags to ReportLab markup"""
        text = html_text
        
        # Bold
        text = re.sub(r'<strong>(.*?)</strong>', r'<b>\1</b>', text)
        
        # Italic
        text = re.sub(r'<em>(.*?)</em>', r'<i>\1</i>', text)
        
        # Underline
        text = re.sub(r'<u>(.*?)</u>', r'<u>\1</u>', text)
        
        # Remove other HTML tags (like span, div, etc.)
        text = re.sub(r'<(?!/?[biu]>)[^>]+>', '', text)
        
        # Clean up entities
        text = text.replace('&nbsp;', ' ')
        text = text.replace('&amp;', '&')
        text = text.replace('&lt;', '<')
        text = text.replace('&gt;', '>')
        
        # Remove <br/> tags
        text = text.replace('<br/>', '')
        
        return text.strip()
    
    def _get_style(self, html_text):
        """Determine paragraph style based on HTML tags"""
        if '<h1' in html_text:
            return self.styles['Heading1']
        elif '<h2' in html_text:
            return self.styles['Heading2']
        elif '<h3' in html_text:
            return self.styles['Heading3']
        else:
            style = ParagraphStyle(
                'CustomBody',
                parent=self.styles['BodyText'],
                fontSize=11,
                leading=16,
                spaceBefore=6,
                spaceAfter=6,
            )
            
            # Check for alignment
            if 'text-align: center' in html_text or 'text-align:center' in html_text:
                style.alignment = TA_CENTER
            elif 'text-align: right' in html_text or 'text-align:right' in html_text:
                style.alignment = TA_RIGHT
            else:
                style.alignment = TA_LEFT
                
            return style


@csrf_exempt
@require_http_methods(["POST"])
def generate_pdf(request):
    """Generate PDF from HTML content"""
    try:
        data = json.loads(request.body)
        html_content = data.get('html_content', '')
        subject = data.get('subject', 'Letter')
        
        if not html_content:
            return JsonResponse({'error': 'No content provided'}, status=400)
        
        # Create PDF buffer
        buffer = BytesIO()
        
        # Create PDF document with custom canvas
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=72,
            leftMargin=72,
            topMargin=100,  # More top margin to avoid letterhead header
            bottomMargin=72,
        )
        
        # Convert HTML to PDF elements
        converter = HTML2ReportLabConverter()
        story = converter.html_to_pdf_elements(html_content)
        
        # Build PDF with letterhead canvas
        doc.build(story, canvasmaker=LetterheadCanvas)
        
        # Get PDF data
        pdf_data = buffer.getvalue()
        buffer.close()
        
        # Create response
        response = HttpResponse(pdf_data, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{subject}.pdf"'
        
        return response
        
    except Exception as e:
        print(f"Error generating PDF: {e}")
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def email_letter(request):
    """Email letter with PDF attachment"""
    try:
        data = json.loads(request.body)
        html_content = data.get('html_content', '')
        recipient_email = data.get('recipient_email', '')
        recipient_name = data.get('recipient_name', '')
        subject = data.get('subject', 'Letter')
        connection_email = data.get('connection_email')
        
        if not all([html_content, recipient_email, recipient_name, subject]):
            return JsonResponse({'error': 'Missing required fields'}, status=400)
        
        # Generate PDF with letterhead
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=72,
            leftMargin=72,
            topMargin=100,  # More top margin to avoid letterhead header
            bottomMargin=72,
        )
        
        converter = HTML2ReportLabConverter()
        story = converter.html_to_pdf_elements(html_content)
        doc.build(story, canvasmaker=LetterheadCanvas)
        
        pdf_data = buffer.getvalue()
        buffer.close()
        
        # Send email via Gmail
        from gmail_integration.services import GmailService
        
        gmail_service = GmailService()
        
        # Simple text body for the email
        body_text = f"Dear {recipient_name},\n\nPlease find the attached letter.\n\nBest regards,\nWalk Easy Pedorthics"
        
        gmail_service.send_email(
            to_email=recipient_email,
            subject=subject,
            body_text=body_text,
            body_html=f"<p>Dear {recipient_name},</p><p>Please find the attached letter.</p><p>Best regards,<br>Walk Easy Pedorthics</p>",
            attachments=[{
                'filename': f'{subject}.pdf',
                'content': pdf_data,
                'mime_type': 'application/pdf'
            }],
            connection_email=connection_email
        )
        
        return JsonResponse({
            'success': True,
            'message': 'Email sent successfully with PDF attachment'
        })
        
    except Exception as e:
        print(f"Error sending email: {e}")
        return JsonResponse({'error': str(e)}, status=500)

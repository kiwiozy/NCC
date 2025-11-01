from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.conf import settings
import json
import os
from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageTemplate, Frame, BaseDocTemplate
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_JUSTIFY, TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.lib.colors import HexColor, black
from reportlab.pdfgen import canvas
from html.parser import HTMLParser
from bs4 import BeautifulSoup
import re


# Page margins (in points)
TOP_MARGIN = 190
BOTTOM_MARGIN = 140
LEFT_MARGIN = 105
RIGHT_MARGIN = 105
PAGE_WIDTH, PAGE_HEIGHT = A4
CONTENT_HEIGHT = PAGE_HEIGHT - TOP_MARGIN - BOTTOM_MARGIN


class LetterheadCanvas(canvas.Canvas):
    """Custom canvas that draws letterhead background on each page"""
    
    def __init__(self, *args, **kwargs):
        canvas.Canvas.__init__(self, *args, **kwargs)
        
        # Path to letterhead image
        self.letterhead_path = os.path.join(
            settings.BASE_DIR.parent,
            'docs',
            'Letters',
            'Walk-Easy_Letterhead-Pad-Final.png'
        )


def draw_letterhead(canvas_obj, doc):
    """Draw letterhead on page - called BEFORE content is drawn"""
    canvas_obj.saveState()
    
    # Path to letterhead image
    letterhead_path = os.path.join(
        settings.BASE_DIR.parent,
        'docs',
        'Letters',
        'Walk-Easy_Letterhead-Pad-Final.png'
    )
    
    if os.path.exists(letterhead_path):
        # Get page dimensions (A4: 210mm × 297mm)
        page_width, page_height = A4
        
        # Draw letterhead as background (full page)
        canvas_obj.drawImage(
            letterhead_path,
            0, 0,  # x, y position (bottom-left corner)
            width=page_width,
            height=page_height,
            preserveAspectRatio=True,
            mask='auto'
        )
    
    canvas_obj.restoreState()


class HTML2ReportLabConverter:
    """Convert HTML to ReportLab elements with full style support"""
    
    def __init__(self):
        self.styles = getSampleStyleSheet()
        self.elements = []
        # Font size scaling factor (will be adjusted if content doesn't fit)
        # COMMENTED OUT - Font scaling disabled for now
        # self.font_scale = 1.0
        
    def html_to_pdf_elements(self, html_content):
        """Convert HTML to ReportLab flowables with inline styles"""
        from reportlab.platypus import ListFlowable, ListItem
        
        # Debug: Write HTML to file
        try:
            with open('/tmp/tiptap_html.html', 'w') as f:
                f.write(html_content)
            print(f"HTML written to /tmp/tiptap_html.html ({len(html_content)} chars)")
        except Exception as e:
            print(f"Error writing HTML to file: {e}")
        
        # Parse HTML with BeautifulSoup
        soup = BeautifulSoup(html_content, 'html.parser')
        elements = []
        
        # Track which paragraphs are inside lists to avoid duplication
        paragraphs_in_lists = set()
        for ul_or_ol in soup.find_all(['ul', 'ol']):
            for p in ul_or_ol.find_all('p'):
                paragraphs_in_lists.add(id(p))
        
        # Process each top-level element
        for tag in soup.find_all(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol']):
            # Skip paragraphs that are inside lists (they'll be handled by list processing)
            if tag.name == 'p' and id(tag) in paragraphs_in_lists:
                continue
            
            # Extract data-we ID from tag
            we_id = tag.get('data-we', None)
                
            # Handle lists
            if tag.name in ['ul', 'ol']:
                list_items = []
                for li in tag.find_all('li', recursive=False):
                    if li.get_text(strip=True):
                        text = self._convert_element_to_markup(li)
                        # Apply scaling to list item font size (SCALING DISABLED)
                        # scaled_size = int(10 * self.font_scale)
                        scaled_size = 10  # Fixed size
                        style = ParagraphStyle(
                            'ListItem',
                            parent=self.styles['BodyText'],
                            fontSize=scaled_size,
                            leading=scaled_size * 1.3,
                            textColor=black,
                            leftIndent=0,
                        )
                        try:
                            p = Paragraph(text, style)
                            list_items.append(ListItem(p))
                        except Exception as e:
                            print(f"❌ Error creating list item: {e}, text: {text[:50]}")
                            continue
                
                if list_items:
                    bullet_type = 'bullet' if tag.name == 'ul' else '1'
                    list_flowable = ListFlowable(
                        list_items,
                        bulletType=bullet_type,
                        leftIndent=20,
                        bulletFontSize=10,  # Fixed size (was: int(10 * self.font_scale))
                        bulletColor=black,
                    )
                    # Transfer data-we ID to list flowable
                    if we_id:
                        list_flowable._we_id = we_id
                    elements.append(list_flowable)
                    elements.append(Spacer(1, 0.08 * inch))
                continue
            
            # Check if paragraph is empty or just whitespace
            if not tag.get_text(strip=True):
                spacer = Spacer(1, 0.15 * inch)
                # Transfer data-we ID even to spacers (empty paragraphs)
                if we_id:
                    spacer._we_id = we_id
                elements.append(spacer)
                continue
            
            # Get paragraph-level alignment from style
            alignment = self._get_alignment(tag)
            
            # Determine base style and font size (SCALING DISABLED)
            if tag.name == 'h1':
                base_style = self.styles['Heading1']
                font_size = 16  # Fixed size (was: int(16 * self.font_scale))
            elif tag.name == 'h2':
                base_style = self.styles['Heading2']
                font_size = 14  # Fixed size (was: int(14 * self.font_scale))
            elif tag.name == 'h3':
                base_style = self.styles['Heading3']
                font_size = 12  # Fixed size (was: int(12 * self.font_scale))
            else:
                base_style = self.styles['BodyText']
                font_size = 10  # Fixed size (was: int(10 * self.font_scale))
            
            # Create custom style with black as default text color
            style = ParagraphStyle(
                'Custom',
                parent=base_style,
                fontSize=font_size,
                leading=font_size * 1.3,  # Tighter line spacing
                spaceBefore=4,  # Reduced spacing
                spaceAfter=4,   # Reduced spacing
                alignment=alignment,
                textColor=black,
            )
            
            # Convert paragraph content to ReportLab markup
            text = self._convert_element_to_markup(tag)
            
            if text.strip():
                try:
                    p = Paragraph(text, style)
                    elements.append(p)
                    elements.append(Spacer(1, 0.06 * inch))  # Reduced spacing between paragraphs
                except Exception as e:
                    print(f"❌ Error creating paragraph: {e}, text: {text[:50]}")
                    continue
                
        return elements
    
    def _get_alignment(self, tag):
        """Extract text alignment from style attribute"""
        style = tag.get('style', '')
        if 'text-align: center' in style or 'text-align:center' in style:
            return TA_CENTER
        elif 'text-align: right' in style or 'text-align:right' in style:
            return TA_RIGHT
        elif 'text-align: justify' in style or 'text-align:justify' in style:
            return TA_JUSTIFY
        return TA_LEFT
    
    def _convert_element_to_markup(self, element):
        """Recursively convert HTML element to ReportLab markup with inline styles"""
        from bs4 import NavigableString
        
        if isinstance(element, NavigableString):
            # Escape special characters for ReportLab and wrap in black font tag
            text = str(element).strip()
            if not text:
                return ""
            text = text.replace('&', '&amp;')
            text = text.replace('<', '&lt;')
            text = text.replace('>', '&gt;')
            # Wrap plain text in font tag with black color
            return f'<font color="#000000">{text}</font>'
        
        result = ""
        
        for child in element.children:
            if isinstance(child, NavigableString):
                # Escape special characters and wrap in black font tag
                text = str(child)
                if not text.strip():
                    # Preserve whitespace
                    result += text
                    continue
                # Preserve leading/trailing whitespace
                leading_space = ' ' if text and text[0].isspace() else ''
                trailing_space = ' ' if text and text[-1].isspace() else ''
                text = text.strip()
                text = text.replace('&', '&amp;')
                text = text.replace('<', '&lt;')
                text = text.replace('>', '&gt;')
                # Wrap plain text in font tag with black color
                result += f'{leading_space}<font color="#000000">{text}</font>{trailing_space}'
            else:
                # Get inline styles
                style_attr = child.get('style', '')
                styles = self._parse_inline_styles(style_attr)
                
                # Start building markup
                markup_start = ""
                markup_end = ""
                
                # Apply font family, size, and color from span styles
                font_attrs = []
                if 'font-family' in styles:
                    font_name = self._map_font_family(styles['font-family'])
                    font_attrs.append(f'face="{font_name}"')
                if 'font-size' in styles:
                    size = self._parse_font_size(styles['font-size'])
                    font_attrs.append(f'size="{size}"')
                # ALWAYS set color - default to black if not specified
                if 'color' in styles:
                    color = styles['color']
                    font_attrs.append(f'color="{color}"')
                else:
                    # Default to black if no color is specified
                    font_attrs.append('color="#000000"')
                
                if font_attrs:
                    markup_start += f'<font {" ".join(font_attrs)}>'
                    markup_end = '</font>' + markup_end
                
                # Apply text formatting tags
                if child.name == 'strong' or child.name == 'b':
                    markup_start += '<b>'
                    markup_end = '</b>' + markup_end
                elif child.name == 'em' or child.name == 'i':
                    markup_start += '<i>'
                    markup_end = '</i>' + markup_end
                elif child.name == 'u':
                    markup_start += '<u>'
                    markup_end = '</u>' + markup_end
                elif child.name == 'strike' or child.name == 's':
                    markup_start += '<strike>'
                    markup_end = '</strike>' + markup_end
                elif child.name == 'sub':
                    markup_start += '<sub>'
                    markup_end = '</sub>' + markup_end
                elif child.name == 'sup':
                    markup_start += '<super>'
                    markup_end = '</super>' + markup_end
                elif child.name == 'mark':
                    # Handle highlight - use background color if available
                    bg_color = styles.get('background-color', '#ffff00')
                    markup_start += f'<font backColor="{bg_color}">'
                    markup_end = '</font>' + markup_end
                elif child.name == 'br':
                    result += '<br/>'
                    continue
                
                # Recursively process children
                child_text = self._convert_element_to_markup(child)
                result += markup_start + child_text + markup_end
        
        return result
    
    def _parse_inline_styles(self, style_attr):
        """Parse inline CSS style attribute into dict"""
        styles = {}
        if not style_attr:
            return styles
        
        for style_rule in style_attr.split(';'):
            if ':' in style_rule:
                prop, value = style_rule.split(':', 1)
                styles[prop.strip()] = value.strip()
        
        return styles
    
    def _map_font_family(self, font_family):
        """Map CSS font families to ReportLab font names"""
        font_family = font_family.lower().strip('\'"')
        
        # Handle font stacks - take the first recognizable font
        fonts = [f.strip().strip('\'"').lower() for f in font_family.split(',')]
        
        for font in fonts:
            if 'courier' in font or 'mono' in font:
                return 'Courier'
            elif 'times' in font or 'serif' in font:
                return 'Times-Roman'
            elif 'helvetica' in font or 'arial' in font or 'sans' in font:
                return 'Helvetica'
        
        # Default to Helvetica for system fonts and SF Pro
        return 'Helvetica'
    
    def _parse_font_size(self, font_size):
        """Convert CSS font size to points with scaling applied"""
        # Remove 'px' and convert to float
        size_str = font_size.replace('px', '').replace('pt', '').strip()
        try:
            original_size = float(size_str)
            # SCALING DISABLED - Return original size scaled down to 85%
            # scaled_size = int((original_size * 0.85) * self.font_scale)
            scaled_size = int(original_size * 0.85)
            return max(8, scaled_size)  # Minimum 8pt font
        except:
            return 10  # Default size (was: int(10 * self.font_scale))




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
        
        # Wrap ALL content in a span with black color to ensure visibility
        html_content = f'<div style="color: #000000;">{html_content}</div>'
        
        # Create PDF buffer
        buffer = BytesIO()
        
        # Create PDF document with custom canvas
        # Margins match the letterhead beige frame (190px top, 105px sides, 140px bottom)
        # Using A4 page size (210mm × 297mm)
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=105,  # 105px from right
            leftMargin=105,   # 105px from left
            topMargin=190,    # 190px from top
            bottomMargin=140, # 140px from bottom
        )
        
        # Convert HTML to PDF elements
        converter = HTML2ReportLabConverter()
        story = converter.html_to_pdf_elements(html_content)
        
        # Build PDF with letterhead drawn BEFORE text (not after)
        doc.build(
            story,
            onFirstPage=draw_letterhead,
            onLaterPages=draw_letterhead
        )
        
        # Get PDF data
        pdf_data = buffer.getvalue()
        buffer.close()
        
        # Create response
        response = HttpResponse(pdf_data, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{subject}.pdf"'
        
        return response
        
    except Exception as e:
        print(f"Error generating PDF: {e}")
        import traceback
        traceback.print_exc()
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
        
        # Wrap ALL content to ensure black text color
        html_content = f'<div style="color: #000000;">{html_content}</div>'
        
        # Generate PDF with letterhead
        # Margins match the letterhead beige frame (190px top, 105px sides, 140px bottom)
        # Using A4 page size (210mm × 297mm)
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=105,  # 105px from right
            leftMargin=105,   # 105px from left
            topMargin=190,    # 190px from top
            bottomMargin=140, # 140px from bottom
        )
        
        converter = HTML2ReportLabConverter()
        story = converter.html_to_pdf_elements(html_content)
        
        # Build PDF with letterhead drawn BEFORE text (not after)
        doc.build(
            story,
            onFirstPage=draw_letterhead,
            onLaterPages=draw_letterhead
        )
        
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


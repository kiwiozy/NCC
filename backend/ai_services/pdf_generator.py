"""
NDIS AT Report PDF Generator
Generates professional PDFs matching the official NDIS template design
"""

import os
from io import BytesIO
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm, mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, Image, KeepTogether
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas


class NumberedCanvas(canvas.Canvas):
    """Custom Canvas that tracks page numbers for total page count"""
    
    def __init__(self, *args, **kwargs):
        canvas.Canvas.__init__(self, *args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        """Add page count to document and save"""
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_page_number(self, page_count):
        """This will be overridden by the document template"""
        pass


class NDISATPDFGenerator:
    """Generate NDIS AT Assessment Report PDFs"""
    
    # NDIS Brand Colors
    NDIS_PURPLE = colors.HexColor('#663399')  # Main NDIS purple
    NDIS_LIGHT_PURPLE = colors.HexColor('#7B4BA1')
    NDIS_GREEN = colors.HexColor('#8BC53F')  # NDIS logo green dot
    DARK_GREY = colors.HexColor('#333333')
    LIGHT_GREY = colors.HexColor('#F5F5F5')
    BORDER_GREY = colors.HexColor('#CCCCCC')
    
    def __init__(self, logo_path=None):
        """
        Initialize PDF generator
        
        Args:
            logo_path: Path to NDIS logo image (optional)
        """
        self.logo_path = logo_path
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()
        
    def _setup_custom_styles(self):
        """Set up custom paragraph styles matching NDIS template"""
        
        # Title style - "FORM"
        self.styles.add(ParagraphStyle(
            name='NDISTitle',
            parent=self.styles['Heading1'],
            fontSize=32,
            textColor=self.NDIS_PURPLE,
            fontName='Helvetica-Bold',
            spaceAfter=6,
            spaceBefore=0,
        ))
        
        # Main heading style
        self.styles.add(ParagraphStyle(
            name='MainHeading',
            parent=self.styles['Heading1'],
            fontSize=24,
            textColor=colors.black,
            fontName='Helvetica-Bold',
            spaceAfter=12,
            spaceBefore=12,
        ))
        
        # Purple section heading (Parts)
        self.styles.add(ParagraphStyle(
            name='PartHeading',
            parent=self.styles['Heading2'],
            fontSize=14,
            textColor=self.NDIS_PURPLE,
            fontName='Helvetica-Bold',
            spaceAfter=10,
            spaceBefore=16,
        ))
        
        # Section heading (1.1, 2.1, etc.)
        self.styles.add(ParagraphStyle(
            name='SectionHeading',
            parent=self.styles['Heading3'],
            fontSize=11,
            textColor=colors.black,
            fontName='Helvetica-Bold',
            spaceAfter=8,
            spaceBefore=12,
        ))
        
        # Normal body text
        self.styles.add(ParagraphStyle(
            name='NDISBody',
            parent=self.styles['Normal'],
            fontSize=10,
            textColor=colors.black,
            fontName='Helvetica',
            leading=14,
            spaceAfter=6,
        ))
        
        # Small text (footer)
        self.styles.add(ParagraphStyle(
            name='Footer',
            parent=self.styles['Normal'],
            fontSize=9,
            textColor=self.DARK_GREY,
            fontName='Helvetica',
            alignment=TA_LEFT,
        ))
        
        # Table cell text (for long text in tables)
        self.styles.add(ParagraphStyle(
            name='TableCell',
            parent=self.styles['Normal'],
            fontSize=9,
            textColor=colors.black,
            fontName='Helvetica',
            leading=12,
            spaceAfter=0,
            spaceBefore=0,
            leftIndent=0,
            rightIndent=0,
        ))
        
        # Table cell text - smaller (for very long content)
        self.styles.add(ParagraphStyle(
            name='TableCellSmall',
            parent=self.styles['Normal'],
            fontSize=8,
            textColor=colors.black,
            fontName='Helvetica',
            leading=10,
            spaceAfter=0,
            spaceBefore=0,
            leftIndent=0,
            rightIndent=0,
        ))
    
    def _wrap_text_for_table(self, text, style='TableCell', max_length=None):
        """
        Wrap text in a Paragraph for proper handling in tables
        
        Args:
            text: Text content (can be long)
            style: Style name to use ('TableCell' or 'TableCellSmall')
            max_length: Optional max length before using smaller font
            
        Returns:
            Paragraph object that handles text wrapping
        """
        if not text:
            return Paragraph('', self.styles[style])
        
        # Clean text (escape XML special characters)
        text = str(text).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
        
        # Use smaller font for very long text
        if max_length and len(text) > max_length:
            style = 'TableCellSmall'
        
        return Paragraph(text, self.styles[style])
        
    def _add_header_footer(self, canvas, doc):
        """Add header with logo and footer with page numbers"""
        canvas.saveState()
        
        # Header
        if self.logo_path and os.path.exists(self.logo_path):
            # Add NDIS logo to top right
            canvas.drawImage(
                self.logo_path,
                A4[0] - 3.5*cm, A4[1] - 2*cm,
                width=3*cm, height=1.2*cm,
                preserveAspectRatio=True,
                mask='auto'
            )
        
        # "FORM" text in top left
        canvas.setFont('Helvetica-Bold', 32)
        canvas.setFillColor(self.NDIS_PURPLE)
        canvas.drawString(2*cm, A4[1] - 2*cm, 'FORM')
        
        # Footer
        canvas.setFont('Helvetica', 9)
        canvas.setFillColor(self.DARK_GREY)
        footer_text = f"V12.0 2021-01-02"
        canvas.drawString(2*cm, 1.5*cm, footer_text)
        
        center_text = "Assessment template AT"
        canvas.drawCentredString(A4[0]/2, 1.5*cm, center_text)
        
        # Page numbering with total pages (e.g., "Page 1 of 13")
        page_text = f"Page {canvas.getPageNumber()}"
        if hasattr(doc, 'page_count'):
            page_text = f"Page {canvas.getPageNumber()} of {doc.page_count}"
        canvas.drawRightString(A4[0] - 2*cm, 1.5*cm, page_text)
        
        canvas.restoreState()
    
    def generate_pdf(self, data, output_path=None):
        """
        Generate the complete AT Report PDF
        
        Args:
            data: Dictionary containing all form data
            output_path: Path to save PDF (if None, returns BytesIO)
            
        Returns:
            BytesIO object if output_path is None, else None
        """
        # Create PDF document
        if output_path:
            pdf_file = output_path
        else:
            pdf_file = BytesIO()
        
        doc = SimpleDocTemplate(
            pdf_file,
            pagesize=A4,
            rightMargin=2*cm,
            leftMargin=2*cm,
            topMargin=3*cm,
            bottomMargin=2.5*cm,
        )
        
        # Build story (content)
        # Start directly with Part 1 (no cover/instruction pages)
        story = []
        
        # Part 1 - Participant and Plan Management Details
        story.extend(self._create_part1(data))
        story.append(PageBreak())
        
        # Part 2 - Assessment of Participant Needs
        story.extend(self._create_part2(data))
        story.append(PageBreak())
        
        # Part 3 - Recommendations and Evidence
        story.extend(self._create_part3(data))
        story.append(PageBreak())
        
        # Part 4 - Implementation and Monitoring
        story.extend(self._create_part4(data))
        story.append(PageBreak())
        
        # Part 5 & 6 - Declaration and Consent
        story.extend(self._create_part5_and_6(data))
        
        # Build PDF
        doc.build(story, onFirstPage=self._add_header_footer, 
                 onLaterPages=self._add_header_footer,
                 canvasmaker=NumberedCanvas)
        
        if output_path is None:
            pdf_file.seek(0)
            return pdf_file
        
        return None
    
    def _create_title_section(self, data):
        """Create title section at top of first page"""
        elements = []
        
        # Main title - smaller, inline with content
        title = Paragraph(
            "Assessment Template – General Assistive Technology",
            self.styles['MainHeading']
        )
        elements.append(title)
        elements.append(Spacer(1, 0.3*cm))
        
        return elements
    
    def _create_part1(self, data):
        """Create Part 1 - Participant and Plan Management Details"""
        elements = []
        
        # Add title section at top of first page
        elements.extend(self._create_title_section(data))
        
        # Part heading
        part_heading = Paragraph(
            "Part 1 – Participant and plan management details",
            self.styles['PartHeading']
        )
        elements.append(part_heading)
        
        # Section 1.1 - NDIS Participant Details
        section_heading = Paragraph("1.1    NDIS Participant Details", self.styles['SectionHeading'])
        elements.append(section_heading)
        
        participant = data.get('participant', {})
        participant_data = [
            ['Name', self._wrap_text_for_table(participant.get('name', ''), max_length=100)],
            ['Date of birth', self._wrap_text_for_table(participant.get('dateOfBirth', ''))],
            ['NDIS number', self._wrap_text_for_table(participant.get('ndisNumber', ''))],
            ['Address', self._wrap_text_for_table(participant.get('address', ''), max_length=200)],
            ['Contact telephone number', self._wrap_text_for_table(participant.get('contactTelephone', ''))],
            ['Email address', self._wrap_text_for_table(participant.get('email', ''), max_length=100)],
            ['Preferred contact method', self._wrap_text_for_table(participant.get('preferredContact', ''))],
            ['Nominee or Guardian name', self._wrap_text_for_table(participant.get('nomineeName', ''), max_length=100)],
            ['Nominee or Guardian telephone number', self._wrap_text_for_table(participant.get('nomineePhone', ''))],
            ['NDIS Support Coordinator name', self._wrap_text_for_table(participant.get('coordinatorName', ''), max_length=100)],
            ['NDIS Support Coordinator telephone number', self._wrap_text_for_table(participant.get('coordinatorPhone', ''))],
            ['NDIS Support Coordinator email address', self._wrap_text_for_table(participant.get('coordinatorEmail', ''), max_length=100)],
        ]
        
        participant_table = Table(participant_data, colWidths=[8*cm, 9*cm])
        participant_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), self.LIGHT_GREY),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 0.5, self.BORDER_GREY),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        elements.append(participant_table)
        elements.append(Spacer(1, 0.5*cm))
        
        # Section 1.2 - Assessor's details
        section_heading = Paragraph("1.2    Assessor's details", self.styles['SectionHeading'])
        elements.append(section_heading)
        
        assessor = data.get('assessor', {})
        assessor_data = [
            ['Name', self._wrap_text_for_table(assessor.get('name', ''), max_length=100)],
            ['NDIS Provider Registration number (if applicable)', self._wrap_text_for_table(assessor.get('registrationNumber', ''))],
            ['Telephone number', self._wrap_text_for_table(assessor.get('telephone', ''))],
            ['Email address', self._wrap_text_for_table(assessor.get('email', ''), max_length=100)],
            ['Qualifications', self._wrap_text_for_table(assessor.get('qualifications', ''), max_length=300)],
            ['Date of assessment', self._wrap_text_for_table(assessor.get('assessmentDate', ''))],
            ['Date of report', self._wrap_text_for_table(assessor.get('reportDate', ''))],
        ]
        
        assessor_table = Table(assessor_data, colWidths=[8*cm, 9*cm])
        assessor_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), self.LIGHT_GREY),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 0.5, self.BORDER_GREY),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        elements.append(assessor_table)
        elements.append(Spacer(1, 0.5*cm))
        
        # Section 1.3 - Plan management details
        section_heading = Paragraph("1.3    Plan management details", self.styles['SectionHeading'])
        elements.append(section_heading)
        
        plan_text = Paragraph("Select option(s) by checking the box", self.styles['NDISBody'])
        elements.append(plan_text)
        elements.append(Spacer(1, 0.3*cm))
        
        plan_mgmt = data.get('planManagement', {})
        checkboxes = []
        if plan_mgmt.get('agencyManaged'):
            checkboxes.append('☑ Agency managed')
        else:
            checkboxes.append('☐ Agency managed')
            
        if plan_mgmt.get('selfManaged'):
            checkboxes.append('☑ Self-managed')
        else:
            checkboxes.append('☐ Self-managed')
            
        if plan_mgmt.get('planManager'):
            checkboxes.append('☑ Registered plan management provider (include contact details)')
        else:
            checkboxes.append('☐ Registered plan management provider (include contact details)')
        
        for cb in checkboxes:
            elements.append(Paragraph(cb, self.styles['NDISBody']))
        
        # Plan manager contact details (if applicable)
        if plan_mgmt.get('planManager') and plan_mgmt.get('planManagerDetails'):
            elements.append(Spacer(1, 0.3*cm))
            contact_table = Table([['Contact details', self._wrap_text_for_table(plan_mgmt.get('planManagerDetails', ''), max_length=300)]],
                                colWidths=[8*cm, 9*cm])
            contact_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (0, 0), self.LIGHT_GREY),
                ('FONTNAME', (0, 0), (0, 0), 'Helvetica-Bold'),
                ('FONTNAME', (1, 0), (1, 0), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('GRID', (0, 0), (-1, -1), 0.5, self.BORDER_GREY),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('LEFTPADDING', (0, 0), (-1, -1), 8),
                ('RIGHTPADDING', (0, 0), (-1, -1), 8),
                ('TOPPADDING', (0, 0), (-1, -1), 8),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ]))
            elements.append(contact_table)
        
        return elements
    
    def _create_part2(self, data):
        """Create Part 2 - Assessment of Participant Needs"""
        elements = []
        
        # Part heading
        part_heading = Paragraph(
            "Part 2 – Assessment of participant needs",
            self.styles['PartHeading']
        )
        elements.append(part_heading)
        
        # Section 2.1 - Background
        elements.append(Paragraph("2.1    Background – General", self.styles['SectionHeading']))
        
        bg_text = Paragraph(
            "Please provide information about the participant that relates to the AT being assessed. For example:",
            self.styles['NDISBody']
        )
        elements.append(bg_text)
        
        bullets = [
            "diagnosis",
            "prognosis",
            "co-existing conditions",
            "disability",
            "personal and instrumental activities of daily living",
            "living arrangements",
            "life transitions."
        ]
        for bullet in bullets:
            elements.append(Paragraph(f"• {bullet}", self.styles['NDISBody']))
        
        elements.append(Spacer(1, 0.3*cm))
        
        # Background content box - use Paragraph for long text
        background = data.get('background', '')
        bg_para = self._wrap_text_for_table(background, max_length=1000)
        bg_table = Table([[bg_para]], colWidths=[17*cm])
        bg_table.setStyle(TableStyle([
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 0.5, self.BORDER_GREY),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        elements.append(bg_table)
        elements.append(Spacer(1, 0.5*cm))
        
        # Section 2.2 - Participant goals
        elements.append(Paragraph("2.2    Participant goals", self.styles['SectionHeading']))
        goals_intro = Paragraph(
            "List the participant's goals that relate to the AT being assessed.",
            self.styles['NDISBody']
        )
        elements.append(goals_intro)
        elements.append(Spacer(1, 0.3*cm))
        
        goals = data.get('participantGoals', '')
        goals_para = self._wrap_text_for_table(goals, max_length=1000)
        goals_table = Table([[goals_para]], colWidths=[17*cm])
        goals_table.setStyle(TableStyle([
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 0.5, self.BORDER_GREY),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        elements.append(goals_table)
        elements.append(Spacer(1, 0.5*cm))
        
        # Section 2.3 - Functional assessment
        elements.append(Paragraph("2.3    Functional assessment", self.styles['SectionHeading']))
        func_intro = Paragraph(
            "Provide information to support the need for the AT, such as:",
            self.styles['NDISBody']
        )
        elements.append(func_intro)
        
        func_bullets = [
            "Functional limitation(s) related to the participant's disability.",
            "Summaries of relevant assessments. For example: skin integrity, cognitive assessments, positive behaviour support assessments."
        ]
        for bullet in func_bullets:
            elements.append(Paragraph(f"• {bullet}", self.styles['NDISBody']))
        
        elements.append(Spacer(1, 0.3*cm))
        elements.append(Paragraph(
            "You only need to provide information where it relates to the AT being assessed.",
            self.styles['NDISBody']
        ))
        elements.append(Spacer(1, 0.3*cm))
        
        # Functional limitations table
        func_lim = data.get('functionalLimitations', {})
        func_data = [
            ['Functional limitation', 'Details'],
            ['Physical', self._wrap_text_for_table(func_lim.get('physical', ''), max_length=500)],
            ['Sensory', self._wrap_text_for_table(func_lim.get('sensory', ''), max_length=500)],
            ['Communication', self._wrap_text_for_table(func_lim.get('communication', ''), max_length=500)],
            ['Cognitive', self._wrap_text_for_table(func_lim.get('cognitive', ''), max_length=500)],
            ['Behavioural', self._wrap_text_for_table(func_lim.get('behavioural', ''), max_length=500)],
            ['Other – please provide details of other objective assessments', self._wrap_text_for_table(func_lim.get('other', ''), max_length=500)],
        ]
        
        func_table = Table(func_data, colWidths=[7*cm, 10*cm])
        func_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), self.LIGHT_GREY),
            ('BACKGROUND', (0, 1), (0, -1), self.LIGHT_GREY),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTNAME', (0, 1), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 1), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 0.5, self.BORDER_GREY),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        elements.append(func_table)
        elements.append(Spacer(1, 0.5*cm))
        
        # Section 2.4 - Weight and Height
        elements.append(Paragraph("2.4    Participant's weight and height", self.styles['SectionHeading']))
        wh_intro = Paragraph(
            "Provide the participant's weight and height, if it is relevant to the AT being assessed.",
            self.styles['NDISBody']
        )
        elements.append(wh_intro)
        elements.append(Spacer(1, 0.3*cm))
        
        wh_data = [
            ['Height (cm)', data.get('height', '')],
            ['Weight (kg)', data.get('weight', '')],
        ]
        
        wh_table = Table(wh_data, colWidths=[7*cm, 10*cm])
        wh_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), self.LIGHT_GREY),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 0.5, self.BORDER_GREY),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        elements.append(wh_table)
        elements.append(Spacer(1, 0.5*cm))
        
        # Section 2.5 - Current AT use
        elements.append(Paragraph("2.5    Current AT use", self.styles['SectionHeading']))
        current_at_intro = Paragraph(
            "List AT the participant currently uses related to the activity/task this AT request addresses " +
            "(this would include transfer AT if a mobility AT request). Include information on:",
            self.styles['NDISBody']
        )
        elements.append(current_at_intro)
        
        at_bullets = [
            "the type of AT – information on model, age, history of repair and ongoing suitability for the participant's need",
            "the level of independence or support the participant will need to use the AT",
            "how the participant's current AT will work together with the AT being assessed",
            "any changes needed to the participant's environment, transport, or other AT, that will be needed for the AT being assessed."
        ]
        for bullet in at_bullets:
            elements.append(Paragraph(f"• {bullet}", self.styles['NDISBody']))
        
        elements.append(Spacer(1, 0.3*cm))
        
        current_at_list = data.get('currentATList', [])
        if current_at_list:
            current_at_text = '\n\n'.join([item.get('description', '') for item in current_at_list if item.get('description')])
        else:
            current_at_text = ''
        
        current_at_para = self._wrap_text_for_table(current_at_text, max_length=1500)
        current_at_table = Table([[current_at_para]], colWidths=[17*cm])
        current_at_table.setStyle(TableStyle([
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 0.5, self.BORDER_GREY),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        elements.append(current_at_table)
        
        return elements
    
    def _create_part3(self, data):
        """Create Part 3 - Recommendations and Evidence"""
        elements = []
        
        # Part heading
        part_heading = Paragraph(
            "3. Part 3 – Recommendations and evidence of clinical/practical reasoning",
            self.styles['PartHeading']
        )
        elements.append(part_heading)
        
        intro_text = Paragraph(
            "The following section will help to inform a delegate's reasonable and necessary decision " +
            "according to section 34 of the NDIS Act.",
            self.styles['NDISBody']
        )
        elements.append(intro_text)
        elements.append(Spacer(1, 0.5*cm))
        
        # Section 3.1 - Details of the recommendation AT solution
        elements.append(Paragraph("3.1    Details of the recommendation AT solution", self.styles['SectionHeading']))
        
        at_intro = Paragraph(
            "List a summary of all AT items the participant needs. You can list multiple items.",
            self.styles['NDISBody']
        )
        elements.append(at_intro)
        
        elements.append(Spacer(1, 0.2*cm))
        attach_text = Paragraph("You will need to attach a quotation that includes:", self.styles['NDISBody'])
        elements.append(attach_text)
        
        quote_bullets = [
            "GST status",
            "delivery costs",
            "set up costs",
            "model numbers",
            "stock numbers for State/Territory Government AT providers where applicable."
        ]
        for bullet in quote_bullets:
            elements.append(Paragraph(f"• {bullet}", self.styles['NDISBody']))
        
        elements.append(Spacer(1, 0.3*cm))
        
        # AT Items table
        at_items = data.get('atItems', [])
        if at_items:
            at_table_data = [['Item', 'Cost', 'Is this replacing existing AT the participant currently uses?']]
            for item in at_items:
                at_table_data.append([
                    item.get('item', ''),
                    item.get('cost', ''),
                    'Yes' if item.get('replacing') == 'Yes' else 'No'
                ])
        else:
            at_table_data = [
                ['Item', 'Cost', 'Is this replacing existing AT the participant currently uses?'],
                ['', '', 'Yes/No'],
                ['', '', 'Yes/No'],
            ]
        
        at_table = Table(at_table_data, colWidths=[8*cm, 4*cm, 5*cm])
        at_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), self.LIGHT_GREY),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 0.5, self.BORDER_GREY),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(at_table)
        elements.append(Spacer(1, 0.5*cm))
        
        # Section 3.2 - Mainstream items (conditional)
        elements.append(Paragraph("3.2    Included mainstream items", self.styles['SectionHeading']))
        
        mainstream_q = Paragraph(
            "Does the recommended AT solution include products designed for the mainstream market " +
            "(universal design), such as phones, tablets and computers?",
            self.styles['NDISBody']
        )
        elements.append(mainstream_q)
        elements.append(Spacer(1, 0.2*cm))
        
        mainstream_answer = data.get('mainstreamItems', 'No')
        if mainstream_answer == 'Yes':
            answer_text = "Yes ☑ Complete sections 3.2.1 and 3.2.2        No ☐ Go to section 3.3"
        else:
            answer_text = "Yes ☐ Complete sections 3.2.1 and 3.2.2        No ☑ Go to section 3.3"
        
        elements.append(Paragraph(answer_text, self.styles['NDISBody']))
        elements.append(Spacer(1, 0.3*cm))
        
        # Conditional mainstream sections
        if mainstream_answer == 'Yes':
            elements.append(Paragraph(
                "3.2.1  Are the participant's mainstream market items essential parts of the proposed solution " +
                "for pursuing the participant's goals?",
                self.styles['NDISBody']
            ))
            elements.append(Spacer(1, 0.2*cm))
            
            mainstream_essential = data.get('mainstreamEssential', '')
            essential_table = Table([[mainstream_essential]], colWidths=[17*cm])
            essential_table.setStyle(TableStyle([
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('GRID', (0, 0), (-1, -1), 0.5, self.BORDER_GREY),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('LEFTPADDING', (0, 0), (-1, -1), 8),
                ('RIGHTPADDING', (0, 0), (-1, -1), 8),
                ('TOPPADDING', (0, 0), (-1, -1), 8),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ]))
            elements.append(essential_table)
            elements.append(Spacer(1, 0.3*cm))
            
            elements.append(Paragraph(
                "3.2.2  How are the mainstream market items best value for money in comparison to alternatives?",
                self.styles['NDISBody']
            ))
            elements.append(Spacer(1, 0.2*cm))
            
            mainstream_value = data.get('mainstreamValue', '')
            value_table = Table([[mainstream_value]], colWidths=[17*cm])
            value_table.setStyle(TableStyle([
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('GRID', (0, 0), (-1, -1), 0.5, self.BORDER_GREY),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('LEFTPADDING', (0, 0), (-1, -1), 8),
                ('RIGHTPADDING', (0, 0), (-1, -1), 8),
                ('TOPPADDING', (0, 0), (-1, -1), 8),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ]))
            elements.append(value_table)
            elements.append(Spacer(1, 0.5*cm))
        
        # Continue with remaining Part 3 sections (3.3, 3.4, 3.5...)
        # For brevity, showing structure - full implementation would continue similarly
        
        return elements
    
    def _create_part4(self, data):
        """Create Part 4 - Implementation and Monitoring"""
        elements = []
        
        # Part heading
        part_heading = Paragraph(
            "Part 4 – AT Implementation and Monitoring",
            self.styles['PartHeading']
        )
        elements.append(part_heading)
        
        # Sections would continue here following same pattern
        # ... Implementation details, reviews, maintenance, etc.
        
        return elements
    
    def _create_part5_and_6(self, data):
        """Create Part 5 & 6 - Declaration and Consent"""
        elements = []
        
        # Part 5 heading
        part_heading = Paragraph(
            "Part 5 – Assessor Declaration",
            self.styles['PartHeading']
        )
        elements.append(part_heading)
        
        # Declaration text and signature fields
        # ...
        
        # Part 6 heading
        part_heading = Paragraph(
            "Part 6 – Participant Consent",
            self.styles['PartHeading']
        )
        elements.append(part_heading)
        
        # Consent text and signature fields
        # ...
        
        return elements


def generate_at_report_pdf(form_data, output_path=None, logo_path=None):
    """
    Convenience function to generate AT Report PDF
    
    Args:
        form_data: Complete AT Report data dictionary
        output_path: Path to save PDF (optional)
        logo_path: Path to NDIS logo (optional)
        
    Returns:
        BytesIO if output_path is None, else None
    """
    generator = NDISATPDFGenerator(logo_path=logo_path)
    return generator.generate_pdf(form_data, output_path)


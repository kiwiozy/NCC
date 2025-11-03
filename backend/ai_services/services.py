import os
import json
from openai import OpenAI
from pypdf import PdfReader
from io import BytesIO


class OpenAIService:
    """Service for interacting with OpenAI API"""
    
    def __init__(self):
        self.api_key = os.getenv('OPENAI_API_KEY')
        if not self.api_key or self.api_key == 'your-openai-api-key-here':
            raise ValueError("OPENAI_API_KEY must be set in environment variables")
        
        self.client = OpenAI(api_key=self.api_key)
        self.model = "gpt-4o-mini"  # Using the latest, most cost-effective model
    
    def rewrite_clinical_notes(self, content: str, custom_prompt: str = None) -> str:
        """
        Rewrite text as professional clinical notes
        
        Args:
            content: The original note content
            custom_prompt: Optional custom instructions for refinement
            
        Returns:
            Rewritten clinical notes
        """
        system_message = """You are a professional medical scribe specializing in podiatry and orthotic clinical documentation.
Your task is to improve the clinical tone and language of medical letters while preserving the EXACT original structure and format.

CRITICAL RULES:
1. PRESERVE the original letter structure - do NOT reorganize into sections like "Subjective/Objective/Assessment"
2. Keep the same paragraphs, line breaks, and overall layout
3. Maintain the original salutation, greeting, and closing format
4. Use proper medical terminology where appropriate
5. Improve clinical language and professionalism
6. Be more concise if requested, but keep the same paragraph structure
7. Do NOT add new sections, headers, or reorganize the content
8. Only refine the wording to be more clinical/professional

The output should read like an improved version of the same letter, not a restructured document."""

        if custom_prompt:
            user_message = f"""Original letter content:
{content}

Additional instructions: {custom_prompt}

Please improve the clinical tone and language while preserving the EXACT original structure, format, paragraphs, and layout. Do not reorganize or add new sections."""
        else:
            user_message = f"""Original letter content:
{content}

Please improve the clinical tone and language while preserving the EXACT original structure, format, paragraphs, and layout. Make it more professional and clinically appropriate without changing the organization."""

        try:
            import logging
            import time
            logger = logging.getLogger(__name__)
            
            logger.info(f'🌐 Calling OpenAI API - Model: {self.model}, Message length: {len(user_message)} chars')
            api_start = time.time()
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_message},
                    {"role": "user", "content": user_message}
                ],
                temperature=0.7,
                max_tokens=4000  # Increased from 1000 to handle longer content
            )
            
            api_duration = time.time() - api_start
            logger.info(f'⏱️ OpenAI API response received in {api_duration:.2f}s')
            
            result = response.choices[0].message.content.strip()
            logger.info(f'✅ OpenAI result length: {len(result)} chars')
            logger.debug(f'📝 Result preview: {result[:200]}...')
            
            return result
            
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f'❌ OpenAI API error: {str(e)}', exc_info=True)
            raise Exception(f"OpenAI API error: {str(e)}")
    
    def extract_text_from_pdf(self, pdf_file) -> str:
        """
        Extract text content from a PDF file
        
        Args:
            pdf_file: File object or bytes
            
        Returns:
            Extracted text content
        """
        try:
            # Handle both file objects and bytes
            if hasattr(pdf_file, 'read'):
                pdf_bytes = BytesIO(pdf_file.read())
            else:
                pdf_bytes = BytesIO(pdf_file)
            
            # Extract text from PDF
            reader = PdfReader(pdf_bytes)
            text_content = []
            
            for page_num, page in enumerate(reader.pages, 1):
                page_text = page.extract_text()
                if page_text.strip():
                    text_content.append(f"--- Page {page_num} ---\n{page_text}")
            
            return "\n\n".join(text_content)
            
        except Exception as e:
            raise Exception(f"PDF extraction error: {str(e)}")
    
    def extract_at_report_data(self, pdf_text: str, report_type: str = "general") -> dict:
        """
        Extract structured AT Report data from PDF text using AI
        
        Args:
            pdf_text: Extracted text from PDF
            report_type: "general" or "prosthetics_orthotics"
            
        Returns:
            Dictionary of extracted form fields
        """
        # Determine fields based on report type
        if report_type == "prosthetics_orthotics":
            fields_template = self._get_po_fields_template()
            system_message = self._get_po_extraction_prompt()
        else:
            fields_template = self._get_general_fields_template()
            system_message = self._get_general_extraction_prompt()
        
        user_message = f"""PDF Text Content:
{pdf_text}

Please extract the information from this AT report and return it in the following JSON format:
{json.dumps(fields_template, indent=2)}

Important:
- Extract only information that is clearly present in the document
- Use empty string "" for fields that are not found
- Preserve exact values where possible (names, numbers, dates)
- For dates, use YYYY-MM-DD format
- For currency, include only the number without $ or commas
"""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_message},
                    {"role": "user", "content": user_message}
                ],
                temperature=0.3,  # Lower temperature for more accurate extraction
                max_tokens=2000,
                response_format={"type": "json_object"}
            )
            
            result = response.choices[0].message.content.strip()
            return json.loads(result)
            
        except Exception as e:
            raise Exception(f"OpenAI extraction error: {str(e)}")
    
    def _get_general_fields_template(self) -> dict:
        """Get template for general AT reports"""
        return {
            "participant_name": "",
            "ndis_number": "",
            "date_of_birth": "",
            "address": "",
            "contact_telephone": "",
            "email": "",
            "nominee_name": "",
            "nominee_phone": "",
            "coordinator_email": "",
            "assessor_name": "",
            "assessor_qualifications": "",
            "assessor_telephone": "",
            "assessor_email": "",
            "assessor_registration_number": "",
            "assessment_date": "",
            "report_date": "",
            "background": "",
            "participant_goals": "",
            "height": "",
            "weight": "",
            "physical_limitations": "",
            "sensory_limitations": "",
            "communication_limitations": "",
            "cognitive_limitations": "",
            "behavioural_limitations": "",
            "other_limitations": ""
        }
    
    def _get_po_fields_template(self) -> dict:
        """Get template for Prosthetics & Orthotics AT reports (based on mapping guide)"""
        return {
            # Part 1 - Details
            "participant_name": "",
            "ndis_number": "",
            "date_of_birth": "",
            "address": "",
            "contact_telephone": "",
            "email": "",
            "preferred_contact": "",
            "nominee_name": "",
            "nominee_phone": "",
            "coordinator_name": "",
            "coordinator_phone": "",
            "coordinator_email": "",
            "assessor_name": "",
            "assessor_qualifications": "",
            "assessor_position": "",
            "assessor_telephone": "",
            "assessor_email": "",
            "assessor_registration_number": "",
            "company_name": "",
            "assessment_date": "",
            "report_date": "",
            "plan_managed_agency": False,
            "plan_managed_self": False,
            "plan_managed_plan_manager": False,
            
            # Part 2 - Goals & Assessment Request
            "background": "",
            "participant_goals": "",
            
            # Part 3 - Evaluation/Assessment
            "height": "",
            "weight": "",
            "gait_assessment": "",
            "physical_limitations": "",
            "sensory_limitations": "",
            "communication_limitations": "",
            "cognitive_limitations": "",
            "behavioural_limitations": "",
            "other_limitations": "",
            "current_at_description": "",
            "current_at_usage": "",
            "current_at_suitability": "",
            
            # Part 4 - Options
            "alternative_options_description": "",
            "alternative_options_trialled": "",
            "alternative_options_reasons_not_suitable": "",
            
            # Part 5 - Recommendation
            "recommended_device": "",
            "device_cost": "",
            "clinical_justification": "",
            "additional_factors": "",
            "expected_outcomes": "",
            "review_frequency": "",
            "ongoing_repairs_cost": "",
            "ongoing_repairs_frequency": "",
            
            # Part 6 - P&O Specification
            "provision_timeframe": "",
            "quote_total": "",
            "quote_provider": "",
            "quote_date": "",
            "maintenance_info": ""
        }
    
    def _get_general_extraction_prompt(self) -> str:
        """Get system prompt for general AT report extraction"""
        return """You are an expert at extracting structured data from NDIS Assistive Technology (AT) assessment reports.

Your task is to carefully read the AT report and extract the requested information into a JSON format.

Guidelines:
1. Extract information exactly as it appears in the document
2. For dates, convert to YYYY-MM-DD format (e.g., "2/7/2018" becomes "2018-07-02")
3. For multi-line text fields (background, goals, limitations), preserve the full text content
4. Use empty string "" for any fields not found in the document
5. Be thorough - look for information across all pages
6. Do not invent or infer information that is not explicitly stated"""
    
    def _get_po_extraction_prompt(self) -> str:
        """Get system prompt for P&O AT report extraction"""
        return """You are an expert at extracting structured data from NDIS Prosthetics & Orthotics (P&O) Assistive Technology assessment reports.

Your task is to carefully read the P&O AT report and extract the requested information into a JSON format.

Guidelines:
1. Extract information exactly as it appears in the document
2. For dates, convert to YYYY-MM-DD format (e.g., "2/7/2018" becomes "2018-07-02")
3. For currency amounts, extract only the number (e.g., "$5,850.00" becomes "5850.00")
4. For multi-line text fields (background, goals, clinical justification), preserve the full text content
5. Use empty string "" for any fields not found in the document
6. For boolean fields (plan management), use true if the option is checked/indicated
7. Be thorough - look for information across all pages including quote attachments
8. Pay special attention to:
   - Clinical assessment details (gait, mobility, measurements)
   - Device specifications and features
   - Quote information and costs
   - Ongoing maintenance requirements
9. Do not invent or infer information that is not explicitly stated"""


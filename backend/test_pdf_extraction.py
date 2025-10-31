#!/usr/bin/env python3
"""
Test script for PDF extraction and AI mapping
Tests the complete flow: PDF -> Text -> AI Extraction -> Structured Data
"""

import os
import sys
import json
from pathlib import Path

# Add the backend directory to the path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ncc_api.settings')
import django
django.setup()

from ai_services.services import OpenAIService


def test_pdf_extraction():
    """Test PDF extraction with Scott.pdf"""
    
    # Path to Scott.pdf
    pdf_path = backend_dir.parent / 'docs' / 'Scott.pdf'
    
    if not pdf_path.exists():
        print(f"❌ Error: Scott.pdf not found at {pdf_path}")
        return False
    
    print(f"📄 Testing PDF extraction with: {pdf_path.name}")
    print("=" * 80)
    
    try:
        # Initialize the service
        service = OpenAIService()
        print(f"✅ OpenAI Service initialized (model: {service.model})")
        
        # Step 1: Extract text from PDF
        print("\n📖 Step 1: Extracting text from PDF...")
        with open(pdf_path, 'rb') as pdf_file:
            extracted_text = service.extract_text_from_pdf(pdf_file)
        
        page_count = extracted_text.count('--- Page')
        print(f"✅ Extracted text from {page_count} pages")
        print(f"   Total characters: {len(extracted_text)}")
        
        # Show a preview of extracted text
        preview = extracted_text[:500]
        print(f"\n📝 Text Preview (first 500 chars):")
        print("-" * 80)
        print(preview)
        print("-" * 80)
        
        # Step 2: Extract structured data using AI (P&O format)
        print("\n🤖 Step 2: Extracting structured data with AI (P&O format)...")
        extracted_data = service.extract_at_report_data(extracted_text, report_type='prosthetics_orthotics')
        
        print(f"✅ Successfully extracted structured data")
        print(f"   Fields extracted: {len(extracted_data)}")
        
        # Pretty print the extracted data
        print("\n📊 Extracted Data (JSON):")
        print("=" * 80)
        print(json.dumps(extracted_data, indent=2))
        print("=" * 80)
        
        # Validate key fields
        print("\n✅ Validation:")
        key_fields = {
            'Participant Name': extracted_data.get('participant_name'),
            'NDIS Number': extracted_data.get('ndis_number'),
            'Date of Birth': extracted_data.get('date_of_birth'),
            'Assessor Name': extracted_data.get('assessor_name'),
            'Company Name': extracted_data.get('company_name'),
            'Assessment Date': extracted_data.get('assessment_date'),
        }
        
        for field_name, field_value in key_fields.items():
            status = "✅" if field_value else "⚠️"
            print(f"   {status} {field_name}: {field_value or '(not found)'}")
        
        # Check for multi-line fields
        print("\n📝 Multi-line Field Lengths:")
        multiline_fields = {
            'Background': extracted_data.get('background', ''),
            'Participant Goals': extracted_data.get('participant_goals', ''),
            'Physical Limitations': extracted_data.get('physical_limitations', ''),
        }
        
        for field_name, field_value in multiline_fields.items():
            char_count = len(field_value)
            status = "✅" if char_count > 20 else "⚠️"
            print(f"   {status} {field_name}: {char_count} characters")
        
        print("\n" + "=" * 80)
        print("🎉 PDF Extraction Test COMPLETED SUCCESSFULLY!")
        print("=" * 80)
        
        return True
        
    except Exception as e:
        print(f"\n❌ Error during testing: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == '__main__':
    print("🚀 Starting PDF Extraction Test\n")
    success = test_pdf_extraction()
    sys.exit(0 if success else 1)


#!/usr/bin/env python3
"""
Simple test script for PDF extraction (without Django)
Tests: PDF -> Text extraction using pypdf
"""

import json
from pathlib import Path
from pypdf import PdfReader
from io import BytesIO

def extract_text_from_pdf(pdf_path):
    """Extract text from PDF file"""
    try:
        with open(pdf_path, 'rb') as pdf_file:
            pdf_bytes = BytesIO(pdf_file.read())
            reader = PdfReader(pdf_bytes)
            text_content = []
            
            for page_num, page in enumerate(reader.pages, 1):
                page_text = page.extract_text()
                if page_text.strip():
                    text_content.append(f"--- Page {page_num} ---\n{page_text}")
            
            return "\n\n".join(text_content)
    except Exception as e:
        raise Exception(f"PDF extraction error: {str(e)}")


def main():
    """Test PDF extraction with Scott.pdf"""
    
    # Path to Scott.pdf
    pdf_path = Path(__file__).parent.parent / 'docs' / 'Scott.pdf'
    
    if not pdf_path.exists():
        print(f"❌ Error: Scott.pdf not found at {pdf_path}")
        return False
    
    print(f"📄 Testing PDF extraction with: {pdf_path.name}")
    print("=" * 80)
    
    try:
        # Extract text from PDF
        print("\n📖 Extracting text from PDF...")
        extracted_text = extract_text_from_pdf(pdf_path)
        
        page_count = extracted_text.count('--- Page')
        print(f"✅ Extracted text from {page_count} pages")
        print(f"   Total characters: {len(extracted_text)}")
        
        # Show a preview of extracted text
        preview_length = 1000
        preview = extracted_text[:preview_length]
        print(f"\n📝 Text Preview (first {preview_length} chars):")
        print("-" * 80)
        print(preview)
        print("-" * 80)
        
        # Show last 500 chars
        print(f"\n📝 Text Preview (last 500 chars):")
        print("-" * 80)
        print(extracted_text[-500:])
        print("-" * 80)
        
        # Look for key information
        print("\n🔍 Searching for key information:")
        
        searches = [
            ('Scott Laird', 'Participant Name'),
            ('430372789', 'NDIS Number'),
            ('Jonathan Madden', 'Assessor Name'),
            ('Walk Easy', 'Company Name'),
            ('Cockayne Syndrome', 'Condition'),
            ('$5,850', 'Device Cost'),
            ('custom orthoses', 'Device Type'),
        ]
        
        for search_term, label in searches:
            found = search_term in extracted_text
            status = "✅" if found else "⚠️"
            print(f"   {status} {label}: {'Found' if found else 'Not found'}")
        
        # Save extracted text to file for inspection
        output_path = Path(__file__).parent / 'scott_extracted_text.txt'
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(extracted_text)
        
        print(f"\n💾 Full extracted text saved to: {output_path.name}")
        
        print("\n" + "=" * 80)
        print("🎉 PDF Text Extraction Test COMPLETED SUCCESSFULLY!")
        print("=" * 80)
        print("\nℹ️  Next step: The extracted text will be sent to OpenAI for structured extraction")
        print("   when using the actual API endpoint.")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Error during testing: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == '__main__':
    print("🚀 Starting PDF Text Extraction Test\n")
    import sys
    success = main()
    sys.exit(0 if success else 1)


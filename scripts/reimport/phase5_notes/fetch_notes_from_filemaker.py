"""
Phase 5: Fetch Notes and SMS from FileMaker

Fetches all patient note and SMS records from FileMaker via OData API.
Exports to JSON file for import into Nexus.
"""

import sys
import os
import json
from datetime import datetime
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from scripts.reimport.utils import create_logger, create_filemaker_client


def fetch_notes_from_filemaker(output_dir: str = "data/reimport") -> tuple:
    """
    Fetch all notes and SMS messages from FileMaker.
    
    Args:
        output_dir: Directory to save export files
    
    Returns:
        Tuple of (notes_file, sms_file), or (None, None) if failed
    """
    logger = create_logger("PHASE 5")
    logger.phase_start("Phase 5.1", "Fetch Notes and SMS from FileMaker")
    
    try:
        # Create output directory
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)
        
        # Create timestamped filenames
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        notes_file = output_path / f"notes_export_{timestamp}.json"
        sms_file = output_path / f"sms_export_{timestamp}.json"
        
        logger.info(f"Notes will be saved to: {notes_file}")
        logger.info(f"SMS will be saved to: {sms_file}")
        
        with create_filemaker_client() as fm:
            # ========================================
            # Fetch Notes from FileMaker
            # ========================================
            logger.info("Fetching notes from FileMaker via OData...")
            logger.info(f"OData API: {fm.odata_base_url}")
            
            # Try different entity names for notes
            notes = []
            try:
                notes = fm.odata_get_all('@Notes', batch_size=100)
            except Exception as e:
                logger.warning(f"Could not fetch from '@Notes': {str(e)}")
                try:
                    notes = fm.odata_get_all('API_Notes', batch_size=100)
                except Exception as e2:
                    logger.warning(f"Could not fetch from 'API_Notes': {str(e2)}")
                    try:
                        notes = fm.odata_get_all('@Contact_Notes', batch_size=100)
                    except Exception as e3:
                        logger.warning(f"Could not fetch notes from any known entity")
                        logger.info("Notes may not be available in FileMaker")
            
            logger.success(f"✅ Fetched {len(notes)} notes from FileMaker")
            
            # Analyze note data
            if notes:
                notes_with_patient = sum(1 for n in notes if n.get('id_Contact') or n.get('patient_id'))
                notes_with_content = sum(1 for n in notes if n.get('content') or n.get('Note') or n.get('Text'))
                logger.info(f"Notes with patient link: {notes_with_patient}/{len(notes)}")
                logger.info(f"Notes with content: {notes_with_content}/{len(notes)}")
            
            # Save notes
            if notes:
                notes_export = {
                    'export_timestamp': timestamp,
                    'export_date': datetime.now().isoformat(),
                    'total_notes': len(notes),
                    'source': 'FileMaker OData API',
                    'notes': notes
                }
                
                with open(notes_file, 'w') as f:
                    json.dump(notes_export, f, indent=2, default=str)
                
                logger.success(f"✅ Saved notes to: {notes_file}")
            
            # ========================================
            # Fetch SMS Messages from FileMaker
            # ========================================
            logger.info("")
            logger.info("Fetching SMS messages from FileMaker via OData...")
            
            # Try different entity names for SMS
            sms_messages = []
            try:
                sms_messages = fm.odata_get_all('@SMS', batch_size=100)
            except Exception as e:
                logger.warning(f"Could not fetch from '@SMS': {str(e)}")
                try:
                    sms_messages = fm.odata_get_all('API_SMS', batch_size=100)
                except Exception as e2:
                    logger.warning(f"Could not fetch from 'API_SMS': {str(e2)}")
                    try:
                        sms_messages = fm.odata_get_all('@SMS_Messages', batch_size=100)
                    except Exception as e3:
                        logger.warning(f"Could not fetch SMS from any known entity")
                        logger.info("SMS may not be available in FileMaker")
            
            logger.success(f"✅ Fetched {len(sms_messages)} SMS messages from FileMaker")
            
            # Analyze SMS data
            if sms_messages:
                sms_with_patient = sum(1 for s in sms_messages if s.get('id_Contact') or s.get('patient_id'))
                sms_with_phone = sum(1 for s in sms_messages if s.get('phone') or s.get('phone_number'))
                sms_with_message = sum(1 for s in sms_messages if s.get('message') or s.get('Message') or s.get('text'))
                logger.info(f"SMS with patient link: {sms_with_patient}/{len(sms_messages)}")
                logger.info(f"SMS with phone number: {sms_with_phone}/{len(sms_messages)}")
                logger.info(f"SMS with message content: {sms_with_message}/{len(sms_messages)}")
            
            # Save SMS
            if sms_messages:
                sms_export = {
                    'export_timestamp': timestamp,
                    'export_date': datetime.now().isoformat(),
                    'total_sms': len(sms_messages),
                    'source': 'FileMaker OData API',
                    'sms_messages': sms_messages
                }
                
                with open(sms_file, 'w') as f:
                    json.dump(sms_export, f, indent=2, default=str)
                
                logger.success(f"✅ Saved SMS to: {sms_file}")
            
            # ========================================
            # Export Summary
            # ========================================
            logger.info("")
            logger.info("=" * 70)
            logger.info("📊 Export Summary")
            logger.info("=" * 70)
            logger.info(f"Total Notes: {len(notes)}")
            logger.info(f"Total SMS: {len(sms_messages)}")
            
            if notes:
                logger.info(f"Notes File: {notes_file} ({notes_file.stat().st_size / 1024 / 1024:.2f} MB)")
            if sms_messages:
                logger.info(f"SMS File: {sms_file} ({sms_file.stat().st_size / 1024 / 1024:.2f} MB)")
            
            logger.success("")
            logger.success("✅ Note and SMS export completed successfully!")
            logger.success(f"Next: Run import_notes.py to import into Nexus")
            logger.success("")
            
            logger.phase_end(success=True)
            return (str(notes_file) if notes else None, str(sms_file) if sms_messages else None)
            
    except Exception as e:
        logger.error(f"Exception during fetch: {str(e)}", exc_info=e)
        logger.phase_end(success=False)
        return (None, None)


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Fetch notes and SMS from FileMaker')
    parser.add_argument('--output-dir', default='data/reimport', help='Output directory for export files')
    args = parser.parse_args()
    
    notes_file, sms_file = fetch_notes_from_filemaker(output_dir=args.output_dir)
    sys.exit(0 if (notes_file or sms_file) else 1)


"""
Phase 5: Fetch Notes from FileMaker

Fetches all patient note records from FileMaker via OData API.
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


def fetch_notes_from_filemaker(output_dir: str = "data/reimport") -> str:
    """
    Fetch all notes from FileMaker.
    
    Args:
        output_dir: Directory to save export file
    
    Returns:
        Path to exported JSON file, or None if failed
    """
    logger = create_logger("PHASE 5")
    logger.phase_start("Phase 5.1", "Fetch Notes from FileMaker")
    
    try:
        # Create output directory
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)
        
        # Create timestamped filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_file = output_path / f"notes_export_{timestamp}.json"
        
        logger.info(f"Export will be saved to: {output_file}")
        
        # ========================================
        # Fetch Notes from FileMaker
        # ========================================
        with create_filemaker_client() as fm:
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
                        logger.error(f"Could not fetch notes from any known entity: {str(e3)}")
                        logger.info("Notes may not be available in FileMaker, or use a different entity name")
                        logger.phase_end(success=False)
                        return None
            
            logger.success(f"✅ Fetched {len(notes)} notes from FileMaker")
            
            if len(notes) == 0:
                logger.warning("No notes found in FileMaker")
                logger.info("This is OK if FileMaker doesn't have notes, or they're not exposed via OData")
            
            # ========================================
            # Analyze Note Data
            # ========================================
            if notes:
                logger.info("Analyzing note data...")
                
                # Count notes by type/category
                notes_with_patient = sum(1 for n in notes if n.get('id_Contact') or n.get('patient_id'))
                notes_with_content = sum(1 for n in notes if n.get('content') or n.get('Note') or n.get('Text'))
                
                logger.info(f"Notes with patient link: {notes_with_patient}/{len(notes)}")
                logger.info(f"Notes with content: {notes_with_content}/{len(notes)}")
            
            # ========================================
            # Save to JSON File
            # ========================================
            logger.info(f"Saving export to: {output_file}")
            
            export_data = {
                'export_timestamp': timestamp,
                'export_date': datetime.now().isoformat(),
                'total_notes': len(notes),
                'source': 'FileMaker OData API',
                'notes': notes
            }
            
            with open(output_file, 'w') as f:
                json.dump(export_data, f, indent=2, default=str)
            
            logger.success(f"✅ Saved export to: {output_file}")
            
            # ========================================
            # Export Summary
            # ========================================
            logger.info("")
            logger.info("=" * 70)
            logger.info("📊 Export Summary")
            logger.info("=" * 70)
            logger.info(f"Total Notes: {len(notes)}")
            logger.info(f"Export File: {output_file}")
            if notes:
                logger.info(f"File Size: {output_file.stat().st_size / 1024 / 1024:.2f} MB")
            
            # Sample note data
            if notes:
                sample = notes[0]
                logger.info("")
                logger.info("Sample Note Data:")
                logger.info(f"  ID: {sample.get('id')}")
                logger.info(f"  Patient ID: {sample.get('id_Contact')}")
                logger.info(f"  Content: {str(sample.get('Note') or sample.get('content') or sample.get('Text'))[:100]}...")
            
            logger.success("")
            logger.success("✅ Note export completed successfully!")
            logger.success(f"Next: Run import_notes.py to import into Nexus")
            logger.success("")
            
            logger.phase_end(success=True)
            return str(output_file)
            
    except Exception as e:
        logger.error(f"Exception during note fetch: {str(e)}", exc_info=e)
        logger.phase_end(success=False)
        return None


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Fetch notes from FileMaker')
    parser.add_argument('--output-dir', default='data/reimport', help='Output directory for export file')
    args = parser.parse_args()
    
    output_file = fetch_notes_from_filemaker(output_dir=args.output_dir)
    sys.exit(0 if output_file else 1)


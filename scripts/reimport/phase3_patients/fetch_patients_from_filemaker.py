"""
Phase 3: Fetch Patients from FileMaker

Fetches all patient records from FileMaker via OData API.
Exports to JSON file for import into Nexus.
"""

import sys
import os
import json
from datetime import datetime
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from utils import create_logger, create_filemaker_client


def fetch_patients_from_filemaker(output_dir: str = "data/reimport") -> str:
    """
    Fetch all patients from FileMaker.
    
    Args:
        output_dir: Directory to save export file
    
    Returns:
        Path to exported JSON file, or None if failed
    """
    logger = create_logger("PHASE 3")
    logger.phase_start("Phase 3.1", "Fetch Patients from FileMaker")
    
    try:
        # Create output directory
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)
        
        # Create timestamped filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_file = output_path / f"patients_export_{timestamp}.json"
        
        logger.info(f"Export will be saved to: {output_file}")
        
        # ========================================
        # Fetch Patients from FileMaker
        # ========================================
        with create_filemaker_client() as fm:
            logger.info("Fetching patients from FileMaker via Data API...")
            logger.info(f"Data API: {fm.data_api_base_url}")
            logger.info(f"Layout: API_Contacts")
            
            # Get all patients with pagination using Data API
            patients = fm.get_all_patients(use_data_api=True)
            
            logger.success(f"✅ Fetched {len(patients)} patients from FileMaker")
            
            # ========================================
            # Fetch Contact Details for Each Patient
            # ========================================
            logger.info("Fetching contact details for patients...")
            
            patients_with_contacts = []
            batch_size = 100
            
            for i, patient in enumerate(patients):
                if (i + 1) % batch_size == 0:
                    logger.progress(i + 1, len(patients), "Processing patients")
                
                patient_id = patient.get('id')
                
                # Try to get contact details for this patient
                try:
                    # Contact details might be in related tables
                    # Try different entity names based on FileMaker structure
                    contact_details = []
                    
                    try:
                        contact_details = fm.odata_get_all(
                            entity='@Contact_Details',
                            filter_query=f"id___key eq '{patient_id}'",
                            batch_size=50
                        )
                    except:
                        # Try alternative entity name
                        try:
                            contact_details = fm.odata_get_all(
                                entity='API_Contact_Details',
                                filter_query=f"id_key eq '{patient_id}'",
                                batch_size=50
                            )
                        except:
                            # Contact details not available or different structure
                            pass
                    
                    # Combine patient with contact details
                    patient_with_contacts = {
                        'patient': patient,
                        'contact_details': contact_details
                    }
                    
                    patients_with_contacts.append(patient_with_contacts)
                    
                except Exception as e:
                    logger.debug(f"Could not fetch contacts for patient {patient_id}: {str(e)}")
                    # Add patient without contact details
                    patients_with_contacts.append({
                        'patient': patient,
                        'contact_details': []
                    })
            
            logger.progress(len(patients), len(patients), "Processing patients")
            logger.success(f"✅ Processed {len(patients_with_contacts)} patients with contact details")
            
            # ========================================
            # Save to JSON File
            # ========================================
            logger.info(f"Saving export to: {output_file}")
            
            export_data = {
                'export_timestamp': timestamp,
                'export_date': datetime.now().isoformat(),
                'total_patients': len(patients_with_contacts),
                'source': 'FileMaker OData API',
                'patients': patients_with_contacts
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
            logger.info(f"Total Patients: {len(patients_with_contacts)}")
            logger.info(f"Export File: {output_file}")
            logger.info(f"File Size: {output_file.stat().st_size / 1024 / 1024:.2f} MB")
            
            # Sample patient data
            if patients_with_contacts:
                sample = patients_with_contacts[0]['patient']
                logger.info("")
                logger.info("Sample Patient Data:")
                logger.info(f"  ID: {sample.get('id')}")
                logger.info(f"  Name: {sample.get('nameFirst')} {sample.get('nameLast')}")
                logger.info(f"  Clinic: {sample.get('Clinic_Name')}")
                logger.info(f"  Contact Details: {len(patients_with_contacts[0]['contact_details'])}")
            
            logger.success("")
            logger.success("✅ Patient export completed successfully!")
            logger.success(f"Next: Run import_patients.py to import into Nexus")
            logger.success("")
            
            logger.phase_end(success=True)
            return str(output_file)
            
    except Exception as e:
        logger.error(f"Exception during patient fetch: {str(e)}", exc_info=e)
        logger.phase_end(success=False)
        return None


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Fetch patients from FileMaker')
    parser.add_argument('--output-dir', default='data/reimport', help='Output directory for export file')
    args = parser.parse_args()
    
    output_file = fetch_patients_from_filemaker(output_dir=args.output_dir)
    sys.exit(0 if output_file else 1)


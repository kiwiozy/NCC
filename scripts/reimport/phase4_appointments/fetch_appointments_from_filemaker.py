"""
Phase 4: Fetch Appointments from FileMaker

Fetches all appointment records from FileMaker via OData API.
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


def fetch_appointments_from_filemaker(output_dir: str = "data/reimport") -> str:
    """
    Fetch all appointments from FileMaker.
    
    Args:
        output_dir: Directory to save export file
    
    Returns:
        Path to exported JSON file, or None if failed
    """
    logger = create_logger("PHASE 4")
    logger.phase_start("Phase 4.1", "Fetch Appointments from FileMaker")
    
    try:
        # Create output directory
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)
        
        # Create timestamped filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_file = output_path / f"appointments_export_{timestamp}.json"
        
        logger.info(f"Export will be saved to: {output_file}")
        
        # ========================================
        # Fetch Appointments from FileMaker
        # ========================================
        with create_filemaker_client() as fm:
            logger.info("Fetching appointments from FileMaker via Data API...")
            logger.info(f"Data API: {fm.data_api_base_url}")
            
            # Try different layout names for appointments
            appointments = []
            layout_names = [
                'API_event',            # Try this first - user suggestion
                'API_Clinic_Name',      # User suggestion
                'API_Clinics_Details',  # From old documentation
                'API_Calendar_Events',
                'API_Appointments', 
                'API_Events',
                'Events',
                'Appointments', 
                'API_Calendar', 
                'Calendar'
            ]
            
            for layout_name in layout_names:
                try:
                    logger.info(f"Trying layout: {layout_name}")
                    appointments = fm.data_api_get_all_records(layout=layout_name, batch_size=100)
                    logger.success(f"✅ Found appointments in layout: {layout_name}")
                    break
                except Exception as e:
                    logger.debug(f"Layout '{layout_name}' not available: {str(e)}")
                    continue
            
            if not appointments:
                logger.error("Could not fetch appointments from any known layout")
                logger.phase_end(success=False)
                return None
            
            logger.success(f"✅ Fetched {len(appointments)} appointments from FileMaker")
            
            # ========================================
            # Analyze Appointment Data
            # ========================================
            logger.info("Analyzing appointment data...")
            
            # Count appointments by status
            appointments_with_clinic = sum(1 for a in appointments if a.get('id_Clinic') or a.get('clinic_name'))
            appointments_with_clinician = sum(1 for a in appointments if a.get('id_Clinician') or a.get('clinician_name'))
            appointments_with_type = sum(1 for a in appointments if a.get('Type') or a.get('appointment_type'))
            appointments_with_patient = sum(1 for a in appointments if a.get('id_Contact') or a.get('patient_id'))
            
            logger.info(f"Appointments with clinic: {appointments_with_clinic}/{len(appointments)}")
            logger.info(f"Appointments with clinician: {appointments_with_clinician}/{len(appointments)}")
            logger.info(f"Appointments with type: {appointments_with_type}/{len(appointments)}")
            logger.info(f"Appointments with patient: {appointments_with_patient}/{len(appointments)}")
            
            # ========================================
            # Save to JSON File
            # ========================================
            logger.info(f"Saving export to: {output_file}")
            
            export_data = {
                'export_timestamp': timestamp,
                'export_date': datetime.now().isoformat(),
                'total_appointments': len(appointments),
                'source': 'FileMaker OData API',
                'statistics': {
                    'with_clinic': appointments_with_clinic,
                    'with_clinician': appointments_with_clinician,
                    'with_type': appointments_with_type,
                    'with_patient': appointments_with_patient,
                    'missing_clinic': len(appointments) - appointments_with_clinic,
                    'missing_clinician': len(appointments) - appointments_with_clinician,
                    'missing_type': len(appointments) - appointments_with_type,
                    'missing_patient': len(appointments) - appointments_with_patient,
                },
                'appointments': appointments
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
            logger.info(f"Total Appointments: {len(appointments)}")
            logger.info(f"Export File: {output_file}")
            logger.info(f"File Size: {output_file.stat().st_size / 1024 / 1024:.2f} MB")
            
            logger.info("")
            logger.info("Data Completeness:")
            logger.info(f"  With Clinic: {appointments_with_clinic} ({appointments_with_clinic/len(appointments)*100:.1f}%)")
            logger.info(f"  With Clinician: {appointments_with_clinician} ({appointments_with_clinician/len(appointments)*100:.1f}%)")
            logger.info(f"  With Type: {appointments_with_type} ({appointments_with_type/len(appointments)*100:.1f}%)")
            logger.info(f"  With Patient: {appointments_with_patient} ({appointments_with_patient/len(appointments)*100:.1f}%)")
            
            # Sample appointment data
            if appointments:
                sample = appointments[0]
                logger.info("")
                logger.info("Sample Appointment Data:")
                logger.info(f"  ID: {sample.get('id')}")
                logger.info(f"  Patient ID: {sample.get('id_Contact')}")
                logger.info(f"  Clinic: {sample.get('id_Clinic')}")
                logger.info(f"  Clinician: {sample.get('id_Clinician')}")
                logger.info(f"  Type: {sample.get('Type')}")
                logger.info(f"  Start: {sample.get('Start')}")
            
            logger.success("")
            logger.success("✅ Appointment export completed successfully!")
            logger.success(f"Next: Run import_appointments.py to import into Nexus")
            logger.success("")
            
            logger.phase_end(success=True)
            return str(output_file)
            
    except Exception as e:
        logger.error(f"Exception during appointment fetch: {str(e)}", exc_info=e)
        logger.phase_end(success=False)
        return None


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Fetch appointments from FileMaker')
    parser.add_argument('--output-dir', default='data/reimport', help='Output directory for export file')
    args = parser.parse_args()
    
    output_file = fetch_appointments_from_filemaker(output_dir=args.output_dir)
    sys.exit(0 if output_file else 1)


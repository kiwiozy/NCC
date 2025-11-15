"""
Phase 0: Create Database Backup

Creates a backup of all critical data before reimport.
Backup can be used for rollback if import fails.
"""

import sys
import os
import django
import csv
import json
from datetime import datetime
from pathlib import Path

# Add Django project to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../backend')))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ncc_api.settings')
django.setup()

from utils import create_logger
from patients.models import Patient
from appointments.models import Appointment
from documents.models import Document
from images.models import Image, ImageBatch


def create_backup() -> bool:
    """
    Create backup of all data before reimport.
    
    Returns:
        True if backup successful, False otherwise
    """
    logger = create_logger("PHASE 0")
    logger.phase_start("Phase 0.4", "Create Database Backup")
    
    try:
        # Create backup directory
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_dir = Path(f"backups/reimport_{timestamp}")
        backup_dir.mkdir(parents=True, exist_ok=True)
        
        logger.info(f"Creating backup in: {backup_dir}")
        
        # ========================================
        # Backup Patients
        # ========================================
        logger.info("Backing up patients...")
        patients = Patient.objects.all().values()
        patient_file = backup_dir / 'patients.json'
        
        with open(patient_file, 'w') as f:
            # Convert to list and handle dates
            patient_list = []
            for p in patients:
                patient_dict = dict(p)
                # Convert date fields to ISO format
                if patient_dict.get('dob'):
                    patient_dict['dob'] = patient_dict['dob'].isoformat()
                if patient_dict.get('created_at'):
                    patient_dict['created_at'] = patient_dict['created_at'].isoformat()
                if patient_dict.get('updated_at'):
                    patient_dict['updated_at'] = patient_dict['updated_at'].isoformat()
                # Convert UUIDs to strings
                for key, value in patient_dict.items():
                    if hasattr(value, 'hex'):  # UUID
                        patient_dict[key] = str(value)
                patient_list.append(patient_dict)
            
            json.dump(patient_list, f, indent=2, default=str)
        
        logger.success(f"✅ Backed up {len(patient_list)} patients → {patient_file}")
        
        # ========================================
        # Backup Appointments
        # ========================================
        logger.info("Backing up appointments...")
        appointments = Appointment.objects.all().values()
        appointment_file = backup_dir / 'appointments.json'
        
        with open(appointment_file, 'w') as f:
            # Convert to list and handle dates
            appointment_list = []
            for a in appointments:
                appointment_dict = dict(a)
                # Convert date fields to ISO format
                for key in ['start_time', 'end_time', 'created_at', 'updated_at']:
                    if appointment_dict.get(key):
                        appointment_dict[key] = appointment_dict[key].isoformat()
                # Convert UUIDs to strings
                for key, value in appointment_dict.items():
                    if hasattr(value, 'hex'):  # UUID
                        appointment_dict[key] = str(value)
                appointment_list.append(appointment_dict)
            
            json.dump(appointment_list, f, indent=2, default=str)
        
        logger.success(f"✅ Backed up {len(appointment_list)} appointments → {appointment_file}")
        
        # ========================================
        # Backup Document Metadata (not S3 files)
        # ========================================
        logger.info("Backing up document metadata...")
        documents = Document.objects.all().values()
        document_file = backup_dir / 'documents.json'
        
        with open(document_file, 'w') as f:
            # Convert to list and handle dates
            document_list = []
            for d in documents:
                document_dict = dict(d)
                # Convert date fields to ISO format
                for key in ['uploaded_at', 'created_at', 'updated_at']:
                    if document_dict.get(key):
                        document_dict[key] = document_dict[key].isoformat()
                # Convert UUIDs to strings
                for key, value in document_dict.items():
                    if hasattr(value, 'hex'):  # UUID
                        document_dict[key] = str(value)
                document_list.append(document_dict)
            
            json.dump(document_list, f, indent=2, default=str)
        
        logger.success(f"✅ Backed up {len(document_list)} document records → {document_file}")
        
        # ========================================
        # Backup Image Metadata (not S3 files)
        # ========================================
        logger.info("Backing up image metadata...")
        images = Image.objects.all().values()
        image_file = backup_dir / 'images.json'
        
        with open(image_file, 'w') as f:
            # Convert to list and handle dates
            image_list = []
            for i in images:
                image_dict = dict(i)
                # Convert date fields to ISO format
                for key in ['uploaded_at', 'created_at', 'updated_at']:
                    if image_dict.get(key):
                        image_dict[key] = image_dict[key].isoformat()
                # Convert UUIDs to strings
                for key, value in image_dict.items():
                    if hasattr(value, 'hex'):  # UUID
                        image_dict[key] = str(value)
                image_list.append(image_dict)
            
            json.dump(image_list, f, indent=2, default=str)
        
        logger.success(f"✅ Backed up {len(image_list)} image records → {image_file}")
        
        # ========================================
        # Backup Image Batches
        # ========================================
        logger.info("Backing up image batches...")
        batches = ImageBatch.objects.all().values()
        batch_file = backup_dir / 'image_batches.json'
        
        with open(batch_file, 'w') as f:
            # Convert to list and handle dates
            batch_list = []
            for b in batches:
                batch_dict = dict(b)
                # Convert date fields to ISO format
                for key in ['uploaded_at', 'created_at', 'updated_at']:
                    if batch_dict.get(key):
                        batch_dict[key] = batch_dict[key].isoformat()
                # Convert UUIDs to strings
                for key, value in batch_dict.items():
                    if hasattr(value, 'hex'):  # UUID
                        batch_dict[key] = str(value)
                batch_list.append(batch_dict)
            
            json.dump(batch_list, f, indent=2, default=str)
        
        logger.success(f"✅ Backed up {len(batch_list)} image batches → {batch_file}")
        
        # ========================================
        # Create Backup Summary
        # ========================================
        summary = {
            'timestamp': timestamp,
            'backup_dir': str(backup_dir),
            'counts': {
                'patients': len(patient_list),
                'appointments': len(appointment_list),
                'documents': len(document_list),
                'images': len(image_list),
                'image_batches': len(batch_list),
            },
            'files': {
                'patients': str(patient_file),
                'appointments': str(appointment_file),
                'documents': str(document_file),
                'images': str(image_file),
                'image_batches': str(batch_file),
            }
        }
        
        summary_file = backup_dir / 'backup_summary.json'
        with open(summary_file, 'w') as f:
            json.dump(summary, f, indent=2)
        
        logger.success(f"✅ Backup summary → {summary_file}")
        
        # ========================================
        # Summary
        # ========================================
        logger.info("")
        logger.info("=" * 70)
        logger.info("📊 Backup Summary")
        logger.info("=" * 70)
        logger.info(f"Backup Directory: {backup_dir}")
        logger.info(f"Patients: {summary['counts']['patients']}")
        logger.info(f"Appointments: {summary['counts']['appointments']}")
        logger.info(f"Documents: {summary['counts']['documents']}")
        logger.info(f"Images: {summary['counts']['images']}")
        logger.info(f"Image Batches: {summary['counts']['image_batches']}")
        logger.success("")
        logger.success("✅ Backup completed successfully!")
        logger.success(f"Backup location: {backup_dir}")
        logger.success("")
        
        logger.phase_end(success=True)
        return True
        
    except Exception as e:
        logger.error(f"Exception during backup: {str(e)}", exc_info=e)
        logger.phase_end(success=False)
        return False


if __name__ == '__main__':
    success = create_backup()
    sys.exit(0 if success else 1)


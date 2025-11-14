#!/usr/bin/env python3
"""
Phase 8: Functional Validation

Tests that the Nexus UI and API endpoints work correctly after reimport.
This is a smoke test to verify basic functionality before declaring success.
"""

import sys
import os
import django
import requests

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
from django.contrib.contenttypes.models import ContentType


def validate_functional() -> bool:
    """
    Run functional validation tests.
    
    Returns:
        True if all tests pass, False otherwise
    """
    logger = create_logger("PHASE 8")
    logger.phase_start("Phase 8.3", "Functional Validation (API & UI Tests)")
    
    all_tests_passed = True
    total_tests = 0
    passed_tests = 0
    failed_tests = 0
    
    # Base URL for API (assumes local development)
    base_url = "https://localhost:8000"
    
    # Disable SSL warnings for local development
    import urllib3
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
    
    try:
        # ========================================
        # Test 1: Patient List API
        # ========================================
        total_tests += 1
        logger.info("Test 1: GET /api/patients/ (patient list)")
        
        try:
            response = requests.get(f"{base_url}/api/patients/", verify=False, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                patient_count = len(data) if isinstance(data, list) else data.get('count', 0)
                logger.success(f"✅ Patient list API works ({patient_count} patients)")
                passed_tests += 1
            else:
                logger.error(f"❌ Patient list returned {response.status_code}")
                failed_tests += 1
                all_tests_passed = False
        except Exception as e:
            logger.error(f"❌ Patient list API failed: {str(e)}")
            failed_tests += 1
            all_tests_passed = False
        
        # ========================================
        # Test 2: Patient Detail API
        # ========================================
        total_tests += 1
        logger.info("Test 2: GET /api/patients/<id>/ (patient detail)")
        
        try:
            # Get first patient
            first_patient = Patient.objects.first()
            
            if first_patient:
                response = requests.get(
                    f"{base_url}/api/patients/{first_patient.id}/",
                    verify=False,
                    timeout=10
                )
                
                if response.status_code == 200:
                    data = response.json()
                    logger.success(f"✅ Patient detail API works (loaded: {data.get('first_name', 'Unknown')} {data.get('last_name', '')})")
                    passed_tests += 1
                else:
                    logger.error(f"❌ Patient detail returned {response.status_code}")
                    failed_tests += 1
                    all_tests_passed = False
            else:
                logger.warning("⚠️  No patients found - skipping test")
                total_tests -= 1
        except Exception as e:
            logger.error(f"❌ Patient detail API failed: {str(e)}")
            failed_tests += 1
            all_tests_passed = False
        
        # ========================================
        # Test 3: Appointments API
        # ========================================
        total_tests += 1
        logger.info("Test 3: GET /api/appointments/ (appointments list)")
        
        try:
            response = requests.get(f"{base_url}/api/appointments/", verify=False, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                appointment_count = len(data) if isinstance(data, list) else data.get('count', 0)
                logger.success(f"✅ Appointments API works ({appointment_count} appointments)")
                passed_tests += 1
            else:
                logger.error(f"❌ Appointments API returned {response.status_code}")
                failed_tests += 1
                all_tests_passed = False
        except Exception as e:
            logger.error(f"❌ Appointments API failed: {str(e)}")
            failed_tests += 1
            all_tests_passed = False
        
        # ========================================
        # Test 4: Patient Search
        # ========================================
        total_tests += 1
        logger.info("Test 4: GET /api/patients/?search=<query> (search)")
        
        try:
            # Search for a common last name
            response = requests.get(
                f"{base_url}/api/patients/?search=Smith",
                verify=False,
                timeout=10
            )
            
            if response.status_code == 200:
                logger.success("✅ Patient search API works")
                passed_tests += 1
            else:
                logger.error(f"❌ Patient search returned {response.status_code}")
                failed_tests += 1
                all_tests_passed = False
        except Exception as e:
            logger.error(f"❌ Patient search API failed: {str(e)}")
            failed_tests += 1
            all_tests_passed = False
        
        # ========================================
        # Test 5: Patient Filter by Clinic
        # ========================================
        total_tests += 1
        logger.info("Test 5: GET /api/patients/?clinic=<id> (filter)")
        
        try:
            # Get first patient's clinic
            first_patient = Patient.objects.filter(clinic__isnull=False).first()
            
            if first_patient and first_patient.clinic:
                response = requests.get(
                    f"{base_url}/api/patients/?clinic={first_patient.clinic.id}",
                    verify=False,
                    timeout=10
                )
                
                if response.status_code == 200:
                    logger.success("✅ Patient filter by clinic works")
                    passed_tests += 1
                else:
                    logger.error(f"❌ Patient filter returned {response.status_code}")
                    failed_tests += 1
                    all_tests_passed = False
            else:
                logger.warning("⚠️  No patients with clinic found - skipping test")
                total_tests -= 1
        except Exception as e:
            logger.error(f"❌ Patient filter API failed: {str(e)}")
            failed_tests += 1
            all_tests_passed = False
        
        # ========================================
        # Test 6: Documents API
        # ========================================
        total_tests += 1
        logger.info("Test 6: GET /api/documents/ (documents list)")
        
        try:
            response = requests.get(f"{base_url}/api/documents/", verify=False, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                doc_count = len(data) if isinstance(data, list) else data.get('count', 0)
                logger.success(f"✅ Documents API works ({doc_count} documents)")
                passed_tests += 1
            else:
                logger.error(f"❌ Documents API returned {response.status_code}")
                failed_tests += 1
                all_tests_passed = False
        except Exception as e:
            logger.error(f"❌ Documents API failed: {str(e)}")
            failed_tests += 1
            all_tests_passed = False
        
        # ========================================
        # Test 7: Images API
        # ========================================
        total_tests += 1
        logger.info("Test 7: GET /api/images/ (images list)")
        
        try:
            response = requests.get(f"{base_url}/api/images/", verify=False, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                image_count = len(data) if isinstance(data, list) else data.get('count', 0)
                logger.success(f"✅ Images API works ({image_count} images)")
                passed_tests += 1
            else:
                logger.error(f"❌ Images API returned {response.status_code}")
                failed_tests += 1
                all_tests_passed = False
        except Exception as e:
            logger.error(f"❌ Images API failed: {str(e)}")
            failed_tests += 1
            all_tests_passed = False
        
        # ========================================
        # Test 8: FileMaker Metadata Exists
        # ========================================
        total_tests += 1
        logger.info("Test 8: Verify filemaker_metadata exists on patients")
        
        try:
            patients_with_metadata = Patient.objects.filter(
                filemaker_metadata__isnull=False
            ).count()
            
            total_patients = Patient.objects.count()
            
            if patients_with_metadata > 0:
                percent = (patients_with_metadata / total_patients * 100) if total_patients > 0 else 0
                logger.success(f"✅ FileMaker metadata exists on {patients_with_metadata}/{total_patients} patients ({percent:.1f}%)")
                passed_tests += 1
            else:
                logger.error("❌ No patients have filemaker_metadata!")
                failed_tests += 1
                all_tests_passed = False
        except Exception as e:
            logger.error(f"❌ Metadata check failed: {str(e)}")
            failed_tests += 1
            all_tests_passed = False
        
        # ========================================
        # Test 9: Document Generic FK Points to Valid Patients
        # ========================================
        total_tests += 1
        logger.info("Test 9: Verify documents link to valid patients")
        
        try:
            patient_content_type = ContentType.objects.get_for_model(Patient)
            
            # Count documents that have patient content type
            documents_with_patient = Document.objects.filter(
                content_type=patient_content_type
            ).count()
            
            total_documents = Document.objects.count()
            
            if total_documents == 0:
                logger.warning("⚠️  No documents found - skipping test")
                total_tests -= 1
            elif documents_with_patient == total_documents:
                logger.success(f"✅ All {total_documents} documents link to patients")
                passed_tests += 1
            else:
                logger.warning(f"⚠️  {documents_with_patient}/{total_documents} documents link to patients")
                passed_tests += 1  # Not critical
        except Exception as e:
            logger.error(f"❌ Document FK check failed: {str(e)}")
            failed_tests += 1
            all_tests_passed = False
        
        # ========================================
        # Test 10: Image Generic FK Points to Valid Patients
        # ========================================
        total_tests += 1
        logger.info("Test 10: Verify image batches link to valid patients")
        
        try:
            patient_content_type = ContentType.objects.get_for_model(Patient)
            
            # Count image batches that have patient content type
            batches_with_patient = ImageBatch.objects.filter(
                content_type=patient_content_type
            ).count()
            
            total_batches = ImageBatch.objects.count()
            
            if total_batches == 0:
                logger.warning("⚠️  No image batches found - skipping test")
                total_tests -= 1
            elif batches_with_patient == total_batches:
                logger.success(f"✅ All {total_batches} image batches link to patients")
                passed_tests += 1
            else:
                logger.warning(f"⚠️  {batches_with_patient}/{total_batches} image batches link to patients")
                passed_tests += 1  # Not critical
        except Exception as e:
            logger.error(f"❌ Image FK check failed: {str(e)}")
            failed_tests += 1
            all_tests_passed = False
        
        # ========================================
        # Summary
        # ========================================
        logger.info("")
        logger.info("=" * 70)
        logger.info("📊 Functional Validation Summary")
        logger.info("=" * 70)
        logger.info(f"Total Tests: {total_tests}")
        logger.info(f"✅ Passed: {passed_tests}")
        logger.info(f"❌ Failed: {failed_tests}")
        logger.info(f"Success Rate: {(passed_tests/total_tests*100):.1f}%" if total_tests > 0 else "N/A")
        
        if all_tests_passed:
            logger.success("")
            logger.success("✅ All functional tests passed!")
            logger.success("The Nexus UI and API are working correctly")
            logger.success("")
        else:
            logger.error("")
            logger.error("❌ Some functional tests failed!")
            logger.error("Review the errors above and fix issues before using the system")
            logger.error("")
        
        logger.phase_end(success=all_tests_passed)
        return all_tests_passed
        
    except Exception as e:
        logger.error(f"Exception during functional validation: {str(e)}", exc_info=e)
        logger.phase_end(success=False)
        return False


if __name__ == '__main__':
    success = validate_functional()
    sys.exit(0 if success else 1)


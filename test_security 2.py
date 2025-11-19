#!/usr/bin/env python3
"""
Security & Authorization Testing Script
Tests authentication and role-based access control

Usage:
    python test_security.py

Requirements:
    - Backend server running on https://localhost:8000
    - Test accounts created:
      - Staff user: admin@walkeasy.com.au / password
      - Regular user: user@walkeasy.com.au / password
"""

import requests
import json
from urllib3.exceptions import InsecureRequestWarning

# Disable SSL warnings for localhost
requests.packages.urllib3.disable_warnings(category=InsecureRequestWarning)

BASE_URL = "https://localhost:8000"
VERIFY_SSL = False  # Set to True for production

# ANSI color codes
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
BLUE = "\033[94m"
RESET = "\033[0m"


class SecurityTester:
    def __init__(self):
        self.tests_passed = 0
        self.tests_failed = 0
        self.tests_total = 0
        
    def log_success(self, message):
        print(f"{GREEN}✓{RESET} {message}")
        self.tests_passed += 1
        
    def log_failure(self, message):
        print(f"{RED}✗{RESET} {message}")
        self.tests_failed += 1
        
    def log_info(self, message):
        print(f"{BLUE}ℹ{RESET} {message}")
        
    def log_warning(self, message):
        print(f"{YELLOW}⚠{RESET} {message}")
        
    def log_header(self, message):
        print(f"\n{BLUE}{'=' * 70}")
        print(f"{message}")
        print(f"{'=' * 70}{RESET}\n")
        
    def test_unauthenticated_access(self):
        """Test that unauthenticated users cannot access API endpoints"""
        self.log_header("TEST 1: Unauthenticated Access (Should Be Blocked)")
        
        endpoints = [
            "/api/patients/",
            "/api/clinicians/",
            "/api/appointments/",
            "/api/auth/users/",
            "/api/clinics/",
            "/api/notes/",
        ]
        
        for endpoint in endpoints:
            self.tests_total += 1
            try:
                response = requests.get(
                    f"{BASE_URL}{endpoint}",
                    verify=VERIFY_SSL
                )
                
                if response.status_code == 401 or response.status_code == 403:
                    self.log_success(f"{endpoint} - Correctly blocked (401/403)")
                else:
                    self.log_failure(f"{endpoint} - NOT blocked! Status: {response.status_code}")
                    
            except Exception as e:
                self.log_failure(f"{endpoint} - Error: {str(e)}")
                
    def test_authenticated_access_regular_user(self, session):
        """Test regular user can access API with authentication"""
        self.log_header("TEST 2: Regular User Authenticated Access")
        
        endpoints = [
            "/api/clinicians/",
            "/api/patients/",
            "/api/clinics/",
        ]
        
        for endpoint in endpoints:
            self.tests_total += 1
            try:
                response = session.get(
                    f"{BASE_URL}{endpoint}",
                    verify=VERIFY_SSL
                )
                
                if response.status_code == 200:
                    self.log_success(f"{endpoint} - Access granted (200)")
                else:
                    self.log_failure(f"{endpoint} - Access denied! Status: {response.status_code}")
                    
            except Exception as e:
                self.log_failure(f"{endpoint} - Error: {str(e)}")
                
    def test_regular_user_permissions(self, session, user_clinician_id, other_clinician_id):
        """Test regular user can only edit own profile"""
        self.log_header("TEST 3: Regular User Authorization (Own Profile vs Others)")
        
        # Test editing own profile (should succeed)
        self.tests_total += 1
        try:
            payload = {
                "full_name": "Test User Updated",
                "email": "test@example.com",
                "phone": "0412345678"
            }
            response = session.patch(
                f"{BASE_URL}/api/clinicians/{user_clinician_id}/",
                json=payload,
                verify=VERIFY_SSL
            )
            
            if response.status_code in [200, 201]:
                self.log_success("Can edit own profile (200)")
            else:
                self.log_failure(f"Cannot edit own profile! Status: {response.status_code}")
                self.log_info(f"Response: {response.text[:200]}")
                
        except Exception as e:
            self.log_failure(f"Error editing own profile: {str(e)}")
            
        # Test editing restricted field (should fail)
        self.tests_total += 1
        try:
            payload = {
                "role": "ADMIN"  # Restricted field
            }
            response = session.patch(
                f"{BASE_URL}/api/clinicians/{user_clinician_id}/",
                json=payload,
                verify=VERIFY_SSL
            )
            
            if response.status_code == 403:
                self.log_success("Cannot edit restricted fields (403)")
            else:
                self.log_failure(f"Restricted field edit not blocked! Status: {response.status_code}")
                
        except Exception as e:
            self.log_failure(f"Error testing restricted field: {str(e)}")
            
        # Test editing other user's profile (should fail)
        if other_clinician_id:
            self.tests_total += 1
            try:
                payload = {
                    "full_name": "Hacked User"
                }
                response = session.patch(
                    f"{BASE_URL}/api/clinicians/{other_clinician_id}/",
                    json=payload,
                    verify=VERIFY_SSL
                )
                
                if response.status_code == 403:
                    self.log_success("Cannot edit other users' profiles (403)")
                else:
                    self.log_failure(f"Other profile edit not blocked! Status: {response.status_code}")
                    
            except Exception as e:
                self.log_failure(f"Error testing other profile edit: {str(e)}")
                
        # Test creating new clinician (should fail)
        self.tests_total += 1
        try:
            payload = {
                "full_name": "New Clinician",
                "active": True
            }
            response = session.post(
                f"{BASE_URL}/api/clinicians/",
                json=payload,
                verify=VERIFY_SSL
            )
            
            if response.status_code == 403:
                self.log_success("Cannot create clinician profiles (403)")
            else:
                self.log_failure(f"Clinician creation not blocked! Status: {response.status_code}")
                
        except Exception as e:
            self.log_failure(f"Error testing clinician creation: {str(e)}")
            
    def test_staff_permissions(self, session):
        """Test staff user has full access"""
        self.log_header("TEST 4: Staff User Authorization (Full Access)")
        
        # Test creating clinic (should succeed)
        self.tests_total += 1
        try:
            payload = {
                "name": "Test Clinic",
                "phone": "0299999999",
                "color": "#FF0000"
            }
            response = session.post(
                f"{BASE_URL}/api/clinics/",
                json=payload,
                verify=VERIFY_SSL
            )
            
            if response.status_code in [200, 201]:
                self.log_success("Can create clinics (200/201)")
                # Clean up
                if response.status_code == 201:
                    data = response.json()
                    clinic_id = data.get('id')
                    if clinic_id:
                        session.delete(f"{BASE_URL}/api/clinics/{clinic_id}/", verify=VERIFY_SSL)
            else:
                self.log_failure(f"Cannot create clinics! Status: {response.status_code}")
                self.log_info(f"Response: {response.text[:200]}")
                
        except Exception as e:
            self.log_failure(f"Error creating clinic: {str(e)}")
            
    def test_user_list_access(self, regular_session, staff_session):
        """Test /api/auth/users/ access control"""
        self.log_header("TEST 5: User List Endpoint Access Control")
        
        # Regular user (should only see own account)
        self.tests_total += 1
        try:
            response = regular_session.get(
                f"{BASE_URL}/api/auth/users/",
                verify=VERIFY_SSL
            )
            
            if response.status_code == 200:
                data = response.json()
                if len(data) == 1:
                    self.log_success("Regular user sees only own account (1 user)")
                else:
                    self.log_failure(f"Regular user sees {len(data)} users (should be 1)")
            else:
                self.log_failure(f"Regular user cannot access endpoint! Status: {response.status_code}")
                
        except Exception as e:
            self.log_failure(f"Error testing regular user list access: {str(e)}")
            
        # Staff user (should see all accounts)
        self.tests_total += 1
        try:
            response = staff_session.get(
                f"{BASE_URL}/api/auth/users/",
                verify=VERIFY_SSL
            )
            
            if response.status_code == 200:
                data = response.json()
                if len(data) > 1:
                    self.log_success(f"Staff user sees all users ({len(data)} users)")
                else:
                    self.log_warning(f"Staff user sees {len(data)} users (expected > 1)")
            else:
                self.log_failure(f"Staff user cannot access endpoint! Status: {response.status_code}")
                
        except Exception as e:
            self.log_failure(f"Error testing staff user list access: {str(e)}")
            
    def login(self, username, password):
        """Login and return session"""
        session = requests.Session()
        
        # Get CSRF token first
        csrf_response = session.get(
            f"{BASE_URL}/api/auth/csrf-token/",
            verify=VERIFY_SSL
        )
        
        if csrf_response.status_code == 200:
            csrf_data = csrf_response.json()
            csrf_token = csrf_data.get('csrfToken')
            session.headers.update({'X-CSRFToken': csrf_token})
            
        # Login via Django admin (since we're using Google OAuth in production)
        # For testing, we'll assume users have session-based auth
        # This would need to be adapted based on your actual login flow
        
        self.log_info(f"Created session for testing (using cookies from browser recommended)")
        return session
        
    def print_summary(self):
        """Print test summary"""
        self.log_header("TEST SUMMARY")
        
        print(f"Total Tests: {self.tests_total}")
        print(f"{GREEN}Passed: {self.tests_passed}{RESET}")
        print(f"{RED}Failed: {self.tests_failed}{RESET}")
        print(f"Success Rate: {(self.tests_passed / self.tests_total * 100):.1f}%\n")
        
        if self.tests_failed == 0:
            print(f"{GREEN}{'=' * 70}")
            print(f"🎉 ALL TESTS PASSED! Security is properly configured.")
            print(f"{'=' * 70}{RESET}\n")
        else:
            print(f"{RED}{'=' * 70}")
            print(f"⚠️  {self.tests_failed} TEST(S) FAILED! Review security configuration.")
            print(f"{'=' * 70}{RESET}\n")


def main():
    """Main test runner"""
    tester = SecurityTester()
    
    print(f"{BLUE}{'=' * 70}")
    print(f"WalkEasy Nexus - Security & Authorization Test Suite")
    print(f"{'=' * 70}{RESET}\n")
    
    # Test 1: Unauthenticated access (should be blocked)
    tester.test_unauthenticated_access()
    
    # Note: Tests 2-5 require authenticated sessions
    # You would need to login first or use existing session cookies
    
    print(f"\n{YELLOW}{'=' * 70}")
    print(f"⚠️  MANUAL TESTING REQUIRED")
    print(f"{'=' * 70}{RESET}\n")
    
    print("To test authenticated access, please:")
    print("1. Login to https://localhost:3000/login as a regular user")
    print("2. Login to https://localhost:3000/login as a staff user")
    print("3. Use browser dev tools to inspect API calls")
    print("4. Verify:")
    print("   - Regular users can edit their own profile")
    print("   - Regular users CANNOT edit other profiles")
    print("   - Regular users CANNOT create/delete profiles")
    print("   - Staff users CAN do everything")
    
    # Print summary
    tester.print_summary()


if __name__ == "__main__":
    main()


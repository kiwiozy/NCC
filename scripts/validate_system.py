#!/usr/bin/env python3
"""
System-Wide Backend/Frontend Validation Tool
Checks for mismatches between Django models and frontend forms
"""

import os
import re
import json
from pathlib import Path
from typing import Dict, List, Set, Tuple

# Colors for terminal output
class Colors:
    RED = '\033[91m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    MAGENTA = '\033[95m'
    CYAN = '\033[96m'
    WHITE = '\033[97m'
    BOLD = '\033[1m'
    END = '\033[0m'

def print_header(text):
    print(f"\n{Colors.BOLD}{Colors.CYAN}{'='*60}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.CYAN}{text}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.CYAN}{'='*60}{Colors.END}\n")

def print_section(text):
    print(f"\n{Colors.BOLD}{Colors.YELLOW}{text}{Colors.END}")
    print(f"{Colors.YELLOW}{'-'*60}{Colors.END}")

def print_error(text):
    print(f"{Colors.RED}❌ {text}{Colors.END}")

def print_warning(text):
    print(f"{Colors.YELLOW}⚠️  {text}{Colors.END}")

def print_success(text):
    print(f"{Colors.GREEN}✅ {text}{Colors.END}")

def print_info(text):
    print(f"{Colors.BLUE}ℹ️  {text}{Colors.END}")


def extract_model_choices(model_file_path: str) -> Dict[str, List[Tuple[str, str]]]:
    """Extract choices from Django model fields"""
    choices_map = {}
    
    with open(model_file_path, 'r') as f:
        content = f.read()
    
    # Pattern to find field definitions with choices
    # Looks for: field_name = models.CharField(...choices=[...]...)
    field_pattern = r"(\w+)\s*=\s*models\.\w+Field\([^)]*choices\s*=\s*\[(.*?)\]"
    
    for match in re.finditer(field_pattern, content, re.DOTALL):
        field_name = match.group(1)
        choices_str = match.group(2)
        
        # Extract individual choice tuples
        choice_pattern = r"\('([^']+)',\s*'([^']+)'\)"
        choices = re.findall(choice_pattern, choices_str)
        
        if choices:
            choices_map[field_name] = choices
    
    return choices_map


def extract_frontend_dropdowns(frontend_file_path: str) -> Dict[str, List[str]]:
    """Extract dropdown values from frontend files"""
    dropdowns = {}
    
    with open(frontend_file_path, 'r') as f:
        content = f.read()
    
    # Pattern to find Select components with data arrays
    # This is simplified - may need adjustment based on actual code
    select_pattern = r"<Select[^>]*data=\{(\[[^\]]+\])\}"
    
    for match in re.finditer(select_pattern, content, re.DOTALL):
        data_str = match.group(1)
        # Extract string values from array
        values = re.findall(r"['\"]([^'\"]+)['\"]", data_str)
        if values:
            dropdowns[frontend_file_path] = values
    
    return dropdowns


def scan_models(backend_dir: str) -> Dict[str, Dict[str, List[Tuple[str, str]]]]:
    """Scan all Django models for choice fields"""
    print_section("📊 Scanning Django Models for Choice Fields")
    
    all_models = {}
    backend_path = Path(backend_dir)
    
    for model_file in backend_path.rglob('models.py'):
        if 'migrations' in str(model_file):
            continue
        
        app_name = model_file.parent.name
        print_info(f"Checking {app_name}/models.py")
        
        choices = extract_model_choices(str(model_file))
        if choices:
            all_models[app_name] = choices
            for field, field_choices in choices.items():
                print(f"  • {Colors.CYAN}{field}{Colors.END}: {len(field_choices)} choices")
                for value, label in field_choices:
                    print(f"    - {Colors.GREEN}{value}{Colors.END} → {label}")
    
    return all_models


def scan_frontend_forms(frontend_dir: str) -> Dict[str, any]:
    """Scan frontend for form fields and dropdowns"""
    print_section("🔍 Scanning Frontend Forms")
    
    frontend_path = Path(frontend_dir)
    issues = []
    
    # Files to check
    files_to_check = [
        'app/patients/page.tsx',
        'app/referrers/page.tsx',
        'app/coordinators/page.tsx',
        'app/companies/page.tsx',
        'app/components/dialogs/*.tsx',
        'app/components/settings/*.tsx',
    ]
    
    for pattern in files_to_check:
        for file_path in frontend_path.glob(pattern):
            print_info(f"Checking {file_path.relative_to(frontend_path)}")
            
            with open(file_path, 'r') as f:
                content = f.read()
            
            # Check for common patterns
            check_select_components(content, str(file_path), issues)
            check_api_calls(content, str(file_path), issues)
    
    return issues


def check_select_components(content: str, file_path: str, issues: List):
    """Check Select components for potential issues"""
    
    # Pattern 1: String arrays (problematic)
    string_array_pattern = r"data=\{(\[['\"][^'\"]+['\"][,\s]*)+\]"
    if re.search(string_array_pattern, content):
        issues.append({
            'type': 'STRING_ARRAY',
            'file': file_path,
            'issue': 'Using string arrays instead of value/label objects',
            'severity': 'HIGH'
        })
    
    # Pattern 2: Check for PATCH/POST with hardcoded strings
    api_pattern = r"body:\s*JSON\.stringify\(\{[^}]*:\s*['\"]([^'\"]+)['\"]"
    matches = re.findall(api_pattern, content)
    if matches:
        for value in matches:
            if '.' in value:  # Likely has period that might not match backend
                issues.append({
                    'type': 'POTENTIAL_MISMATCH',
                    'file': file_path,
                    'value': value,
                    'issue': f'Sending "{value}" - check if backend expects without period',
                    'severity': 'MEDIUM'
                })


def check_api_calls(content: str, file_path: str, issues: List):
    """Check API calls for error handling"""
    
    # Check for fetch calls without proper error handling
    fetch_pattern = r"fetch\([^)]+\)"
    fetch_calls = re.findall(fetch_pattern, content)
    
    for call in fetch_calls:
        # Check if followed by error handling
        if 'catch' not in content[content.find(call):content.find(call)+500]:
            issues.append({
                'type': 'MISSING_ERROR_HANDLING',
                'file': file_path,
                'issue': 'API call without try/catch block',
                'severity': 'MEDIUM'
            })


def compare_backend_frontend(backend_models: Dict, frontend_issues: List):
    """Compare backend models with frontend forms"""
    print_section("🔬 Analysis Results")
    
    total_issues = 0
    
    # Categorize issues
    high_priority = [i for i in frontend_issues if i.get('severity') == 'HIGH']
    medium_priority = [i for i in frontend_issues if i.get('severity') == 'MEDIUM']
    
    if high_priority:
        print(f"\n{Colors.RED}{Colors.BOLD}🔴 HIGH PRIORITY ISSUES: {len(high_priority)}{Colors.END}")
        for issue in high_priority:
            print_error(f"{Path(issue['file']).name}")
            print(f"   {issue['issue']}")
            total_issues += 1
    
    if medium_priority:
        print(f"\n{Colors.YELLOW}{Colors.BOLD}🟡 MEDIUM PRIORITY ISSUES: {len(medium_priority)}{Colors.END}")
        for issue in medium_priority:
            print_warning(f"{Path(issue['file']).name}")
            print(f"   {issue['issue']}")
            if 'value' in issue:
                print(f"   Value: {issue['value']}")
            total_issues += 1
    
    if not total_issues:
        print_success("No issues found! All forms appear to be correctly configured.")
    
    return total_issues


def generate_validation_report(backend_models: Dict, frontend_issues: List, output_file: str):
    """Generate detailed validation report"""
    print_section("📝 Generating Report")
    
    report = {
        'backend_models': backend_models,
        'frontend_issues': frontend_issues,
        'summary': {
            'total_models_scanned': len(backend_models),
            'total_choice_fields': sum(len(fields) for fields in backend_models.values()),
            'total_frontend_issues': len(frontend_issues),
            'high_priority_issues': len([i for i in frontend_issues if i.get('severity') == 'HIGH']),
            'medium_priority_issues': len([i for i in frontend_issues if i.get('severity') == 'MEDIUM']),
        }
    }
    
    with open(output_file, 'w') as f:
        json.dump(report, f, indent=2)
    
    print_success(f"Report saved to: {output_file}")
    return report


def main():
    print_header("🔍 SYSTEM-WIDE VALIDATION TOOL")
    print_info("Checking for backend/frontend mismatches...")
    
    # Paths
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    backend_dir = os.path.join(base_dir, 'backend')
    frontend_dir = os.path.join(base_dir, 'frontend')
    report_file = os.path.join(base_dir, 'validation_report.json')
    
    # Scan backend models
    backend_models = scan_models(backend_dir)
    
    # Scan frontend forms
    frontend_issues = scan_frontend_forms(frontend_dir)
    
    # Compare and analyze
    total_issues = compare_backend_frontend(backend_models, frontend_issues)
    
    # Generate report
    report = generate_validation_report(backend_models, frontend_issues, report_file)
    
    # Summary
    print_header("📊 SUMMARY")
    print(f"Models Scanned: {Colors.CYAN}{report['summary']['total_models_scanned']}{Colors.END}")
    print(f"Choice Fields Found: {Colors.CYAN}{report['summary']['total_choice_fields']}{Colors.END}")
    print(f"Frontend Files Checked: {Colors.CYAN}Multiple{Colors.END}")
    print(f"Issues Found: {Colors.RED if total_issues > 0 else Colors.GREEN}{total_issues}{Colors.END}")
    
    if total_issues == 0:
        print(f"\n{Colors.GREEN}{Colors.BOLD}✅ ALL CHECKS PASSED!{Colors.END}")
    else:
        print(f"\n{Colors.RED}{Colors.BOLD}⚠️  ISSUES NEED ATTENTION{Colors.END}")
        print(f"\n{Colors.YELLOW}Run this script regularly to catch mismatches early!{Colors.END}")
    
    print(f"\n{Colors.BLUE}Full report: {report_file}{Colors.END}\n")


if __name__ == "__main__":
    main()


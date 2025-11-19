#!/usr/bin/env python3
"""
Deep dive script to find ALL sources of green color in emails

This script checks:
1. Email templates in database
2. Default colors in code
3. EmailGlobalSettings
4. Any hardcoded green values

Run this to diagnose where green is coming from!
"""

import os
import sys
import django

# Setup Django
sys.path.append('/Users/craig/Documents/nexus-core-clinic/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ncc_api.settings')
django.setup()

from invoices.models import EmailTemplate, EmailGlobalSettings

print("=" * 80)
print("🔍 DEEP DIVE: Finding ALL Green Colors in Email System")
print("=" * 80)
print()

# 1. Check Email Templates
print("1️⃣ Checking Email Templates in Database...")
print("-" * 80)

green_templates = EmailTemplate.objects.filter(header_color='#10b981')
blue_templates = EmailTemplate.objects.filter(header_color='#5b95cf')
other_templates = EmailTemplate.objects.exclude(header_color__in=['#10b981', '#5b95cf'])

print(f"📊 Template Color Statistics:")
print(f"   ❌ GREEN templates (#10b981): {green_templates.count()}")
print(f"   ✅ BLUE templates (#5b95cf):  {blue_templates.count()}")
print(f"   ⚠️  OTHER colors:              {other_templates.count()}")
print()

if green_templates.exists():
    print("❌ FOUND GREEN TEMPLATES:")
    for template in green_templates:
        print(f"   - ID {template.id}: {template.name} ({template.category}) - {template.header_color}")
    print()
    print("💡 FIX: Run this command to update:")
    print("   cd /Users/craig/Documents/nexus-core-clinic/backend")
    print("   python3 manage.py update_template_colors")
    print()
else:
    print("✅ No green templates found!")
    print()

# 2. Check Email Global Settings
print("2️⃣ Checking Email Global Settings...")
print("-" * 80)

settings = EmailGlobalSettings.get_settings()
print(f"   use_email_signatures: {settings.use_email_signatures}")
print(f"   company_signature_email: {settings.company_signature_email}")
print(f"   company_signature_html set: {bool(settings.company_signature_html)}")
print()

# 3. Check for green in code (hardcoded)
print("3️⃣ Checking for Hardcoded Green in Code...")
print("-" * 80)

import subprocess

try:
    # Search for green hex codes
    result = subprocess.run(
        ['grep', '-r', '-i', '#10b981', '/Users/craig/Documents/nexus-core-clinic/backend/invoices'],
        capture_output=True,
        text=True
    )
    
    green_in_code = [line for line in result.stdout.split('\n') if line.strip() and not any(x in line for x in ['migrations', '.pyc', '__pycache__'])]
    
    if green_in_code:
        print("⚠️  Found green in code:")
        for line in green_in_code[:10]:  # Limit to 10 lines
            print(f"   {line}")
        print()
    else:
        print("✅ No hardcoded green found in invoices app!")
        print()
except Exception as e:
    print(f"⚠️  Could not check code: {e}")
    print()

# 4. Test email generation
print("4️⃣ Testing Email Generator Defaults...")
print("-" * 80)

from invoices.email_generator import EmailGenerator

for email_type in ['invoice', 'receipt', 'quote']:
    default_color = EmailGenerator.DEFAULT_COLORS.get(email_type)
    if default_color == '#10b981':
        print(f"   ❌ {email_type}: {default_color} (GREEN!)")
    elif default_color == '#5b95cf':
        print(f"   ✅ {email_type}: {default_color} (BLUE)")
    else:
        print(f"   ⚠️  {email_type}: {default_color}")

print()

# Summary
print("=" * 80)
print("📋 SUMMARY")
print("=" * 80)

issues_found = []

if green_templates.exists():
    issues_found.append(f"❌ {green_templates.count()} green template(s) in database")

if issues_found:
    print("🚨 ISSUES FOUND:")
    for issue in issues_found:
        print(f"   {issue}")
    print()
    print("💡 TO FIX:")
    print("   1. Run: python3 manage.py update_template_colors")
    print("   2. Restart Django server")
    print("   3. Send test email")
    print()
else:
    print("✅ NO ISSUES FOUND!")
    print()
    print("If you're still seeing green emails:")
    print("   1. Check if you're looking at OLD emails (cached)")
    print("   2. Clear browser cache")
    print("   3. Check email client cache")
    print("   4. Send a NEW test email")
    print()

print("=" * 80)


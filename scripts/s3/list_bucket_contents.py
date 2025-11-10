#!/usr/bin/env python3
"""
List all files in the S3 bucket to see what we have before emptying it.
"""
import os
import sys
from dotenv import load_dotenv
import boto3
from datetime import datetime

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../backend'))
load_dotenv(os.path.join(os.path.dirname(__file__), '../../backend/.env'))

def list_bucket_contents():
    """List all files in the S3 bucket with details"""
    
    # Get credentials from environment
    bucket_name = os.getenv('AWS_S3_BUCKET_NAME')
    region = os.getenv('AWS_REGION', 'ap-southeast-2')
    
    if not bucket_name:
        print("❌ AWS_S3_BUCKET_NAME not found in .env")
        return
    
    print(f"📦 Bucket: {bucket_name}")
    print(f"🌏 Region: {region}")
    print("=" * 80)
    
    # Initialize S3 client
    s3_client = boto3.client(
        's3',
        aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
        aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
        region_name=region
    )
    
    try:
        # List all objects
        paginator = s3_client.get_paginator('list_objects_v2')
        pages = paginator.paginate(Bucket=bucket_name)
        
        total_files = 0
        total_size = 0
        folders = {}
        
        for page in pages:
            if 'Contents' not in page:
                continue
                
            for obj in page['Contents']:
                key = obj['Key']
                size = obj['Size']
                last_modified = obj['LastModified']
                
                # Extract folder (first part of path)
                folder = key.split('/')[0] if '/' in key else 'root'
                
                if folder not in folders:
                    folders[folder] = {'count': 0, 'size': 0, 'files': []}
                
                folders[folder]['count'] += 1
                folders[folder]['size'] += size
                folders[folder]['files'].append({
                    'key': key,
                    'size': size,
                    'last_modified': last_modified
                })
                
                total_files += 1
                total_size += size
        
        # Print summary
        print(f"\n📊 SUMMARY:")
        print(f"Total Files: {total_files}")
        print(f"Total Size: {total_size / (1024*1024):.2f} MB ({total_size / (1024*1024*1024):.2f} GB)")
        print(f"Folders: {len(folders)}")
        
        # Print by folder
        print(f"\n📁 BY FOLDER:")
        for folder, data in sorted(folders.items()):
            size_mb = data['size'] / (1024*1024)
            print(f"\n  {folder}/")
            print(f"    Files: {data['count']}")
            print(f"    Size: {size_mb:.2f} MB")
            
            # Show first 5 files
            print(f"    Sample files:")
            for file in data['files'][:5]:
                file_size = file['size'] / 1024
                print(f"      - {file['key']} ({file_size:.1f} KB)")
            
            if data['count'] > 5:
                print(f"      ... and {data['count'] - 5} more files")
        
        print("\n" + "=" * 80)
        
        if total_files == 0:
            print("✅ Bucket is empty!")
        else:
            print(f"⚠️  Bucket contains {total_files} files")
            print(f"💾 Total size: {total_size / (1024*1024):.2f} MB")
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == '__main__':
    list_bucket_contents()


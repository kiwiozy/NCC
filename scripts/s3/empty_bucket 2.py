#!/usr/bin/env python3
"""
Empty the S3 bucket (DELETE ALL FILES)

⚠️  WARNING: This will delete ALL files in the bucket!
    Make sure you have backed up anything important first!
"""
import os
import sys
from dotenv import load_dotenv
import boto3

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../backend'))
load_dotenv(os.path.join(os.path.dirname(__file__), '../../backend/.env'))

def empty_bucket():
    """Delete all objects from the S3 bucket"""
    
    # Get credentials from environment
    bucket_name = os.getenv('AWS_S3_BUCKET_NAME')
    region = os.getenv('AWS_REGION', 'ap-southeast-2')
    
    if not bucket_name:
        print("❌ AWS_S3_BUCKET_NAME not found in .env")
        return
    
    print("=" * 80)
    print("⚠️  S3 BUCKET DELETION SCRIPT")
    print("=" * 80)
    print(f"📦 Bucket: {bucket_name}")
    print(f"🌏 Region: {region}")
    print()
    print("⚠️  WARNING: This will DELETE ALL FILES in the bucket!")
    print("   Make sure you have backed up anything important first!")
    print()
    
    # Confirm deletion
    confirmation = input("Type 'DELETE ALL' to confirm: ")
    if confirmation != "DELETE ALL":
        print("❌ Deletion cancelled.")
        return
    
    print("\n🔍 Counting files...")
    
    # Initialize S3 client
    s3_client = boto3.client(
        's3',
        aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
        aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
        region_name=region
    )
    
    try:
        # Count total files
        paginator = s3_client.get_paginator('list_objects_v2')
        pages = paginator.paginate(Bucket=bucket_name)
        
        total_files = 0
        for page in pages:
            if 'Contents' in page:
                total_files += len(page['Contents'])
        
        if total_files == 0:
            print("✅ Bucket is already empty!")
            return
        
        print(f"📊 Found {total_files} files to delete")
        
        # Final confirmation
        final_confirm = input(f"\n⚠️  Are you ABSOLUTELY SURE you want to delete {total_files} files? (yes/no): ")
        if final_confirm.lower() != 'yes':
            print("❌ Deletion cancelled.")
            return
        
        print(f"\n🗑️  Deleting {total_files} files...")
        
        # Delete all objects
        deleted_count = 0
        pages = paginator.paginate(Bucket=bucket_name)
        
        for page in pages:
            if 'Contents' not in page:
                continue
            
            # Batch delete (max 1000 at a time)
            objects = [{'Key': obj['Key']} for obj in page['Contents']]
            
            if objects:
                response = s3_client.delete_objects(
                    Bucket=bucket_name,
                    Delete={'Objects': objects}
                )
                
                deleted_count += len(response.get('Deleted', []))
                print(f"   Deleted {deleted_count}/{total_files} files...", end='\r')
        
        print(f"\n\n✅ Successfully deleted {deleted_count} files!")
        print(f"📦 Bucket '{bucket_name}' is now empty")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")

if __name__ == '__main__':
    empty_bucket()


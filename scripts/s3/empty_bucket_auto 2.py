#!/usr/bin/env python3
"""
Empty S3 bucket - NON-INTERACTIVE VERSION
For automated cleanup before FileMaker import
"""
import os
import sys
import boto3
from botocore.exceptions import ClientError

# Add backend to path to use S3Service
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ncc_api.settings')

# Load Django settings for environment variables
import django
django.setup()

from documents.services import S3Service

def empty_bucket():
    """Empty all files from S3 bucket"""
    print("=" * 80)
    print("🗑️  EMPTYING S3 BUCKET")
    print("=" * 80)
    
    s3_service = S3Service()
    bucket_name = s3_service.bucket_name
    
    print(f"📦 Bucket: {bucket_name}")
    print(f"🌏 Region: {s3_service.region}")
    print()
    
    try:
        # List all objects
        print("📋 Listing all objects...")
        response = s3_service.s3_client.list_objects_v2(Bucket=bucket_name)
        
        if 'Contents' not in response:
            print("✅ Bucket is already empty!")
            return
        
        total_files = len(response['Contents'])
        total_size = sum(obj['Size'] for obj in response['Contents'])
        
        print(f"📊 Found {total_files} files")
        print(f"📦 Total size: {total_size / (1024*1024):.2f} MB")
        print()
        
        # Delete all objects
        print("🗑️  Deleting all objects...")
        objects_to_delete = [{'Key': obj['Key']} for obj in response['Contents']]
        
        if objects_to_delete:
            delete_response = s3_service.s3_client.delete_objects(
                Bucket=bucket_name,
                Delete={'Objects': objects_to_delete}
            )
            
            deleted_count = len(delete_response.get('Deleted', []))
            print(f"✅ Deleted {deleted_count} files")
            
            if 'Errors' in delete_response:
                print(f"⚠️  Errors: {len(delete_response['Errors'])}")
                for error in delete_response['Errors']:
                    print(f"   - {error['Key']}: {error['Message']}")
        
        # Check if there are more objects (pagination)
        while response.get('IsTruncated', False):
            print("📋 Fetching more objects...")
            response = s3_service.s3_client.list_objects_v2(
                Bucket=bucket_name,
                ContinuationToken=response['NextContinuationToken']
            )
            
            if 'Contents' in response:
                objects_to_delete = [{'Key': obj['Key']} for obj in response['Contents']]
                delete_response = s3_service.s3_client.delete_objects(
                    Bucket=bucket_name,
                    Delete={'Objects': objects_to_delete}
                )
                deleted_count = len(delete_response.get('Deleted', []))
                print(f"✅ Deleted {deleted_count} more files")
        
        print()
        print("=" * 80)
        print("✅ BUCKET EMPTIED SUCCESSFULLY")
        print("=" * 80)
        print(f"🎯 Ready for FileMaker import with clean folder structure")
        
    except ClientError as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

if __name__ == '__main__':
    empty_bucket()


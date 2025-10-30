import os
import uuid
import mimetypes
from datetime import timedelta
from django.conf import settings
import boto3
from botocore.exceptions import ClientError


class S3Service:
    """Service for interacting with AWS S3 for document storage"""
    
    def __init__(self):
        self.region = os.getenv('AWS_REGION', 'ap-southeast-2')
        self.s3_client = boto3.client(
            's3',
            aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
            region_name=self.region,
            config=boto3.session.Config(
                signature_version='s3v4',
                s3={'addressing_style': 'virtual'}
            )
        )
        self.bucket_name = os.getenv('AWS_S3_BUCKET_NAME')
        
        if not self.bucket_name:
            raise ValueError("AWS_S3_BUCKET_NAME must be set in environment variables")
    
    def generate_s3_key(self, filename, folder='documents'):
        """Generate a unique S3 key for a file"""
        ext = os.path.splitext(filename)[1]
        unique_id = str(uuid.uuid4())
        return f"{folder}/{unique_id}{ext}"
    
    def upload_file(self, file_obj, filename, folder='documents', metadata=None):
        """
        Upload a file to S3
        
        Args:
            file_obj: File object to upload (Django UploadedFile)
            filename: Original filename
            folder: S3 folder/prefix
            metadata: Optional dict of metadata
            
        Returns:
            dict with 's3_key', 's3_bucket', 'file_size', 'mime_type'
        """
        try:
            s3_key = self.generate_s3_key(filename, folder)
            
            # Determine MIME type
            mime_type = mimetypes.guess_type(filename)[0] or 'application/octet-stream'
            
            # Prepare upload arguments
            extra_args = {
                'ContentType': mime_type,
                'ContentDisposition': f'attachment; filename="{filename}"',
            }
            
            if metadata:
                extra_args['Metadata'] = metadata
            
            # Upload file
            file_obj.seek(0)  # Reset file pointer
            self.s3_client.upload_fileobj(
                file_obj,
                self.bucket_name,
                s3_key,
                ExtraArgs=extra_args
            )
            
            return {
                's3_bucket': self.bucket_name,
                's3_key': s3_key,
                'file_size': file_obj.size,
                'mime_type': mime_type,
            }
            
        except ClientError as e:
            raise Exception(f"Failed to upload to S3: {str(e)}")
    
    def generate_presigned_url(self, s3_key, expiration=3600, filename=None):
        """
        Generate a pre-signed URL for accessing a file
        
        Args:
            s3_key: S3 object key
            expiration: URL expiration time in seconds (default 1 hour)
            filename: Optional filename (not used - kept for compatibility)
            
        Returns:
            Pre-signed URL string
        """
        try:
            # Generate simple pre-signed URL
            # ContentDisposition is already set on the S3 object during upload
            url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': self.bucket_name,
                    'Key': s3_key
                },
                ExpiresIn=expiration,
                HttpMethod='GET'
            )
            return url
        except ClientError as e:
            raise Exception(f"Failed to generate pre-signed URL: {str(e)}")
    
    def delete_file(self, s3_key):
        """
        Delete a file from S3
        
        Args:
            s3_key: S3 object key to delete
            
        Returns:
            Boolean indicating success
        """
        try:
            self.s3_client.delete_object(
                Bucket=self.bucket_name,
                Key=s3_key
            )
            return True
        except ClientError as e:
            raise Exception(f"Failed to delete from S3: {str(e)}")
    
    def list_files(self, prefix='documents/', max_keys=1000):
        """
        List files in S3 bucket with given prefix
        
        Args:
            prefix: S3 key prefix to filter
            max_keys: Maximum number of keys to return
            
        Returns:
            List of file metadata dicts
        """
        try:
            response = self.s3_client.list_objects_v2(
                Bucket=self.bucket_name,
                Prefix=prefix,
                MaxKeys=max_keys
            )
            
            files = []
            if 'Contents' in response:
                for obj in response['Contents']:
                    files.append({
                        'key': obj['Key'],
                        'size': obj['Size'],
                        'last_modified': obj['LastModified'],
                    })
            
            return files
            
        except ClientError as e:
            raise Exception(f"Failed to list S3 files: {str(e)}")
    
    def check_file_exists(self, s3_key):
        """
        Check if a file exists in S3
        
        Args:
            s3_key: S3 object key
            
        Returns:
            Boolean indicating if file exists
        """
        try:
            self.s3_client.head_object(
                Bucket=self.bucket_name,
                Key=s3_key
            )
            return True
        except ClientError as e:
            if e.response['Error']['Code'] == '404':
                return False
            raise Exception(f"Failed to check file existence: {str(e)}")
    
    def get_bucket_info(self):
        """
        Get information about the S3 bucket
        
        Returns:
            dict with bucket information
        """
        try:
            # Check if bucket exists and is accessible
            self.s3_client.head_bucket(Bucket=self.bucket_name)
            
            # Get bucket region
            location = self.s3_client.get_bucket_location(Bucket=self.bucket_name)
            region = location['LocationConstraint'] or 'us-east-1'
            
            return {
                'bucket_name': self.bucket_name,
                'region': region,
                'accessible': True,
            }
        except ClientError as e:
            return {
                'bucket_name': self.bucket_name,
                'accessible': False,
                'error': str(e),
            }


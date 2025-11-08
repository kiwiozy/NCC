"""
MMS Service - Handle multimedia messaging (image upload/download)

Provides:
- Upload images to S3 for outbound MMS
- Download inbound MMS media from SMS Broadcast
- Image validation, resizing, and format conversion (including HEIC)
"""
import uuid
import requests
from io import BytesIO
from PIL import Image as PILImage
from django.conf import settings
from documents.services import S3Service


class MMSService:
    """
    Service for handling MMS (Multimedia Messaging Service) operations
    
    Features:
    - Upload images to S3 for sending via SMS Broadcast
    - Download inbound MMS images from SMS Broadcast to our S3
    - Auto-resize images to meet carrier limits (≤600KB, ≤1024px)
    - Convert HEIC/HEIF (iPhone photos) to JPEG
    - Validate image formats and sizes
    """
    
    def __init__(self):
        self.s3_service = S3Service()
        self.max_file_size = 600 * 1024  # 600KB (carrier limit)
        self.max_dimension = 1024  # Max width/height in pixels
        self.supported_formats = ['JPEG', 'PNG', 'GIF']
        self.supported_mime_types = ['image/jpeg', 'image/png', 'image/gif', 'image/heic', 'image/heif']
    
    def validate_media(self, file) -> tuple[bool, str]:
        """
        Validate image file for MMS sending
        
        Args:
            file: Django UploadedFile object
            
        Returns:
            (is_valid, error_message)
        """
        # Check MIME type
        content_type = getattr(file, 'content_type', '')
        if content_type not in self.supported_mime_types:
            return False, f"Unsupported file type: {content_type}. Supported: JPEG, PNG, GIF, HEIC"
        
        # We no longer reject based on size - we'll auto-resize instead
        # Size validation is just informational
        
        return True, ""
    
    def convert_heic_to_jpeg(self, file_content: bytes) -> tuple[bytes, str]:
        """
        Convert HEIC/HEIF image to JPEG
        
        Args:
            file_content: Raw image bytes (HEIC format)
            
        Returns:
            (jpeg_bytes, mime_type)
        """
        try:
            # Import pillow_heif to register HEIC support with Pillow
            from pillow_heif import register_heif_opener
            register_heif_opener()
            
            # Open HEIC image
            img = PILImage.open(BytesIO(file_content))
            
            # Convert to RGB if needed (HEIC can be RGBA)
            if img.mode in ('RGBA', 'LA', 'P'):
                # Create white background
                background = PILImage.new('RGB', img.size, (255, 255, 255))
                if img.mode == 'P':
                    img = img.convert('RGBA')
                background.paste(img, mask=img.split()[-1] if img.mode in ('RGBA', 'LA') else None)
                img = background
            elif img.mode != 'RGB':
                img = img.convert('RGB')
            
            # Save as JPEG
            output = BytesIO()
            img.save(output, format='JPEG', quality=85, optimize=True)
            output.seek(0)
            
            return output.read(), 'image/jpeg'
            
        except Exception as e:
            print(f"❌ HEIC conversion failed: {str(e)}")
            raise ValueError(f"Failed to convert HEIC image: {str(e)}")
    
    def resize_image(self, file_content: bytes, mime_type: str) -> tuple[bytes, int, int, int]:
        """
        Resize image to meet MMS requirements (≤600KB, ≤1024px)
        
        Args:
            file_content: Raw image bytes
            mime_type: MIME type (image/jpeg, image/png, etc.)
            
        Returns:
            (resized_bytes, width, height, file_size)
        """
        try:
            # Open image
            img = PILImage.open(BytesIO(file_content))
            original_width, original_height = img.size
            
            # Convert format if needed
            pil_format = 'JPEG'
            if 'png' in mime_type.lower():
                pil_format = 'PNG'
            elif 'gif' in mime_type.lower():
                pil_format = 'GIF'
            
            # Handle transparency for JPEG
            if pil_format == 'JPEG' and img.mode in ('RGBA', 'LA', 'P'):
                # Create white background
                background = PILImage.new('RGB', img.size, (255, 255, 255))
                if img.mode == 'P':
                    img = img.convert('RGBA')
                background.paste(img, mask=img.split()[-1] if img.mode in ('RGBA', 'LA') else None)
                img = background
            elif pil_format == 'JPEG' and img.mode != 'RGB':
                img = img.convert('RGB')
            
            # Resize if dimensions exceed max (maintain aspect ratio)
            if original_width > self.max_dimension or original_height > self.max_dimension:
                img.thumbnail((self.max_dimension, self.max_dimension), PILImage.Resampling.LANCZOS)
                print(f"  🔄 Resized from {original_width}x{original_height} to {img.size[0]}x{img.size[1]}")
            
            # Save with quality adjustment to meet size limit
            quality = 85
            while quality > 20:
                output = BytesIO()
                img.save(output, format=pil_format, quality=quality, optimize=True)
                output_size = output.tell()
                
                if output_size <= self.max_file_size:
                    output.seek(0)
                    print(f"  ✅ Final size: {output_size} bytes ({round(output_size/1024, 1)} KB) at quality {quality}")
                    return output.read(), img.size[0], img.size[1], output_size
                
                # Reduce quality if still too large
                quality -= 10
                print(f"  🔄 Reducing quality to {quality} (current size: {round(output_size/1024, 1)} KB)")
            
            # If we get here, even minimum quality is too large
            # Return it anyway and let SMS provider handle it
            output.seek(0)
            return output.read(), img.size[0], img.size[1], output_size
            
        except Exception as e:
            print(f"❌ Image resize failed: {str(e)}")
            raise ValueError(f"Failed to resize image: {str(e)}")
    
    def upload_media_for_sending(self, file, original_filename: str = None) -> dict:
        """
        Upload media file to S3 for outbound MMS
        Handles HEIC conversion, resizing, and format validation
        
        Args:
            file: Django UploadedFile object
            original_filename: Original filename (optional)
            
        Returns:
            {
                'media_url': 'https://s3.../mms/outbound/uuid.jpg',
                'media_type': 'image/jpeg',
                'media_size': 12345,
                'media_filename': 'image.jpg',
                's3_key': 'mms/outbound/uuid.jpg',
                'width': 800,
                'height': 600
            }
        """
        print(f"📤 Uploading MMS media: {file.name} ({file.size} bytes, {file.content_type})")
        
        # Validate
        is_valid, error = self.validate_media(file)
        if not is_valid:
            raise ValueError(error)
        
        # Read file content
        file.seek(0)
        file_content = file.read()
        mime_type = file.content_type
        
        # Convert HEIC if needed
        if mime_type in ['image/heic', 'image/heif']:
            print("  🔄 Converting HEIC to JPEG...")
            file_content, mime_type = self.convert_heic_to_jpeg(file_content)
        
        # Resize to meet MMS requirements
        print("  🔄 Resizing/optimizing image...")
        resized_content, width, height, final_size = self.resize_image(file_content, mime_type)
        
        # Generate S3 key
        file_ext = 'jpg' if 'jpeg' in mime_type else mime_type.split('/')[-1]
        s3_key = f"mms/outbound/{uuid.uuid4()}.{file_ext}"
        
        # Upload to S3
        print(f"  📤 Uploading to S3: {s3_key}")
        self.s3_service.s3_client.put_object(
            Bucket=self.s3_service.bucket_name,
            Key=s3_key,
            Body=resized_content,
            ContentType=mime_type,
            # Make publicly readable for SMS Broadcast to fetch
            ACL='public-read'
        )
        
        # Generate public URL
        media_url = f"https://{self.s3_service.bucket_name}.s3.{settings.AWS_S3_REGION_NAME}.amazonaws.com/{s3_key}"
        
        print(f"  ✅ Upload complete: {media_url}")
        
        return {
            'media_url': media_url,
            'media_type': mime_type,
            'media_size': final_size,
            'media_filename': original_filename or file.name,
            's3_key': s3_key,
            'width': width,
            'height': height,
        }
    
    def download_inbound_media(self, provider_url: str, message_id: str) -> dict:
        """
        Download inbound MMS media from SMS Broadcast to our S3
        
        Args:
            provider_url: URL to image on SMS Broadcast's server
            message_id: UUID of the SMSInbound message
            
        Returns:
            {
                'media_downloaded_url': 'https://s3.../mms/inbound/uuid/image.jpg',
                's3_key': 'mms/inbound/uuid/image.jpg',
                'media_type': 'image/jpeg',
                'media_size': 12345,
                'width': 800,
                'height': 600
            }
        """
        print(f"📥 Downloading inbound MMS from: {provider_url}")
        
        try:
            # Download from SMS Broadcast
            response = requests.get(provider_url, timeout=30)
            response.raise_for_status()
            
            file_content = response.content
            mime_type = response.headers.get('Content-Type', 'image/jpeg')
            
            print(f"  ✅ Downloaded: {len(file_content)} bytes, {mime_type}")
            
            # Determine file extension
            file_ext = 'jpg'
            if 'png' in mime_type.lower():
                file_ext = 'png'
            elif 'gif' in mime_type.lower():
                file_ext = 'gif'
            
            # Generate S3 key
            s3_key = f"mms/inbound/{message_id}/{uuid.uuid4()}.{file_ext}"
            
            # Get image dimensions
            img = PILImage.open(BytesIO(file_content))
            width, height = img.size
            
            # Upload to our S3
            print(f"  📤 Uploading to S3: {s3_key}")
            self.s3_service.s3_client.put_object(
                Bucket=self.s3_service.bucket_name,
                Key=s3_key,
                Body=file_content,
                ContentType=mime_type
            )
            
            # Generate presigned URL for private access
            media_url = self.s3_service.generate_presigned_url(
                s3_key,
                expiration=3600 * 24 * 7  # 7 days
            )
            
            print(f"  ✅ Inbound MMS saved to S3")
            
            return {
                'media_downloaded_url': media_url,
                's3_key': s3_key,
                'media_type': mime_type,
                'media_size': len(file_content),
                'width': width,
                'height': height,
            }
            
        except Exception as e:
            print(f"❌ Failed to download inbound MMS: {str(e)}")
            raise ValueError(f"Failed to download media: {str(e)}")


# Singleton instance
mms_service = MMSService()


# 📷 Image Upload Test Feature

This document outlines the functionality and implementation of the `ImageUploadTest` component, designed for testing image uploads to AWS S3 with **thumbnail generation**, drag-and-drop, batch processing, and a full-size viewer.

## 🎯 Purpose

The primary purpose of this component is to provide a robust testing ground for:
- Verifying S3 connectivity and upload functionality.
- **Testing automatic thumbnail generation (300x300 max)**.
- Testing drag-and-drop image uploads.
- Handling multiple image uploads (batch processing).
- Displaying uploaded images as thumbnails.
- Providing a full-size image viewer.
- Ensuring images are served correctly via presigned S3 URLs.

## ✨ Features

1.  **Drag-and-Drop Upload**: Users can drag and drop image files directly onto a designated area.
2.  **Click-to-Select**: Traditional file selection via a file browser is also supported.
3.  **Batch Upload**: Multiple images (up to 20) can be selected and uploaded simultaneously.
4.  **File Validation**:
    *   **Type**: Only image files (`IMAGE_MIME_TYPE`) are accepted.
    *   **Size**: Each image file has a maximum size limit of 10MB.
5.  **Upload Progress**: Displays "Creating batch..." and "Uploading X image(s) with thumbnail generation..." during batch uploads.
6.  **File Management**: Users can remove individual files from the selection before initiating the upload.
7.  **S3 Integration**: Uploads files directly to the configured AWS S3 bucket.
8.  **Automatic Thumbnail Generation**: Backend uses Pillow (PIL) to generate 300x300 thumbnails during upload.
9.  **Image Dimensions**: Extracts and stores width and height of original images.
10. **Thumbnail Gallery**: Successfully uploaded images are displayed in a responsive grid of thumbnails (using the generated thumbnail if available).
11. **Full-Size Viewer**: Clicking on a thumbnail opens a modal dialog displaying the full-size image along with its details (filename, size, type, dimensions, S3 keys).
12. **Visual Indicators**: Green dot badge shows which images have thumbnails generated.
13. **Presigned URLs**: Images are served using AWS S3 presigned URLs (1-hour expiration) to avoid CORS issues.

## 🛠️ Implementation Details

### Frontend (`frontend/app/components/settings/ImageUploadTest.tsx`)

*   **State Management**:
    *   `files`: An array of `File` objects representing selected images for upload.
    *   `uploading`: Boolean to indicate if an upload operation is in progress.
    *   `uploadedImages`: An array of `UploadedImage` objects (containing `id`, `original_name`, `s3_key`, `s3_thumbnail_key`, `download_url`, `thumbnail_url`, `mime_type`, `file_size`, `width`, `height`) for successfully uploaded images.
    *   `error`: Stores any error messages during validation or upload.
    *   `viewerOpen`: Controls the visibility of the full-size image viewer modal.
    *   `selectedImage`: Stores the `UploadedImage` object of the image currently selected for full-size viewing.
    *   `uploadProgress`: Displays the current upload stage (batch creation or image upload).
*   **`Dropzone` Component**:
    *   Configured with `multiple` prop to allow multiple file selection.
    *   `maxSize={10 * 1024 * 1024}`: Sets the maximum file size to 10MB.
    *   `accept={IMAGE_MIME_TYPE}`: Restricts file types to images.
    *   `onDrop`: Adds dropped files to the `files` state, enforcing a maximum of 20 files.
    *   `onReject`: Sets an error message if files are rejected (e.g., due to size).
*   **`handleUpload` Function**:
    1.  **Creates a batch** via `POST /api/images/batches/` with batch metadata.
    2.  **Uploads images** via `POST /api/images/batches/{id}/upload/` with `FormData` containing all files.
    3.  Handles successful responses (201) by adding the returned image data to `uploadedImages`.
    4.  Handles errors and displays error messages.
    5.  Provides real-time `uploadProgress` updates.
*   **Image Display**:
    *   A `Group` component renders `MantineImage` components for each `uploadedImage` as thumbnails.
    *   Uses `img.thumbnail_url || img.download_url` to prefer thumbnails when available.
    *   Each thumbnail is clickable, setting `selectedImage` and opening the `viewerOpen` modal.
    *   Green badge with dot indicator shows when thumbnails were generated.
*   **`Modal` Component**:
    *   Displays the `selectedImage` in full size using `MantineImage`.
    *   The `src` uses `selectedImage.download_url` (presigned S3 URL for full image).
    *   Shows additional details like filename, size, type, dimensions, S3 key, and thumbnail key.

### Backend (Images API - Django REST Framework)

The `ImageUploadTest` component uses the new Images API endpoints:

#### API Endpoints

1.  **`POST /api/images/batches/`** - Create a new image batch
    *   **Body**: `{ name, description, content_type: "patients.patient", object_id: "uuid" }`
    *   **Response**: Batch object with `id`, `name`, `description`, etc.

2.  **`POST /api/images/batches/{id}/upload/`** - Upload images to a batch
    *   **Body**: `FormData` with:
        *   `images`: File[] (multiple files)
        *   `categories`: string[] (category for each image, e.g., "other")
        *   `captions`: string[] (optional captions)
    *   **Process**:
        1.  Opens each image with **Pillow (PIL)** to extract dimensions
        2.  Generates a **thumbnail** (300x300 max) using `PIL.Image.thumbnail()`
        3.  Saves thumbnail as JPEG with 85% quality
        4.  Uploads **full image** to S3 at `images/{patient_id}/{batch_id}/{uuid}.ext`
        5.  Uploads **thumbnail** to S3 at `images/{patient_id}/{batch_id}/{uuid}_thumb.ext`
        6.  Creates `Image` record with both S3 keys and dimensions
    *   **Response**: `{ success: N, uploaded: [...], errors: [...], batch: {...} }`

#### Models

*   **`ImageBatch`** - Groups images together
    *   Fields: `id`, `name`, `description`, `content_type`, `object_id`, `uploaded_by`, `uploaded_at`, `image_count`
    *   Generic FK allows linking to any model (Patient, Appointment, etc.)

*   **`Image`** - Individual image with metadata
    *   Fields: `id`, `batch`, `s3_key`, `s3_thumbnail_key`, `original_name`, `file_size`, `mime_type`, `width`, `height`, `category`, `caption`, `date_taken`, `order`
    *   **`s3_key`**: Full-size image path in S3
    *   **`s3_thumbnail_key`**: Thumbnail path in S3 (nullable, set if generation succeeds)

#### Serializers

*   **`ImageSerializer`** - Returns image data with presigned URLs
    *   **`download_url`**: Presigned S3 URL for full image (1-hour expiration)
    *   **`thumbnail_url`**: Presigned S3 URL for thumbnail (1-hour expiration, null if no thumbnail)
    *   Includes: `id`, `original_name`, `file_size`, `mime_type`, `width`, `height`, `s3_key`, `s3_thumbnail_key`, `download_url`, `thumbnail_url`

#### Thumbnail Generation

*   Uses **Pillow (PIL)** library for image processing
*   Thumbnail size: **300x300 pixels** (maintains aspect ratio)
*   Quality: **85%** JPEG compression
*   Stored in S3 with `_thumb` suffix (e.g., `abc123.jpeg` → `abc123_thumb.jpeg`)
*   If thumbnail generation fails, upload continues without thumbnail

## 🧪 How to Test Thumbnail Generation

1.  **Navigate to the Testing Page**: Open your browser and go to `https://localhost:3000/testing?tab=images`.
2.  **Select Images**:
    *   **Drag & Drop**: Drag one or more image files (up to 20, max 10MB each) from your computer onto the designated dropzone area.
    *   **Click to Select**: Click anywhere on the dropzone area to open your file browser and select multiple image files.
3.  **Review Selected Files**: A blue alert will appear listing all selected files. You can remove individual files if needed.
4.  **Upload**: Click the "Upload X Images to S3" button.
5.  **Monitor Progress**: 
    *   Observe "Creating batch..." message
    *   Then "Uploading X image(s) with thumbnail generation..." message
6.  **View Results**: 
    *   Green success alert shows how many images uploaded and how many thumbnails were generated
    *   A gallery of thumbnails will appear below (using the generated 300x300 thumbnails)
    *   Images with thumbnails will have a **green dot badge** labeled "Thumbnail"
7.  **Check Backend Console**: 
    *   Look for emoji-prefixed log messages:
        *   📦 Uploading N images to batch...
        *   📤 Uploading filename.jpg (X bytes)
        *   📐 Dimensions: 1920x1080
        *   🖼️  Generated thumbnail: 300x169 (X bytes)
        *   ✅ Full image uploaded: s3_key
        *   ✅ Thumbnail uploaded: s3_thumbnail_key
8.  **Full-Size View**: Click on any thumbnail to open a modal displaying:
    *   Full-size image (loaded from original S3 URL)
    *   Filename, size, type, dimensions
    *   S3 key for full image
    *   **✅ Thumbnail Key** (in green if thumbnail was generated)
9.  **Verify in S3**: Check your S3 bucket under `images/{patient_id}/{batch_id}/` for:
    *   Original files: `{uuid}.jpg`
    *   Thumbnails: `{uuid}_thumb.jpg`

### What to Look For

✅ **Successful Thumbnail Generation**:
*   Green success alert shows "X thumbnails generated ✅"
*   Thumbnails load quickly (smaller file size)
*   Green dot badge on each thumbnail
*   Modal shows both S3 keys (full and thumbnail)
*   Backend console shows 🖼️ and ✅ messages

❌ **Thumbnail Generation Failure**:
*   Success alert shows "0 thumbnails generated"
*   No green dot badges
*   Modal doesn't show "✅ Thumbnail Key" line
*   Backend console shows ⚠️ or ❌ messages

## ⚠️ Known Issues / Warnings

*   **Source Map Errors**: `Dropzone.module.css.mjs.map` and `Notifications.module.css.mjs.map` may show 404 errors in the browser console. These are cosmetic and do not affect functionality.
*   **Favicon 404**: The `favicon.ico` might still show a 404. This is cosmetic.
*   **TipTap Import Warnings**: Warnings related to `@tiptap/extension-text-style` in `LetterEditor.tsx` and `FontSizeExtension.ts` are unrelated to image functionality and can be ignored for this feature.

## 📊 Technical Details

### Thumbnail Generation Process

1.  **Image Upload** → Backend receives file via `POST /api/images/batches/{id}/upload/`
2.  **PIL Opens Image** → `PILImage.open(file)` loads the image
3.  **Extract Dimensions** → `width, height = img.size`
4.  **Create Thumbnail** → `thumb_img.thumbnail((300, 300), PILImage.Resampling.LANCZOS)`
5.  **Save to BytesIO** → `thumb_img.save(thumb_buffer, format=img.format, quality=85)`
6.  **Wrap in InMemoryUploadedFile** → Provides `.size` attribute for S3 upload
7.  **Upload Full Image** → `s3_service.upload_file(file, s3_key, folder='images')`
8.  **Upload Thumbnail** → `s3_service.upload_file(thumb_file, s3_thumbnail_key, folder='images')`
9.  **Create DB Record** → `Image.objects.create(...)` with both S3 keys and dimensions
10. **Generate Presigned URLs** → Serializer creates 1-hour presigned URLs for both full and thumbnail

### S3 Structure

```
walkeasy-nexus-documents/
└── images/
    └── {patient_id}/
        └── {batch_id}/
            ├── abc123.jpeg          (Full image: 1920x1080, 1.2MB)
            ├── abc123_thumb.jpeg    (Thumbnail: 300x169, 25KB)
            ├── def456.png           (Full image: 2560x1440, 2.5MB)
            └── def456_thumb.png     (Thumbnail: 300x169, 30KB)
```

### Performance

*   **Thumbnail Size**: 300x300 max (maintains aspect ratio)
*   **File Size Reduction**: ~95% (e.g., 1.2MB → 25KB)
*   **Generation Time**: ~50-200ms per image (depending on size)
*   **Quality**: 85% JPEG compression (good balance of size/quality)

### Dependencies

*   **Pillow (PIL)**: Python image processing library
*   **boto3**: AWS SDK for S3 uploads
*   **Django REST Framework**: API endpoints
*   **Mantine UI**: Frontend components (Dropzone, Modal, Image, Badge)

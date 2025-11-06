# Patient Image Management System

## Overview

A comprehensive image management system for patients that allows batch uploads, organization, categorization, and download capabilities.

## Features

### 1. Image Batch Management
- **Create Batches**: Users can create named batches with dates for organizing images
- **Batch List**: Accordion-style list showing all batches for a patient
- **Batch Actions**: 
  - Download entire batch as ZIP file
  - Delete batch (with confirmation)
  - View batch details (image count, date)

### 2. Image Upload
- **Drag & Drop**: Drag and drop multiple images into a batch
- **File Selection**: Click to select images from file system
- **Batch Upload**: Upload multiple images at once to a batch
- **File Size Limit**: 10MB per image
- **Supported Formats**: All standard image formats (JPEG, PNG, GIF, WebP)

### 3. Image Organization
- **Categories**: Each image can be assigned to a category:
  - **Anterior Views**: Anterior, R-Anterior, L-Anterior
  - **Posterior Views**: Posterior, R-Posterior, L-Posterior
  - **Foot Measurements**: R-MFoot Length, R-MFoot Width, L-MFoot Length, L-MFoot Width
  - **Casting**: Casts
  - **Lateral Views**: Left Lat, Right Lat
  - **Footwear & Devices**: R-Shoe, L-Shoe, AFO, X-Ray
  - **Clinical**: CMO
  - **Documentation**: Last Design, Shoe, PodBox, Pension Card, Medicare Card
- **Category Dropdown**: Easy category selection under each thumbnail
- **Auto-save**: Category changes are saved automatically

### 4. Image Viewing
- **Full-Size Viewer**: Click any thumbnail to view full-size image
- **Navigation**: Arrow buttons to navigate between images in a batch
- **Image Metadata**: 
  - Category (displayed prominently)
  - Dimensions (width × height)
  - Upload date
- **Image Actions**:
  - Download individual image
  - Delete image (with confirmation)
  - Close viewer

### 5. Image Selection & Download
- **Checkbox Selection**: Select individual images for download
- **Batch Download**: Download all images in a batch as ZIP
- **Selective Download**: Download only selected images as ZIP
- **Download Button**: Appears when images are selected

### 6. Thumbnail Generation
- **Automatic Thumbnails**: Thumbnails are automatically generated on upload
- **Size**: 300×300px maximum
- **Format**: JPEG with 85% quality
- **Storage**: Stored in S3 alongside full images
- **Display**: Thumbnails shown in batch list for quick preview

## Technical Implementation

### Backend (`backend/images/`)

#### Models
- **ImageBatch**: Represents a collection of images
  - `name`: Batch name/date
  - `content_type`: Generic foreign key to Patient
  - `object_id`: Patient ID
  - `image_count`: Cached count of images
  
- **Image**: Represents an individual image
  - `batch`: Foreign key to ImageBatch
  - `original_name`: Original filename
  - `s3_key`: S3 key for full image
  - `s3_thumbnail_key`: S3 key for thumbnail
  - `category`: Image category
  - `file_size`: Full image size in bytes
  - `thumbnail_size`: Thumbnail size in bytes
  - `width`, `height`: Image dimensions
  - `order`: Display order within batch

#### API Endpoints

**Image Batches:**
- `GET /api/images/batches/?patient_id={id}` - List batches for patient
- `POST /api/images/batches/` - Create new batch
- `GET /api/images/batches/{id}/` - Get batch details
- `PUT /api/images/batches/{id}/` - Update batch (rename)
- `DELETE /api/images/batches/{id}/` - Delete batch and all images
- `POST /api/images/batches/{id}/upload/` - Upload images to batch
- `GET /api/images/batches/{id}/download/?image_ids={id1}&image_ids={id2}` - Download batch as ZIP

**Images:**
- `GET /api/images/?batch_id={id}` - List images in batch
- `GET /api/images/{id}/` - Get image details
- `PATCH /api/images/{id}/` - Update image (category, caption, date)
- `DELETE /api/images/{id}/` - Delete image
- `GET /api/images/{id}/download/` - Download individual image

#### Key Features
- **Thumbnail Generation**: Uses Pillow (PIL) to generate 300×300 thumbnails
- **S3 Storage**: Both full images and thumbnails stored in S3
- **Presigned URLs**: Secure, temporary URLs for image access
- **ZIP Generation**: Creates ZIP files in memory for batch downloads
- **CORS Handling**: Backend proxy endpoints bypass CORS issues

### Frontend (`frontend/app/components/dialogs/ImagesDialog.tsx`)

#### Components
- **ImagesDialog**: Main dialog component
  - Left panel: Batch list with accordions
  - Right panel: Image viewer
  - Footer: Summary information

- **BatchContent**: Component for batch content
  - Dropzone for uploads
  - Thumbnail grid with checkboxes
  - Category dropdowns
  - Download selected button

- **ImageViewer**: Full-size image viewer
  - Image display with navigation
  - Metadata header
  - Download and delete actions

- **CreateBatchForm**: Modal form for creating batches
  - Date picker
  - Name input field

#### Features
- **30/70 Split Layout**: Left panel (30%) for batches, right panel (70%) for viewer
- **Accordion UI**: Expandable batch items
- **Checkbox Selection**: Select multiple images
- **Visual Feedback**: Selected images highlighted in blue
- **Responsive Design**: Adapts to different screen sizes

### Contact Header Integration (`frontend/app/components/ContactHeader.tsx`)

#### Badge Display
- **Blue Badge**: Number of batches (left)
- **Red Badge**: Total number of images (right)
- **Gap**: 24px between badges for clear separation
- **Auto-update**: Counts update when batches/images change

## File Structure

```
backend/images/
├── models.py          # ImageBatch and Image models
├── serializers.py     # API serializers
├── views.py           # API endpoints and business logic
├── urls.py            # URL routing
└── admin.py           # Django admin configuration

frontend/app/components/dialogs/
└── ImagesDialog.tsx   # Main image management dialog

frontend/app/components/
└── ContactHeader.tsx  # Patient header with image count badges
```

## Usage

### Creating a Batch
1. Click "New Batch" button
2. Select date or enter batch name
3. Click "Create Batch"
4. Batch appears in accordion list

### Uploading Images
1. Expand a batch in the accordion
2. Drag images into dropzone or click to select
3. Click "Upload X Images" button
4. Images appear as thumbnails in the batch

### Categorizing Images
1. Find image thumbnail in batch
2. Select category from dropdown below thumbnail
3. Category saves automatically

### Viewing Images
1. Click any thumbnail
2. Full-size image opens in right panel
3. Use arrow buttons to navigate between images
4. View metadata in header

### Downloading Images
**Download All:**
- Click blue download icon next to batch name in accordion header

**Download Selected:**
- Check boxes next to images you want
- Click "Download X Selected" button that appears
- ZIP file downloads with selected images

**Download Individual:**
- Open image in viewer
- Click blue download icon in header
- Image downloads directly

### Deleting Images/Batches
- **Delete Image**: Click red trash icon in image viewer header
- **Delete Batch**: Click red trash icon next to batch name
- Confirmation dialog appears before deletion

## Database Schema

### ImageBatch Table
- `id` (UUID, Primary Key)
- `name` (CharField, max_length=255)
- `content_type` (ForeignKey to ContentType)
- `object_id` (UUIDField)
- `image_count` (IntegerField, default=0)
- `created_at` (DateTimeField, auto_now_add)
- `updated_at` (DateTimeField, auto_now)

### Image Table
- `id` (UUID, Primary Key)
- `batch` (ForeignKey to ImageBatch)
- `original_name` (CharField, max_length=255)
- `s3_key` (CharField, max_length=512)
- `s3_thumbnail_key` (CharField, max_length=512, nullable)
- `category` (CharField, max_length=50, default='other')
- `caption` (TextField, blank=True)
- `date_taken` (DateField, nullable)
- `file_size` (IntegerField)
- `thumbnail_size` (IntegerField, nullable)
- `width` (IntegerField, nullable)
- `height` (IntegerField, nullable)
- `order` (IntegerField, default=0)
- `uploaded_at` (DateTimeField, auto_now_add)
- `updated_at` (DateTimeField, auto_now)

## S3 Storage Structure

```
s3://walkeasy-nexus-documents/
└── images/
    └── {patient_id}/
        └── {batch_id}/
            ├── {image_id}.{ext}          # Full image
            └── {image_id}_thumb.{ext}    # Thumbnail
```

## API Examples

### Create Batch
```bash
POST /api/images/batches/
{
  "name": "6 Nov 2025",
  "content_type": "patients.patient",
  "object_id": "patient-uuid"
}
```

### Upload Images
```bash
POST /api/images/batches/{batch_id}/upload/
Content-Type: multipart/form-data
- images: [file1, file2, ...]
- categories: ["posterior", "anterior", ...]
- captions: ["", "", ...]
```

### Download Batch
```bash
GET /api/images/batches/{batch_id}/download/
# Returns ZIP file with all images

GET /api/images/batches/{batch_id}/download/?image_ids={id1}&image_ids={id2}
# Returns ZIP file with selected images only
```

### Download Individual Image
```bash
GET /api/images/{image_id}/download/
# Returns image file with download headers
```

## Error Handling

- **Upload Errors**: Individual image failures don't stop batch upload
- **S3 Errors**: Graceful fallback with error messages
- **CORS Issues**: Backend proxy endpoints handle CORS
- **Validation**: File size and format validation on upload
- **Confirmation Dialogs**: Prevent accidental deletions

## Performance Considerations

- **Thumbnail Generation**: Done server-side during upload
- **Lazy Loading**: Thumbnails loaded on demand
- **Pagination**: Batch list can be paginated if needed
- **Caching**: Image counts cached in batch model
- **Streaming**: Large ZIP files streamed to client

## Future Enhancements

- Image editing capabilities
- Bulk category changes
- Image search/filtering
- Image annotations/markup
- Integration with clinical notes
- Image comparison view
- Print functionality

## Related Documentation

- [Image Upload Test Guide](../features/IMAGE_UPLOAD_TEST.md)
- [S3 Integration Guide](../integrations/S3.md)
- [Database Schema](../../docs/architecture/DATABASE_SCHEMA.md)


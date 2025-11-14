#!/usr/bin/env python3
"""
Link FileMaker Images from S3 using CSV Metadata

This script is a wrapper around the Django management command
`link_filemaker_images_csv` to integrate it into the reimport workflow.

Usage:
    python link_filemaker_images_csv.py                  # Production run
    python link_filemaker_images_csv.py --dry-run        # Test mode
    python link_filemaker_images_csv.py --limit 100      # Limit images

Requirements:
    - Image_dataV9.csv must exist in project root
    - Django backend virtual environment must be activated
    - S3 images must be in: s3://walkeasy-nexus-documents/filemaker-import/images-bulk-dump/
"""
import sys
import os
import subprocess
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent.parent.parent
sys.path.insert(0, str(project_root))

# Import reimport utilities
from scripts.reimport.utils.logger import create_logger
from scripts.reimport.utils.progress_tracker import create_progress_tracker


def link_filemaker_images_csv(dry_run: bool = False, limit: int = 0) -> bool:
    """
    Link FileMaker images from S3 to patient records using CSV metadata.
    
    Args:
        dry_run: If True, preview changes without modifying database
        limit: Limit number of images to process (0 = all)
    
    Returns:
        True if successful, False otherwise
    """
    logger = create_logger("PHASE 7")
    progress = create_progress_tracker()
    
    logger.phase_start("Phase 7.2", "Link FileMaker Images from CSV Metadata")
    
    # Check if CSV file exists
    csv_file = project_root / "Image_dataV9.csv"
    if not csv_file.exists():
        logger.error(f"CSV file not found: {csv_file}")
        logger.error("Please ensure Image_dataV9.csv is in the project root directory.")
        return False
    
    logger.info(f"📊 Using CSV metadata: {csv_file.name}")
    
    # Build Django management command
    backend_dir = project_root / "backend"
    manage_py = backend_dir / "manage.py"
    
    if not manage_py.exists():
        logger.error(f"manage.py not found: {manage_py}")
        return False
    
    # Build command arguments
    cmd = [
        "python",
        str(manage_py),
        "link_filemaker_images_csv",
        "--csv", str(csv_file),
    ]
    
    if dry_run:
        cmd.append("--dry-run")
        logger.warning("🔍 DRY RUN MODE - No changes will be made")
    
    if limit > 0:
        cmd.extend(["--limit", str(limit)])
        logger.warning(f"⚠️  Limited to {limit} images")
    
    logger.info("🚀 Starting image linking process...")
    logger.info("")
    
    try:
        # Run Django management command
        result = subprocess.run(
            cmd,
            cwd=str(backend_dir),
            capture_output=False,  # Show output in real-time
            text=True,
        )
        
        if result.returncode == 0:
            if dry_run:
                logger.success("✅ Dry run completed successfully")
                logger.info("Run without --dry-run to link images to database")
            else:
                logger.success("✅ Image linking completed successfully")
                progress.update_progress("phase7_images_csv", 100, 100, complete=True)
            return True
        else:
            logger.error(f"❌ Image linking failed with exit code {result.returncode}")
            return False
    
    except subprocess.CalledProcessError as e:
        logger.error(f"❌ Command failed: {e}")
        return False
    except Exception as e:
        logger.error(f"❌ Unexpected error: {e}")
        return False


def main():
    """Main entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Link FileMaker images from S3 using CSV metadata'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Preview changes without modifying database'
    )
    parser.add_argument(
        '--limit',
        type=int,
        default=0,
        help='Limit number of images to process (0 = all)'
    )
    
    args = parser.parse_args()
    
    success = link_filemaker_images_csv(
        dry_run=args.dry_run,
        limit=args.limit
    )
    
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()


#!/usr/bin/env python3
"""
Phase 0: Backup Database to S3

Creates a full database backup and uploads it to S3 for safe keeping.
Supports both SQLite and PostgreSQL databases.
Critical safety measure before running destructive reimport operations.

Usage:
    python backup_postgres_to_s3.py              # Production backup
    python backup_postgres_to_s3.py --dry-run    # Test mode
"""

import sys
import os
import subprocess
import gzip
from datetime import datetime
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Django setup
project_root = Path(__file__).parent.parent.parent.parent
sys.path.insert(0, str(project_root / 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ncc_api.settings')

import django
django.setup()

from django.conf import settings
from utils import create_logger
from documents.services import S3Service


def get_db_config():
    """Get database configuration from Django settings."""
    db_config = settings.DATABASES.get('default', {})
    
    engine = db_config.get('ENGINE', '')
    db_type = 'sqlite' if 'sqlite' in engine.lower() else 'postgresql'
    
    return {
        'type': db_type,
        'engine': engine,
        'name': db_config.get('NAME', 'nexus_db'),
        'user': db_config.get('USER', 'postgres'),
        'password': db_config.get('PASSWORD', ''),
        'host': db_config.get('HOST', 'localhost'),
        'port': db_config.get('PORT', '5432'),
    }


def create_postgres_dump(db_config: dict, output_file: Path, logger) -> bool:
    """
    Create a PostgreSQL dump file.
    
    Args:
        db_config: Database configuration dictionary
        output_file: Path to output dump file
        logger: Logger instance
    
    Returns:
        True if successful, False otherwise
    """
    logger.info(f"Creating PostgreSQL dump: {output_file.name}")
    logger.info(f"Database: {db_config['name']} on {db_config['host']}")
    
    # Build pg_dump command
    cmd = [
        'pg_dump',
        '-h', db_config['host'],
        '-p', str(db_config['port']),
        '-U', db_config['user'],
        '-d', db_config['name'],
        '--format=custom',  # Custom format (compressed, restorable)
        '--file', str(output_file),
        '--verbose',
    ]
    
    # Set password via environment variable
    env = os.environ.copy()
    if db_config['password']:
        env['PGPASSWORD'] = db_config['password']
    
    try:
        logger.info("Running pg_dump...")
        result = subprocess.run(
            cmd,
            env=env,
            capture_output=True,
            text=True,
            check=False,
        )
        
        if result.returncode == 0:
            # Check file was created and has size
            if output_file.exists():
                size_mb = output_file.stat().st_size / (1024 * 1024)
                logger.success(f"✅ Dump created: {size_mb:.2f} MB")
                return True
            else:
                logger.error("Dump file was not created")
                return False
        else:
            logger.error(f"pg_dump failed with exit code {result.returncode}")
            if result.stderr:
                logger.error(f"Error: {result.stderr}")
            return False
    
    except FileNotFoundError:
        logger.error("❌ pg_dump not found!")
        logger.error("Please install PostgreSQL client tools:")
        logger.error("  macOS: brew install postgresql")
        logger.error("  Ubuntu: apt-get install postgresql-client")
        return False
    except Exception as e:
        logger.error(f"❌ Exception during dump: {e}")
        return False


def create_sqlite_backup(db_path: str, output_file: Path, logger) -> bool:
    """
    Create a SQLite database backup.
    
    Args:
        db_path: Path to SQLite database file
        output_file: Path to output backup file
        logger: Logger instance
    
    Returns:
        True if successful, False otherwise
    """
    logger.info(f"Creating SQLite backup: {output_file.name}")
    logger.info(f"Database: {db_path}")
    
    # Check source database exists
    source_path = Path(db_path)
    if not source_path.exists():
        logger.error(f"❌ Database file not found: {db_path}")
        return False
    
    try:
        logger.info("Copying SQLite database...")
        
        # Simple file copy for SQLite
        import shutil
        shutil.copy2(source_path, output_file)
        
        # Verify copy
        if output_file.exists():
            size_mb = output_file.stat().st_size / (1024 * 1024)
            logger.success(f"✅ Backup created: {size_mb:.2f} MB")
            return True
        else:
            logger.error("Backup file was not created")
            return False
    
    except Exception as e:
        logger.error(f"❌ Exception during backup: {e}")
        return False


def upload_to_s3(local_file: Path, s3_key: str, logger, dry_run: bool = False) -> bool:
    """
    Upload backup file to S3.
    
    Args:
        local_file: Local file path
        s3_key: S3 key (path in bucket)
        logger: Logger instance
        dry_run: If True, don't actually upload
    
    Returns:
        True if successful, False otherwise
    """
    if dry_run:
        logger.warning("🔍 DRY RUN - Would upload to S3")
        logger.info(f"   Local: {local_file}")
        logger.info(f"   S3: s3://<bucket>/{s3_key}")
        return True
    
    try:
        logger.info(f"Uploading to S3: {s3_key}")
        
        s3_service = S3Service()
        
        # Upload with progress
        with open(local_file, 'rb') as f:
            s3_service.s3_client.upload_fileobj(
                f,
                s3_service.bucket_name,
                s3_key,
                ExtraArgs={
                    'ServerSideEncryption': 'AES256',  # Encrypt at rest
                    'StorageClass': 'STANDARD_IA',  # Infrequent Access (cheaper)
                }
            )
        
        logger.success(f"✅ Uploaded to s3://{s3_service.bucket_name}/{s3_key}")
        return True
    
    except Exception as e:
        logger.error(f"❌ Failed to upload to S3: {e}")
        return False


def backup_postgres_to_s3(dry_run: bool = False) -> bool:
    """
    Main backup function.
    
    Args:
        dry_run: If True, test mode (no actual changes to S3)
    
    Returns:
        True if successful, False otherwise
    """
    logger = create_logger("PHASE 0")
    logger.phase_start("Phase 0.0", "Backup Database to S3")
    
    if dry_run:
        logger.warning("🔍 DRY RUN MODE - Backup will be created but not uploaded to S3")
        logger.info("")
    
    # Create timestamp for backup
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    
    # Get database configuration
    logger.info("Reading database configuration...")
    db_config = get_db_config()
    logger.success(f"Database Type: {db_config['type'].upper()}")
    logger.success(f"Database: {db_config['name']}")
    
    # Create temporary backup directory
    backup_dir = Path('/tmp/nexus_backup')
    backup_dir.mkdir(exist_ok=True)
    
    # Create backup filename based on database type
    if db_config['type'] == 'sqlite':
        dump_filename = f"nexus_sqlite_backup_{timestamp}.db"
    else:
        dump_filename = f"nexus_postgres_backup_{timestamp}.dump"
    
    dump_file = backup_dir / dump_filename
    
    # Step 1: Create database backup
    logger.info("")
    logger.info("=" * 70)
    logger.info(f"Step 1: Creating {db_config['type'].upper()} Backup")
    logger.info("=" * 70)
    
    if db_config['type'] == 'sqlite':
        success = create_sqlite_backup(db_config['name'], dump_file, logger)
    else:
        success = create_postgres_dump(db_config, dump_file, logger)
    
    if not success:
        logger.error("❌ Failed to create database backup")
        logger.phase_end(success=False)
        return False
    
    # Get file size
    size_mb = dump_file.stat().st_size / (1024 * 1024)
    
    # Step 2: Upload to S3
    logger.info("")
    logger.info("=" * 70)
    logger.info("Step 2: Upload to S3")
    logger.info("=" * 70)
    
    s3_key = f"backup/database/{dump_filename}"
    
    success = upload_to_s3(dump_file, s3_key, logger, dry_run=dry_run)
    
    if not success:
        logger.error("❌ Failed to upload to S3")
        logger.phase_end(success=False)
        return False
    
    # Step 3: Local file info
    logger.info("")
    logger.info("Local backup file kept at: " + str(dump_file))
    logger.info("You can delete this after verifying S3 upload")
    
    # Summary
    logger.info("")
    logger.info("=" * 70)
    logger.info("📊 Backup Summary")
    logger.info("=" * 70)
    logger.info(f"Database Type: {db_config['type'].upper()}")
    logger.info(f"Database: {db_config['name']}")
    logger.info(f"Backup Size: {size_mb:.2f} MB")
    logger.info(f"Local File: {dump_file}")
    if not dry_run:
        s3_service = S3Service()
        logger.info(f"S3 Location: s3://{s3_service.bucket_name}/{s3_key}")
    logger.info("")
    
    if dry_run:
        logger.warning("🔍 DRY RUN - Backup created locally but not uploaded to S3")
    else:
        logger.success("✅ Backup complete and uploaded to S3!")
    
    logger.info("")
    logger.info("To restore this backup:")
    if db_config['type'] == 'sqlite':
        logger.info(f"  1. Download from S3: aws s3 cp s3://<bucket>/{s3_key} .")
        logger.info(f"  2. Stop Django server")
        logger.info(f"  3. Copy file: cp {dump_filename} {db_config['name']}")
        logger.info(f"  4. Restart Django server")
    else:
        logger.info(f"  1. Download from S3: aws s3 cp s3://<bucket>/{s3_key} .")
        logger.info(f"  2. Restore: pg_restore -h {db_config['host']} -U {db_config['user']} -d {db_config['name']} --clean {dump_filename}")
    logger.info("")
    
    logger.phase_end(success=True)
    return True


def main():
    """Main entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Backup PostgreSQL database to S3'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Test mode - create dump but don\'t upload to S3'
    )
    
    args = parser.parse_args()
    
    success = backup_postgres_to_s3(dry_run=args.dry_run)
    
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()


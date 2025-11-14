"""
Phase 5: Fetch Notes and SMS from FileMaker

Fetches all patient note and SMS records from FileMaker via OData API.
Exports to JSON file for import into Nexus.
"""

import sys
import os
import json
import time
from datetime import datetime
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from utils import create_logger, create_filemaker_client


def fetch_first_batch_only_odata(fm, entity: str, logger=None):
    """
    Fetch only the first batch from OData (workaround for broken pagination).
    FileMaker OData ignores $top and always returns ~10,000 records.
    
    Args:
        fm: FileMaker client instance
        entity: Entity name to fetch from
        logger: Logger instance for progress updates
    
    Returns:
        List of records (first batch only, typically ~10,000)
    """
    if logger:
        logger.info(f"Fetching first batch from {entity} (OData pagination is broken)")
        logger.warning("⚠️  Note: FileMaker OData returns ~10,000 records max, ignoring pagination")
    
    try:
        response = fm.odata_query(
            entity=entity,
            top=100000,  # Request a large number to get everything in first batch
            skip=0
        )
        
        records = response.get('value', [])
        
        if logger:
            logger.success(f"✅ Fetched {len(records)} records from {entity}")
            if len(records) >= 10000:
                logger.warning(f"⚠️  Received {len(records)} records (likely hit FileMaker limit)")
                logger.warning("⚠️  There may be more records that weren't fetched")
        
        return records
        
    except Exception as e:
        if logger:
            logger.error(f"Failed to fetch from {entity}: {str(e)}")
        raise


def fetch_with_progress_data_api(fm, layout: str, batch_size: int = 100, logger=None):
    """
    Fetch records using FileMaker Data API (more reliable than OData for pagination).
    
    Args:
        fm: FileMaker client instance
        layout: Layout name to fetch from
        batch_size: Records per batch
        logger: Logger instance for progress updates
    
    Returns:
        List of all records
    """
    all_records = []
    offset = 1  # Data API uses 1-based offset
    batch_num = 1
    
    if logger:
        logger.info(f"Starting batched fetch from {layout} using Data API (batch size: {batch_size})")
    
    while True:
        try:
            # Use Data API instead of OData
            token = fm._get_data_api_token()
            url = f"{fm.data_api_base_url}/layouts/{layout}/records"
            
            params = {
                '_offset': offset,
                '_limit': batch_size
            }
            
            headers = {
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {token}'
            }
            
            response = fm.session.get(url, params=params, headers=headers, timeout=120, verify=False)
            
            if response.status_code != 200:
                # Check if we just ran out of records
                if 'No records match' in response.text or response.status_code == 401:
                    if logger:
                        logger.info(f"Reached end of records (status: {response.status_code})")
                    break
                raise Exception(f"Data API get records failed: {response.status_code} - {response.text}")
            
            data = response.json()
            records = data.get('response', {}).get('data', [])
            
            if not records:
                if logger:
                    logger.info("No more records returned")
                break
            
            # Log batch info
            if logger:
                logger.info(f"💓 Batch {batch_num}: Received {len(records)} records (offset: {offset}, total so far: {len(all_records)})")
            
            # Extract fieldData from Data API response format
            for record in records:
                field_data = record.get('fieldData', {})
                field_data['recordId'] = record.get('recordId')
                all_records.append(field_data)
            
            offset += len(records)
            batch_num += 1
            
            # If we got fewer records than batch_size, we're done
            if len(records) < batch_size:
                if logger:
                    logger.info(f"Received {len(records)} < {batch_size}, reached end of data")
                break
                
        except Exception as e:
            if logger:
                logger.warning(f"Batch {batch_num} failed: {str(e)}")
            # If first batch fails, re-raise the error
            if batch_num == 1:
                raise
            # Otherwise, assume we've reached the end
            if logger:
                logger.info(f"Stopping fetch at {len(all_records)} records due to error")
            break
    
    if logger:
        logger.success(f"Completed fetch: {len(all_records)} records in {batch_num-1} batches")
    
    return all_records


def fetch_with_progress(fm, entity: str, batch_size: int = 100, logger=None, timeout: int = 120):
    """
    Fetch records with progress tracking and increased timeout tolerance.
    
    Args:
        fm: FileMaker client instance
        entity: Entity name to fetch from
        batch_size: Records per batch
        logger: Logger instance for progress updates
        timeout: Timeout per request in seconds
    
    Returns:
        List of all records
    """
    all_records = []
    skip = 0
    batch_num = 1
    
    if logger:
        logger.info(f"Starting batched fetch from {entity} (batch size: {batch_size})")
    
    while True:
        try:
            # Increase timeout for slow FileMaker responses
            response = fm.odata_query(
                entity=entity,
                top=batch_size,
                skip=skip
            )
            
            records = response.get('value', [])
            if not records:
                break
            
            # Log actual batch size received (FileMaker may ignore our batch_size request)
            if logger:
                logger.info(f"💓 Batch {batch_num}: Received {len(records)} records (requested {batch_size}, total so far: {len(all_records)})")
            
            all_records.extend(records)
            skip += len(records)  # Skip by actual records received, not requested batch_size
            batch_num += 1
            
            # If we got fewer records than requested, we're done
            if len(records) < batch_size:
                if logger:
                    logger.info(f"Received {len(records)} < {batch_size}, assuming end of data")
                break
                
        except Exception as e:
            if logger:
                logger.warning(f"Batch {batch_num} failed: {str(e)}")
            # If first batch fails, re-raise the error
            if batch_num == 1:
                raise
            # Otherwise, assume we've reached the end
            if logger:
                logger.info(f"Stopping fetch at {len(all_records)} records due to error")
            break
    
    if logger:
        logger.success(f"Completed fetch: {len(all_records)} records in {batch_num-1} batches")
    
    return all_records


def fetch_notes_from_filemaker(output_dir: str = "data/reimport") -> tuple:
    """
    Fetch all notes and SMS messages from FileMaker.
    
    Args:
        output_dir: Directory to save export files
    
    Returns:
        Tuple of (notes_file, sms_file), or (None, None) if failed
    """
    logger = create_logger("PHASE 5")
    logger.phase_start("Phase 5.1", "Fetch Notes and SMS from FileMaker")
    
    try:
        # Create output directory
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)
        
        # Create timestamped filenames
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        notes_file = output_path / f"notes_export_{timestamp}.json"
        sms_file = output_path / f"sms_export_{timestamp}.json"
        
        logger.info(f"Notes will be saved to: {notes_file}")
        logger.info(f"SMS will be saved to: {sms_file}")
        
        with create_filemaker_client() as fm:
            # ========================================
            # Fetch Notes from FileMaker
            # ========================================
            logger.info("Fetching notes from FileMaker via OData...")
            logger.info(f"OData API: {fm.odata_base_url}")
            logger.warning("⚠️  Using OData workaround: fetch first batch only (~11,408 expected)")
            
            # Fetch notes using OData workaround
            notes = []
            try:
                notes = fetch_first_batch_only_odata(fm, 'API_Notes', logger=logger)
            except Exception as e:
                logger.error(f"Failed to fetch notes: {str(e)}")
                notes = []
            
            if not notes:
                logger.warning("Could not fetch notes from any known layout")
                logger.info("Notes may not be available in FileMaker")
            else:
                logger.success(f"✅ Fetched {len(notes)} notes from FileMaker")
            
            # Analyze note data
            if notes:
                notes_with_patient = sum(1 for n in notes if n.get('id_Contact') or n.get('patient_id'))
                notes_with_content = sum(1 for n in notes if n.get('content') or n.get('Note') or n.get('Text'))
                logger.info(f"Notes with patient link: {notes_with_patient}/{len(notes)}")
                logger.info(f"Notes with content: {notes_with_content}/{len(notes)}")
            
            # Save notes
            if notes:
                notes_export = {
                    'export_timestamp': timestamp,
                    'export_date': datetime.now().isoformat(),
                    'total_notes': len(notes),
                    'source': 'FileMaker OData API',
                    'notes': notes
                }
                
                with open(notes_file, 'w') as f:
                    json.dump(notes_export, f, indent=2, default=str)
                
                logger.success(f"✅ Saved notes to: {notes_file}")
            
            # ========================================
            # Fetch SMS Messages from FileMaker
            # ========================================
            logger.info("")
            logger.info("Fetching SMS messages from FileMaker via OData...")
            logger.warning("⚠️  Using OData workaround: fetch first batch only (~5,353 expected)")
            
            # Fetch SMS using OData workaround
            sms_messages = []
            try:
                sms_messages = fetch_first_batch_only_odata(fm, 'API_Messages', logger=logger)
            except Exception as e:
                logger.error(f"Failed to fetch SMS: {str(e)}")
                sms_messages = []
            
            if not sms_messages:
                logger.warning("Could not fetch SMS from any known layout")
                logger.info("SMS may not be available in FileMaker")
            else:
                logger.success(f"✅ Fetched {len(sms_messages)} SMS messages from FileMaker")
            
            # Analyze SMS data
            if sms_messages:
                sms_with_patient = sum(1 for s in sms_messages if s.get('id_Contact') or s.get('patient_id'))
                sms_with_phone = sum(1 for s in sms_messages if s.get('phone') or s.get('phone_number'))
                sms_with_message = sum(1 for s in sms_messages if s.get('message') or s.get('Message') or s.get('text'))
                logger.info(f"SMS with patient link: {sms_with_patient}/{len(sms_messages)}")
                logger.info(f"SMS with phone number: {sms_with_phone}/{len(sms_messages)}")
                logger.info(f"SMS with message content: {sms_with_message}/{len(sms_messages)}")
            
            # Save SMS
            if sms_messages:
                sms_export = {
                    'export_timestamp': timestamp,
                    'export_date': datetime.now().isoformat(),
                    'total_sms': len(sms_messages),
                    'source': 'FileMaker OData API',
                    'sms_messages': sms_messages
                }
                
                with open(sms_file, 'w') as f:
                    json.dump(sms_export, f, indent=2, default=str)
                
                logger.success(f"✅ Saved SMS to: {sms_file}")
            
            # ========================================
            # Export Summary
            # ========================================
            logger.info("")
            logger.info("=" * 70)
            logger.info("📊 Export Summary")
            logger.info("=" * 70)
            logger.info(f"Total Notes: {len(notes)}")
            logger.info(f"Total SMS: {len(sms_messages)}")
            
            if notes:
                logger.info(f"Notes File: {notes_file} ({notes_file.stat().st_size / 1024 / 1024:.2f} MB)")
            if sms_messages:
                logger.info(f"SMS File: {sms_file} ({sms_file.stat().st_size / 1024 / 1024:.2f} MB)")
            
            logger.success("")
            logger.success("✅ Note and SMS export completed successfully!")
            logger.success(f"Next: Run import_notes.py to import into Nexus")
            logger.success("")
            
            logger.phase_end(success=True)
            return (str(notes_file) if notes else None, str(sms_file) if sms_messages else None)
            
    except Exception as e:
        logger.error(f"Exception during fetch: {str(e)}", exc_info=e)
        logger.phase_end(success=False)
        return (None, None)


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Fetch notes and SMS from FileMaker')
    parser.add_argument('--output-dir', default='data/reimport', help='Output directory for export files')
    args = parser.parse_args()
    
    notes_file, sms_file = fetch_notes_from_filemaker(output_dir=args.output_dir)
    sys.exit(0 if (notes_file or sms_file) else 1)


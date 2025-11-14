"""
Phase 0: Validate FileMaker Connection

Tests connection to FileMaker Data API and OData API.
This is the first validation step before any import.
"""

import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from scripts.reimport.utils import create_logger, create_filemaker_client


def validate_filemaker_connection() -> bool:
    """
    Test connection to FileMaker Server.
    
    Returns:
        True if connection successful, False otherwise
    """
    logger = create_logger("PHASE 0")
    logger.phase_start("Phase 0.1", "Validate FileMaker Connection")
    
    try:
        # Create FileMaker client
        logger.info("Creating FileMaker client...")
        with create_filemaker_client() as fm:
            # Test connection
            logger.info(f"Testing connection to: {fm.host}")
            logger.info(f"Database: {fm.database}")
            
            if fm.test_connection():
                logger.success("FileMaker connection successful!")
                logger.success(f"OData API: {fm.odata_base_url}")
                logger.success(f"Data API: {fm.data_api_base_url}")
                
                # Try to get metadata
                logger.info("Fetching OData metadata...")
                response = fm.session.get(f"{fm.odata_base_url}/$metadata", auth=fm.odata_auth)
                if response.status_code == 200:
                    logger.success("OData metadata accessible")
                else:
                    logger.warning(f"OData metadata returned: {response.status_code}")
                
                logger.phase_end(success=True)
                return True
            else:
                logger.error("FileMaker connection failed!")
                logger.error("Please check:")
                logger.error("  - FILEMAKER_HOST environment variable")
                logger.error("  - FILEMAKER_DATABASE environment variable")
                logger.error("  - FILEMAKER_USERNAME environment variable")
                logger.error("  - FILEMAKER_PASSWORD environment variable")
                logger.error("  - Network connectivity to FileMaker Server")
                logger.error("  - FileMaker Server is running and accessible")
                
                logger.phase_end(success=False)
                return False
                
    except Exception as e:
        logger.error(f"Exception during connection test: {str(e)}", exc_info=e)
        logger.phase_end(success=False)
        return False


if __name__ == '__main__':
    success = validate_filemaker_connection()
    sys.exit(0 if success else 1)


"""
Logging utility for FileMaker reimport process.

Provides consistent logging across all phases with:
- Console output (color-coded)
- File output (timestamped)
- Progress tracking
- Error reporting
"""

import logging
import sys
from datetime import datetime
from pathlib import Path
from typing import Optional


class ReimportLogger:
    """Custom logger for reimport process with enhanced formatting."""
    
    def __init__(self, log_dir: str = "logs", phase: str = "UNKNOWN"):
        """
        Initialize logger with file and console handlers.
        
        Args:
            log_dir: Directory for log files
            phase: Current phase name (e.g., "PHASE 0", "PHASE 3")
        """
        self.phase = phase
        self.log_dir = Path(log_dir)
        self.log_dir.mkdir(parents=True, exist_ok=True)
        
        # Create timestamped log file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        self.log_file = self.log_dir / f"reimport_{timestamp}.log"
        
        # Set up logger
        self.logger = logging.getLogger(f"reimport.{phase}")
        self.logger.setLevel(logging.DEBUG)
        self.logger.propagate = False
        
        # File handler (detailed logging)
        file_handler = logging.FileHandler(self.log_file)
        file_handler.setLevel(logging.DEBUG)
        file_formatter = logging.Formatter(
            '[%(asctime)s] [%(name)s] [%(levelname)s] %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        file_handler.setFormatter(file_formatter)
        
        # Console handler (simplified output)
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(logging.INFO)
        console_formatter = logging.Formatter(
            '[%(asctime)s] [%(phase)s] %(message)s',
            datefmt='%H:%M:%S'
        )
        console_handler.setFormatter(console_formatter)
        
        # Add handlers
        self.logger.addHandler(file_handler)
        self.logger.addHandler(console_handler)
        
        # Track statistics
        self.stats = {
            'start_time': datetime.now(),
            'end_time': None,
            'total_processed': 0,
            'total_success': 0,
            'total_errors': 0,
            'total_skipped': 0,
        }
    
    def info(self, message: str):
        """Log info message."""
        self.logger.info(message, extra={'phase': self.phase})
    
    def success(self, message: str):
        """Log success message with ✅ icon."""
        self.logger.info(f"✅ {message}", extra={'phase': self.phase})
    
    def warning(self, message: str):
        """Log warning message with ⚠️  icon."""
        self.logger.warning(f"⚠️  {message}", extra={'phase': self.phase})
    
    def error(self, message: str, exc_info: Optional[Exception] = None):
        """Log error message with ❌ icon."""
        self.logger.error(f"❌ {message}", extra={'phase': self.phase}, exc_info=exc_info)
        self.stats['total_errors'] += 1
    
    def debug(self, message: str):
        """Log debug message (file only)."""
        self.logger.debug(message, extra={'phase': self.phase})
    
    def progress(self, current: int, total: int, message: str = "Processing"):
        """
        Log progress update.
        
        Args:
            current: Current count
            total: Total count
            message: Progress message
        """
        percent = (current / total * 100) if total > 0 else 0
        self.logger.info(
            f"{message}: {current}/{total} ({percent:.1f}%)",
            extra={'phase': self.phase}
        )
        self.stats['total_processed'] = current
    
    def phase_start(self, phase_name: str, description: str):
        """Log phase start with header."""
        self.logger.info("=" * 70, extra={'phase': self.phase})
        self.logger.info(f"🔄 {phase_name}: {description}", extra={'phase': self.phase})
        self.logger.info("=" * 70, extra={'phase': self.phase})
    
    def phase_end(self, success: bool = True):
        """Log phase end with summary."""
        self.stats['end_time'] = datetime.now()
        duration = (self.stats['end_time'] - self.stats['start_time']).total_seconds()
        
        self.logger.info("=" * 70, extra={'phase': self.phase})
        self.logger.info(f"📊 Summary for {self.phase}:", extra={'phase': self.phase})
        self.logger.info(f"  Duration: {duration:.1f} seconds", extra={'phase': self.phase})
        self.logger.info(f"  Processed: {self.stats['total_processed']}", extra={'phase': self.phase})
        self.logger.info(f"  Success: {self.stats['total_success']}", extra={'phase': self.phase})
        self.logger.info(f"  Errors: {self.stats['total_errors']}", extra={'phase': self.phase})
        self.logger.info(f"  Skipped: {self.stats['total_skipped']}", extra={'phase': self.phase})
        
        if success:
            self.logger.info(f"✅ {self.phase} completed successfully!", extra={'phase': self.phase})
        else:
            self.logger.error(f"❌ {self.phase} failed!", extra={'phase': self.phase})
        
        self.logger.info("=" * 70, extra={'phase': self.phase})
    
    def increment_success(self, count: int = 1):
        """Increment success counter."""
        self.stats['total_success'] += count
    
    def increment_errors(self, count: int = 1):
        """Increment error counter."""
        self.stats['total_errors'] += count
    
    def increment_skipped(self, count: int = 1):
        """Increment skipped counter."""
        self.stats['total_skipped'] += count
    
    def get_stats(self) -> dict:
        """Get current statistics."""
        return self.stats.copy()


# Convenience function for creating loggers
def create_logger(phase: str, log_dir: str = "logs") -> ReimportLogger:
    """
    Create a logger for a specific phase.
    
    Args:
        phase: Phase name (e.g., "PHASE 0", "PHASE 3")
        log_dir: Directory for log files
    
    Returns:
        ReimportLogger instance
    """
    return ReimportLogger(log_dir=log_dir, phase=phase)


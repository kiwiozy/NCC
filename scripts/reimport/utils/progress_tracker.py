"""
Progress tracking utility for FileMaker reimport process.

Provides:
- Real-time progress bars
- Status tracking
- Time estimation
- Checkpoint saving/loading
"""

import json
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Optional, Any


class ProgressTracker:
    """Track progress of reimport process across phases."""
    
    def __init__(self, checkpoint_file: str = "checkpoints/reimport_progress.json"):
        """
        Initialize progress tracker.
        
        Args:
            checkpoint_file: Path to checkpoint file for saving/loading progress
        """
        self.checkpoint_file = Path(checkpoint_file)
        self.checkpoint_file.parent.mkdir(parents=True, exist_ok=True)
        
        self.progress = {
            'start_time': datetime.now().isoformat(),
            'last_update': datetime.now().isoformat(),
            'current_phase': None,
            'phases': {},
            'overall_status': 'in_progress',
        }
        
        # Try to load existing checkpoint
        self.load_checkpoint()
    
    def start_phase(self, phase_name: str, total_items: int = 0):
        """
        Start tracking a new phase.
        
        Args:
            phase_name: Name of the phase (e.g., "PHASE 3: Import Patients")
            total_items: Total number of items to process in this phase
        """
        self.progress['current_phase'] = phase_name
        self.progress['phases'][phase_name] = {
            'status': 'in_progress',
            'start_time': datetime.now().isoformat(),
            'end_time': None,
            'total_items': total_items,
            'processed_items': 0,
            'success_count': 0,
            'error_count': 0,
            'skipped_count': 0,
            'errors': [],
        }
        self.save_checkpoint()
    
    def update_progress(
        self,
        phase_name: str,
        processed: int,
        success: int = 0,
        errors: int = 0,
        skipped: int = 0,
    ):
        """
        Update progress for a phase.
        
        Args:
            phase_name: Name of the phase
            processed: Total items processed so far
            success: Number of successful items
            errors: Number of errors
            skipped: Number of skipped items
        """
        if phase_name not in self.progress['phases']:
            raise ValueError(f"Phase '{phase_name}' not started")
        
        phase = self.progress['phases'][phase_name]
        phase['processed_items'] = processed
        phase['success_count'] = success
        phase['error_count'] = errors
        phase['skipped_count'] = skipped
        self.progress['last_update'] = datetime.now().isoformat()
        
        self.save_checkpoint()
    
    def add_error(self, phase_name: str, error_message: str, record_id: Optional[str] = None):
        """
        Add an error to phase tracking.
        
        Args:
            phase_name: Name of the phase
            error_message: Error description
            record_id: Optional ID of the record that caused the error
        """
        if phase_name not in self.progress['phases']:
            raise ValueError(f"Phase '{phase_name}' not started")
        
        phase = self.progress['phases'][phase_name]
        phase['errors'].append({
            'timestamp': datetime.now().isoformat(),
            'message': error_message,
            'record_id': record_id,
        })
        phase['error_count'] += 1
        
        self.save_checkpoint()
    
    def end_phase(self, phase_name: str, success: bool = True):
        """
        Mark a phase as complete.
        
        Args:
            phase_name: Name of the phase
            success: Whether phase completed successfully
        """
        if phase_name not in self.progress['phases']:
            raise ValueError(f"Phase '{phase_name}' not started")
        
        phase = self.progress['phases'][phase_name]
        phase['status'] = 'completed' if success else 'failed'
        phase['end_time'] = datetime.now().isoformat()
        
        self.save_checkpoint()
    
    def get_phase_status(self, phase_name: str) -> Dict[str, Any]:
        """
        Get status of a specific phase.
        
        Args:
            phase_name: Name of the phase
        
        Returns:
            Phase status dictionary
        """
        return self.progress['phases'].get(phase_name, {})
    
    def get_overall_progress(self) -> Dict[str, Any]:
        """
        Get overall progress summary.
        
        Returns:
            Overall progress dictionary
        """
        total_items = sum(
            phase.get('total_items', 0)
            for phase in self.progress['phases'].values()
        )
        
        processed_items = sum(
            phase.get('processed_items', 0)
            for phase in self.progress['phases'].values()
        )
        
        success_count = sum(
            phase.get('success_count', 0)
            for phase in self.progress['phases'].values()
        )
        
        error_count = sum(
            phase.get('error_count', 0)
            for phase in self.progress['phases'].values()
        )
        
        skipped_count = sum(
            phase.get('skipped_count', 0)
            for phase in self.progress['phases'].values()
        )
        
        # Calculate elapsed time
        start_time = datetime.fromisoformat(self.progress['start_time'])
        elapsed_seconds = (datetime.now() - start_time).total_seconds()
        
        # Estimate remaining time
        if processed_items > 0 and total_items > 0:
            avg_time_per_item = elapsed_seconds / processed_items
            remaining_items = total_items - processed_items
            estimated_remaining_seconds = avg_time_per_item * remaining_items
        else:
            estimated_remaining_seconds = 0
        
        return {
            'total_items': total_items,
            'processed_items': processed_items,
            'success_count': success_count,
            'error_count': error_count,
            'skipped_count': skipped_count,
            'elapsed_time': elapsed_seconds,
            'estimated_remaining_time': estimated_remaining_seconds,
            'percent_complete': (processed_items / total_items * 100) if total_items > 0 else 0,
        }
    
    def get_phase_summary(self) -> str:
        """
        Get a formatted summary of all phases.
        
        Returns:
            Formatted summary string
        """
        lines = []
        lines.append("=" * 70)
        lines.append("📊 Reimport Progress Summary")
        lines.append("=" * 70)
        
        overall = self.get_overall_progress()
        lines.append(f"Overall Progress: {overall['processed_items']}/{overall['total_items']} ({overall['percent_complete']:.1f}%)")
        lines.append(f"Elapsed Time: {overall['elapsed_time']:.1f}s")
        if overall['estimated_remaining_time'] > 0:
            lines.append(f"Estimated Remaining: {overall['estimated_remaining_time']:.1f}s")
        lines.append(f"Success: {overall['success_count']}, Errors: {overall['error_count']}, Skipped: {overall['skipped_count']}")
        lines.append("")
        
        for phase_name, phase in self.progress['phases'].items():
            status_icon = {
                'in_progress': '🔄',
                'completed': '✅',
                'failed': '❌',
            }.get(phase['status'], '❓')
            
            lines.append(f"{status_icon} {phase_name}:")
            lines.append(f"  Status: {phase['status']}")
            
            if phase['total_items'] > 0:
                percent = (phase['processed_items'] / phase['total_items'] * 100)
                lines.append(f"  Progress: {phase['processed_items']}/{phase['total_items']} ({percent:.1f}%)")
            
            lines.append(f"  Success: {phase['success_count']}, Errors: {phase['error_count']}, Skipped: {phase['skipped_count']}")
            
            if phase['errors']:
                lines.append(f"  Recent Errors: {len(phase['errors'])}")
                for error in phase['errors'][:3]:  # Show first 3 errors
                    lines.append(f"    - {error['message']}")
            
            lines.append("")
        
        lines.append("=" * 70)
        return '\n'.join(lines)
    
    def save_checkpoint(self):
        """Save progress to checkpoint file."""
        with open(self.checkpoint_file, 'w') as f:
            json.dump(self.progress, f, indent=2)
    
    def load_checkpoint(self):
        """Load progress from checkpoint file if it exists."""
        if self.checkpoint_file.exists():
            with open(self.checkpoint_file, 'r') as f:
                self.progress = json.load(f)
    
    def reset(self):
        """Reset all progress (use for fresh start)."""
        self.progress = {
            'start_time': datetime.now().isoformat(),
            'last_update': datetime.now().isoformat(),
            'current_phase': None,
            'phases': {},
            'overall_status': 'in_progress',
        }
        self.save_checkpoint()
    
    def mark_complete(self):
        """Mark overall import as complete."""
        self.progress['overall_status'] = 'completed'
        self.progress['last_update'] = datetime.now().isoformat()
        self.save_checkpoint()
    
    def mark_failed(self):
        """Mark overall import as failed."""
        self.progress['overall_status'] = 'failed'
        self.progress['last_update'] = datetime.now().isoformat()
        self.save_checkpoint()


# Convenience function for creating progress tracker
def create_progress_tracker(checkpoint_file: str = "checkpoints/reimport_progress.json") -> ProgressTracker:
    """
    Create progress tracker.
    
    Args:
        checkpoint_file: Path to checkpoint file
    
    Returns:
        ProgressTracker instance
    """
    return ProgressTracker(checkpoint_file=checkpoint_file)


"""
Custom Funding Source model for invoice reference generation
"""
import uuid
from django.db import models


class CustomFundingSource(models.Model):
    """
    Custom funding sources that can be dynamically added by users
    These supplement the hardcoded funding sources (NDIS, DVA, Enable, etc.)
    
    Examples:
    - Insurance companies: "HCF", "NIB", "GMHBA"
    - Government programs: "WorkCover", "CTP"
    - Corporate partners: "Corporate Health", "Employee Assistance"
    """
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Unique identifier"
    )
    
    # Display name
    name = models.CharField(
        max_length=100,
        unique=True,
        help_text="Funding source name (e.g., 'HCF', 'WorkCover')"
    )
    
    # Reference number (optional)
    reference_number = models.CharField(
        max_length=100,
        blank=True,
        help_text="Account/vendor number for this funding source (e.g., '123456')"
    )
    
    # Display format for invoices
    display_format = models.CharField(
        max_length=200,
        blank=True,
        help_text="How to display on invoice (e.g., 'HCF Member #'). Leave blank for default: '[Name] - [Patient Name]'"
    )
    
    # Status
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this funding source is currently active"
    )
    
    # Metadata
    notes = models.TextField(
        blank=True,
        help_text="Internal notes about this funding source"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'custom_funding_sources'
        ordering = ['name']
        verbose_name = 'Custom Funding Source'
        verbose_name_plural = 'Custom Funding Sources'
        indexes = [
            models.Index(fields=['is_active']),
            models.Index(fields=['name']),
        ]
    
    def __str__(self):
        return f"{self.name}" + (f" ({self.reference_number})" if self.reference_number else "")
    
    def get_formatted_reference(self, patient_name: str = None) -> str:
        """
        Generate the invoice reference for this funding source
        
        Args:
            patient_name: Optional patient name to include in reference
        
        Returns:
            Formatted reference string
        """
        if self.reference_number:
            # Has a specific number - use format like "HCF # 123456"
            display = self.display_format if self.display_format else f"{self.name} #"
            return f"{display} {self.reference_number}"
        elif patient_name:
            # No number - use format like "HCF - John Smith"
            return f"{self.name} - {patient_name}"
        else:
            # Fallback
            return f"Invoice for {self.name}"


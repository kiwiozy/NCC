"""
Settings models for WalkEasy Nexus
Manages configuration data like Funding Sources
"""
import uuid
from django.db import models


class FundingSource(models.Model):
    """
    Funding source types for patients (NDIS, Private, DVA, etc.)
    Managed through Settings page
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(
        max_length=100,
        help_text="Funding source name (e.g., 'NDIS', 'Private', 'DVA')"
    )
    code = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        help_text="Optional short code (e.g., 'NDIS', 'PRV', 'DVA')"
    )
    active = models.BooleanField(
        default=True,
        help_text="Whether this funding source is active"
    )
    order = models.IntegerField(
        default=0,
        help_text="Order for sorting in dropdowns"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'funding_sources'
        ordering = ['order', 'name']
        verbose_name = 'Funding Source'
        verbose_name_plural = 'Funding Sources'

    def __str__(self):
        return self.name

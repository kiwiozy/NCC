# backend/letters/models.py
from django.db import models

class Letter(models.Model):
    title = models.CharField(max_length=255, blank=True)
    html = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title or f"Letter {self.pk}"

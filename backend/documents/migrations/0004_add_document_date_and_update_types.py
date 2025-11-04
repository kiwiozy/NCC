# Generated migration to add document_date field and update document types
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('documents', '0003_alter_document_category'),
    ]

    operations = [
        migrations.AddField(
            model_name='document',
            name='document_date',
            field=models.DateField(blank=True, help_text='Date associated with this document (e.g., document issue date)', null=True),
        ),
        migrations.AlterField(
            model_name='document',
            name='category',
            field=models.CharField(choices=[
                ('erf', 'ERF'),
                ('purchase_order', 'Purchase Order'),
                ('referral', 'Referral'),
                ('enablensw_application', 'EnableNSW Application'),
                ('remittance_advice', 'Remittance Advice'),
                ('quote', 'Quote'),
                ('medical', 'Medical Records'),
                ('prescription', 'Prescription'),
                ('xray', 'X-Ray / Imaging'),
                ('consent', 'Consent Form'),
                ('insurance', 'Insurance Document'),
                ('invoice', 'Invoice'),
                ('other', 'Other')
            ], default='other', max_length=50),
        ),
    ]


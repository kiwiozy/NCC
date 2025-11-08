# Generated migration to remove MMS fields from database

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('sms_integration', '0002_alter_smsmessage_patient'),
    ]

    operations = [
        # Remove MMS fields from SMSMessage
        migrations.RemoveField(
            model_name='smsmessage',
            name='has_media',
        ),
        migrations.RemoveField(
            model_name='smsmessage',
            name='media_url',
        ),
        migrations.RemoveField(
            model_name='smsmessage',
            name='media_type',
        ),
        migrations.RemoveField(
            model_name='smsmessage',
            name='media_size',
        ),
        migrations.RemoveField(
            model_name='smsmessage',
            name='media_filename',
        ),
        migrations.RemoveField(
            model_name='smsmessage',
            name='s3_key',
        ),
        # Remove MMS fields from SMSInbound
        migrations.RemoveField(
            model_name='smsinbound',
            name='has_media',
        ),
        migrations.RemoveField(
            model_name='smsinbound',
            name='media_url',
        ),
        migrations.RemoveField(
            model_name='smsinbound',
            name='media_downloaded_url',
        ),
        migrations.RemoveField(
            model_name='smsinbound',
            name='media_type',
        ),
        migrations.RemoveField(
            model_name='smsinbound',
            name='media_size',
        ),
        migrations.RemoveField(
            model_name='smsinbound',
            name='s3_key',
        ),
        migrations.RemoveField(
            model_name='smsinbound',
            name='download_status',
        ),
    ]


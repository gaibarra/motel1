# Generated by Django 4.1.3 on 2024-08-17 04:27

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('rooms', '0013_room_total_hours_roomhistory'),
    ]

    operations = [
        migrations.AddField(
            model_name='room',
            name='is_renewal',
            field=models.BooleanField(default=False),
        ),
    ]

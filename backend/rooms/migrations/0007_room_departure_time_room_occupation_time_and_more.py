# Generated by Django 4.1.3 on 2024-08-01 16:14

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('rooms', '0006_alter_turncash_turn_time'),
    ]

    operations = [
        migrations.AddField(
            model_name='room',
            name='departure_time',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='room',
            name='occupation_time',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='room',
            name='status',
            field=models.CharField(choices=[('OC', 'Occupied'), ('CL', 'Cleaning'), ('MT', 'Maintenance'), ('AV', 'Available'), ('LI', 'Clean')], default='AV', max_length=2),
        ),
    ]

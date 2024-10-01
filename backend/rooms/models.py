from django.db import models
from django.core.exceptions import ValidationError
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.mail import send_mail
from django.conf import settings

class Employee(models.Model):
    POSITION_CHOICES = [
        ('LA', 'Laundry'),
        ('CL', 'Cleaning'),
        ('AD', 'Administration'),
    ]

    name = models.CharField(max_length=200)
    position = models.CharField(max_length=2, choices=POSITION_CHOICES)
    date_hired = models.DateField()

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = 'Empleado'
        verbose_name_plural = 'Empleados'


class Room(models.Model):
    STATUS_CHOICES = [
        ('OC', 'Occupied'),
        ('CL', 'Cleaning'),
        ('MT', 'Maintenance'),
        ('AV', 'Available'),
        ('LI', 'Clean'),
    ]

    number = models.IntegerField(unique=True)
    status = models.CharField(max_length=2, choices=STATUS_CHOICES, default='AV')
    rent_price = models.DecimalField(max_digits=8, decimal_places=2)
    occupation_time = models.DateTimeField(null=True, blank=True)
    departure_time = models.DateTimeField(null=True, blank=True)
    cleaning_start_time = models.DateTimeField(null=True, blank=True)
    expiry_time = models.DateTimeField(null=True, blank=True)
    total_hours = models.IntegerField(default=0)
    is_renewal = models.BooleanField(default=False)  # Nuevo campo

    def clean(self):
        if self.rent_price <= 0:
            raise ValidationError('El precio de la renta debe ser positivo.')

    def __str__(self):
        return f'Habitación {self.number}'

    class Meta:
        verbose_name = 'Habitación'
        verbose_name_plural = 'Habitaciones'


class Shift(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    role = models.CharField(max_length=2, choices=Employee.POSITION_CHOICES)

    def __str__(self):
        return f'{self.employee.name} - {self.start_time} a {self.end_time}'

    class Meta:
        verbose_name = 'Turno'
        verbose_name_plural = 'Turnos'


class Payment(models.Model):
    room = models.ForeignKey(Room, on_delete=models.CASCADE)
    payment_time = models.DateTimeField()
    payment_amount = models.DecimalField(max_digits=8, decimal_places=2)
    vehicle_info = models.TextField()  # Un solo campo para placas y descripción del vehículo
    rent_duration = models.IntegerField(default=4)  # Duración de la renta en horas, valor predeterminado 4

    def clean(self):
        if self.payment_amount <= 0:
            raise ValidationError('El monto del pago debe ser positivo.')
        if self.rent_duration <= 0:
            raise ValidationError('La duración de la renta debe ser positiva.')

    def __str__(self):
        return f'Pago {self.id} para la Habitación {self.room.number}'

    class Meta:
        verbose_name = 'Pago'
        verbose_name_plural = 'Pagos'


class TurnCash(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE)
    turn_time = models.DateTimeField(auto_now_add=True)
    turn_amount = models.DecimalField(max_digits=8, decimal_places=2)
    turn_description = models.TextField(blank=True, null=True)
    is_closed = models.BooleanField(default=False)

    def __str__(self):
        return f'Turno {self.id} de {self.employee.name}'

    class Meta:
        verbose_name = 'Turno de Caja'
        verbose_name_plural = 'Turnos de Caja'


class CashMovement(models.Model):
    turn_cash = models.ForeignKey(TurnCash, related_name='movements', on_delete=models.CASCADE)
    movement_type = models.CharField(max_length=10, choices=[('entrada', 'Entrada'), ('salida', 'Salida')])
    concept = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=8, decimal_places=2)
    date = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f'Movimiento de {self.movement_type} en Turno {self.turn_cash.id} - {self.concept}'

    class Meta:
        verbose_name = 'Movimiento de Caja'
        verbose_name_plural = 'Movimientos de Caja'


class RoomHistory(models.Model):
    room = models.ForeignKey(Room, on_delete=models.CASCADE)
    previous_status = models.CharField(max_length=2, choices=Room.STATUS_CHOICES)
    new_status = models.CharField(max_length=2, choices=Room.STATUS_CHOICES)
    changed_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'Historial de la habitación {self.room.number} - {self.previous_status} a {self.new_status}'


# @receiver(post_save, sender=Room)
# def send_cleaning_notification(sender, instance, **kwargs):
#     if instance.status == 'CL':
#         send_mail(
#             'Notificación de Limpieza',
#             f'La habitación {instance.number} necesita ser limpiada.',
#             settings.EMAIL_HOST_USER,
#             ['limpieza@example.com']
#         )

# @receiver(post_save, sender=Room)
# def send_maintenance_notification(sender, instance, **kwargs):
#     if instance.status == 'MT':
#         send_mail(
#             'Notificación de Mantenimiento',
#             f'La habitación {instance.number} necesita mantenimiento.',
#             settings.EMAIL_HOST_USER,
#             ['mantenimiento@example.com']
#         )

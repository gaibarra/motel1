from django.contrib import admin
from .models import Employee, Shift, Room, Payment, TurnCash, CashMovement

class EmployeeAdmin(admin.ModelAdmin):
    list_display = ('name', 'position', 'date_hired')

class ShiftAdmin(admin.ModelAdmin):
    list_display = ('employee', 'start_time', 'end_time', 'role')

class RoomAdmin(admin.ModelAdmin):
    list_display = ('number', 'status', 'rent_price')

class PaymentAdmin(admin.ModelAdmin):
    list_display = ('room',  'payment_time', 'payment_amount', 'vehicle_info')

class TurnCashAdmin(admin.ModelAdmin):
    list_display = ('employee', 'turn_time', 'turn_amount', 'is_closed')

class CashMovementAdmin(admin.ModelAdmin):
    list_display = ('turn_cash', 'movement_type', 'concept', 'amount', 'date')

admin.site.register(Employee, EmployeeAdmin)
admin.site.register(Shift, ShiftAdmin)
admin.site.register(Room, RoomAdmin)
admin.site.register(Payment, PaymentAdmin)
admin.site.register(TurnCash, TurnCashAdmin)
admin.site.register(CashMovement, CashMovementAdmin)

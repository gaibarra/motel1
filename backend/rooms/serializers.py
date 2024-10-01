from rest_framework import serializers
from .models import Employee, Shift, Room, Payment, TurnCash, CashMovement

class EmployeeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Employee
        fields = '__all__'

class ShiftSerializer(serializers.ModelSerializer):
    class Meta:
        model = Shift
        fields = '__all__'

class RoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = Room
        fields = '__all__'

    def update(self, instance, validated_data):
        if validated_data.get('status') == 'OC':
            validated_data['occupation_time'] = validated_data.get('occupation_time', instance.occupation_time)  # Set the occupation_time
        elif validated_data.get('status') != instance.status:
            validated_data['occupation_time'] = None
        return super().update(instance, validated_data)

class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = '__all__'

class TurnCashSerializer(serializers.ModelSerializer):
    class Meta:
        model = TurnCash
        fields = '__all__'
        extra_kwargs = {
            'turn_description': {'required': False}
        }

class CashMovementSerializer(serializers.ModelSerializer):
    date = serializers.DateTimeField(format="%Y-%m-%d %H:%M", read_only=True)

    class Meta:
        model = CashMovement
        fields = '__all__'

class CashReportSerializer(serializers.Serializer):
    employee = EmployeeSerializer()
    turn_amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    total_entradas = serializers.DecimalField(max_digits=10, decimal_places=2)
    total_salidas = serializers.DecimalField(max_digits=10, decimal_places=2)
    saldo = serializers.DecimalField(max_digits=10, decimal_places=2)

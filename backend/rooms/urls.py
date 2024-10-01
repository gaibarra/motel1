from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    EmployeeViewSet,
    ShiftViewSet,
    RoomViewSet,
    PaymentViewSet,
    TurnCashViewSet,
    CashMovementViewSet,
    UserDetailView,
    get_occupation_time,
    get_last_payment_for_room,
    get_last_vehicle_info, 
    get_renewal_details
)

router = DefaultRouter()
router.register(r'employees', EmployeeViewSet)
router.register(r'shifts', ShiftViewSet)
router.register(r'rooms', RoomViewSet, basename='room')
router.register(r'payments', PaymentViewSet)
router.register(r'turncash', TurnCashViewSet)
router.register(r'cashmovements', CashMovementViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('turncash/generate_current_turn_report/', TurnCashViewSet.as_view({'get': 'generate_current_turn_report'}), name='generate-current-turn-report'),
    path('auth/user/', UserDetailView.as_view(), name='user-detail'),
    path('rooms/<int:number>/occupation_time/', get_occupation_time, name='get_occupation_time'),
    path('rooms/<int:number>/last_payment_for_room/', get_last_payment_for_room, name='last-payment-for-room'),
    path('rooms/<int:number>/last_vehicle_info/', get_last_vehicle_info, name='last_vehicle_info'),
    path('rooms/<int:number>/renewal_details/', get_renewal_details, name='get-renewal-details'),
]

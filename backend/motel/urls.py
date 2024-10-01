from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rooms.views import CurrentBalanceView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('rooms.urls')),  # Incluir las URLs de la aplicación 'rooms'
    path('accounts/', include('allauth.urls')),
    path('api/auth/', include('dj_rest_auth.urls')),
    path('api/auth/registration/', include('dj_rest_auth.registration.urls')),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/turncash/<int:turn_cash_id>/current_balance/', CurrentBalanceView.as_view(), name='current_balance'),
]

# Backend Role-Based Validation Guide

## Django/DRF Implementation (if using Python backend)

### 1. User Model Extension
```python
from django.contrib.auth.models import User
from django.db import models

class UserProfile(models.Model):
    ROLE_CHOICES = (
        ('customer', 'Customer'),
        ('landlord', 'Landlord'),
    )
    
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='customer')
    
    def __str__(self):
        return f"{self.user.username} - {self.role}"
```

### 2. Registration Serializer
```python
from rest_framework import serializers

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    role = serializers.ChoiceField(
        choices=['customer', 'landlord'],
        required=True,
        help_text="User role: customer or landlord"
    )
    
    class Meta:
        model = User
        fields = ['email', 'full_name', 'phone', 'password', 'role']
    
    def create(self, validated_data):
        role = validated_data.pop('role')
        user = User.objects.create_user(**validated_data)
        UserProfile.objects.create(user=user, role=role)
        return user
```

### 3. Role Permission Classes
```python
from rest_framework.permissions import BasePermission, SAFE_METHODS

class IsLandlord(BasePermission):
    """Allow access only to landlord users."""
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            hasattr(request.user, 'userprofile') and 
            request.user.userprofile.role == 'landlord'
        )

class IsCustomer(BasePermission):
    """Allow access only to customer users."""
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            hasattr(request.user, 'userprofile') and 
            request.user.userprofile.role == 'customer'
        )

class IsPropertyOwner(BasePermission):
    """Allow only property owners (landlords) to modify their properties."""
    
    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        return (
            obj.owner == request.user and 
            hasattr(request.user, 'userprofile') and 
            request.user.userprofile.role == 'landlord'
        )
```

### 4. Property ViewSet with Role Checks
```python
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

class PropertyViewSet(viewsets.ModelViewSet):
    queryset = Property.objects.all()
    serializer_class = PropertySerializer
    
    def get_permissions(self):
        if self.action == 'create':
            permission_classes = [IsAuthenticated, IsLandlord]
        elif self.action in ['update', 'partial_update', 'destroy']:
            permission_classes = [IsAuthenticated, IsPropertyOwner]
        else:
            permission_classes = [IsAuthenticated]
        
        return [permission() for permission in permission_classes]
    
    def perform_create(self, serializer):
        # Automatically set owner to current user
        serializer.save(owner=self.request.user)
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated, IsLandlord])
    def my_listings(self, request):
        """Get all properties owned by the current landlord."""
        properties = Property.objects.filter(owner=request.user)
        serializer = self.get_serializer(properties, many=True)
        return Response(serializer.data)
```

### 5. Booking ViewSet with Role Checks
```python
class BookingViewSet(viewsets.ModelViewSet):
    queryset = Booking.objects.all()
    serializer_class = BookingSerializer
    
    def get_permissions(self):
        if self.action == 'create':
            permission_classes = [IsAuthenticated, IsCustomer]
        else:
            permission_classes = [IsAuthenticated]
        
        return [permission() for permission in permission_classes]
    
    def perform_create(self, serializer):
        # Automatically set customer to current user
        serializer.save(customer=self.request.user)
    
    def get_queryset(self):
        """Users only see their own bookings."""
        user = self.request.user
        if hasattr(user, 'userprofile') and user.userprofile.role == 'landlord':
            # Landlords see bookings for their properties
            return Booking.objects.filter(property__owner=user)
        else:
            # Customers see their own bookings
            return Booking.objects.filter(customer=user)
```

### 6. Login Response Include Role
```python
from rest_framework_simplejwt.views import TokenObtainPairView

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        
        # Add role to token
        if hasattr(user, 'userprofile'):
            token['role'] = user.userprofile.role
        
        return token

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
```

### 7. User Detail Endpoint
```python
class UserDetailSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'email', 'full_name', 'phone', 'role']
    
    def get_role(self, obj):
        if hasattr(obj, 'userprofile'):
            return obj.userprofile.role
        return 'customer'

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_current_user(request):
    """Get current authenticated user with role."""
    serializer = UserDetailSerializer(request.user)
    return Response(serializer.data)
```

### 8. URLs Configuration
```python
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'properties', views.PropertyViewSet)
router.register(r'bookings', views.BookingViewSet)

urlpatterns = [
    path('api/', include(router.urls)),
    path('api/auth/register/', views.RegisterView.as_view(), name='register'),
    path('api/auth/login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/user/me/', views.get_current_user, name='current_user'),
]
```

## Validation Checklist

- [ ] User model includes role field
- [ ] Registration creates user with specified role
- [ ] Role is returned in login response
- [ ] Role is returned in user profile API
- [ ] Only landlords can create properties (POST /api/property/)
- [ ] Only property owners can edit/delete their properties
- [ ] Only customers can create bookings (POST /api/booking/)
- [ ] Bookings are filtered by user role
- [ ] Landlords cannot book properties
- [ ] Customers cannot create listings
- [ ] API returns 403 Forbidden for unauthorized role access

## API Response Examples

### Registration Response
```json
{
  "user": {
    "id": 1,
    "email": "landlord@example.com",
    "full_name": "John Doe",
    "phone": "1234567890",
    "role": "landlord"
  },
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

### Current User Response
```json
{
  "id": 1,
  "email": "landlord@example.com",
  "full_name": "John Doe",
  "phone": "1234567890",
  "role": "landlord"
}
```

### Unauthorized Request (Non-Landlord Creating Property)
```json
{
  "detail": "You do not have permission to perform this action."
}
// HTTP 403 Forbidden
```

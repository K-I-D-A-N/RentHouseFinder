# Role-Based Authentication & Authorization System

## Overview
This app implements a role-based access control system with two user roles:
- **Customer**: Browse, search, book, and review properties
- **Landlord**: All customer capabilities + create and manage property listings

## Implementation Details

### 1. Storage Layer (`src/services/storage.js`)
Role persistence functions:
- `saveRole(role)` - Store role in AsyncStorage
- `getRole()` - Retrieve stored role
- `removeRole()` - Clear role on logout

### 2. Authentication Context (`src/context/AuthContext.js`)
Enhanced with role management:
- `role` state - Current user's role
- `fetchCurrentUser()` - Extracts and stores role from API response
- `register()` - Saves role during registration
- `login()` - Restores role on login
- `logout()` - Clears role on logout

### 3. Registration Screen (`src/screens/auth/register.js`)
New features:
- Role selection dropdown with Customer/Landlord options
- Role validation (required before account creation)
- Role sent to backend in registration payload

Example flow:
```javascript
await register({ 
  full_name: fullName, 
  email, 
  phone, 
  password, 
  role: selectedRole  // 'customer' or 'landlord'
});
```

### 4. Role-Based Navigation (`src/navigation/BottomTabs.js`)
Conditional tab display:
- **Customers**: Home, Search, Favorites, Profile
- **Landlords**: Home, Search, **Post**, Favorites, Profile
- Post tab only appears for landlords

### 5. Profile Screen (`src/screens/profile/ProfileScreen.js`)
Role-aware content:
- "My Listings" option - Only shown to landlords
- "Want to list your property?" CTA - Only shown to customers
- All other features available to both roles

### 6. Property Management (`src/screens/property/AddPropertyScreen.js`)
Access control:
- Checks for `landlord` role on component mount
- Shows error message if non-landlord tries to access
- Prevents unauthorized property creation

### 7. Role Utilities (`src/utils/roleUtils.js`)
Helper functions for permission checking:
- `isLandlord(role)` - Check if user is landlord
- `isCustomer(role)` - Check if user is customer
- `getFeaturesByRole(role)` - Get available features
- `hasFeature(role, feature)` - Check specific permission
- `getRoleDisplayName(role)` - Get readable role name

## Usage Examples

### Check User Role in Components
```javascript
import useAuth from "../../hooks/useAuth";

function MyComponent() {
  const { role } = useAuth();
  const isLandlord = role === "landlord";
  
  return (
    <>
      {isLandlord && <LandlordOnlyFeature />}
      {!isLandlord && <CustomerOnlyFeature />}
    </>
  );
}
```

### Use Role Utilities
```javascript
import { isLandlord, hasFeature } from "../../utils/roleUtils";

const userRole = "landlord";

if (isLandlord(userRole)) {
  // Show landlord features
}

if (hasFeature(userRole, "createListing")) {
  // Enable property creation
}
```

### Protect Navigation
```javascript
import { ROLES } from "../../utils/roleUtils";

// In navigation guards or screen checks
if (role !== ROLES.LANDLORD) {
  Alert.alert("Landlord Only", "This feature is only available to landlords.");
  return null;
}
```

## Frontend-Backend Synchronization

### Registration Payload
```javascript
{
  full_name: string,
  email: string,
  phone: string,
  password: string,
  role: "customer" | "landlord"  // Sent to backend for validation
}
```

### Expected Response
```javascript
{
  user: {
    id: number,
    email: string,
    full_name: string,
    role: "customer" | "landlord",
    // ... other user fields
  },
  access_token: string,
  refresh_token: string
}
```

### Backend Validation Requirements
The backend should:
1. Validate role is one of: "customer", "landlord"
2. Store role in user profile
3. Include role in user data responses
4. Check role on protected endpoints:
   - POST `/api/property/` - Only landlords
   - PUT/DELETE `/api/property/<id>/` - Only landlord owners
   - POST `/api/booking/` - Only customers

## Security Considerations

1. **Frontend-Only UI Control**: Role-based navigation and UI hiding is for UX only
2. **Backend Enforcement**: Always validate role on the backend
3. **Token Validation**: API endpoints must verify user token and role
4. **Property Access**: Only property owners (landlords) can edit/delete their listings
5. **Booking Restrictions**: Only customers (non-property-owners) should be able to book

## Adding New Role-Based Features

1. Define permission in `roleUtils.js` getFeaturesByRole()
2. Check permission in component using `hasFeature(role, "featureName")`
3. Implement backend validation
4. Add backend role check to API endpoint
5. Test with both customer and landlord accounts

## Testing Checklist

- [ ] Register as Customer - verify Customer role is saved
- [ ] Register as Landlord - verify Landlord role is saved
- [ ] Customer login - verify Post tab not visible
- [ ] Landlord login - verify Post tab visible
- [ ] Customer profile - verify "My Listings" option not shown
- [ ] Landlord profile - verify "My Listings" option shown
- [ ] Customer trying to access AddPropertyScreen - verify error shown
- [ ] Landlord can access AddPropertyScreen - verify form displayed
- [ ] Logout and login - verify role persists from storage
- [ ] Backend rejects unauthorized property creation - verify API validation

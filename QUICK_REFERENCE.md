# Quick Reference Guide - Role-Based Authentication

## Access Role in Any Component

```javascript
import useAuth from "../../hooks/useAuth";

const { role } = useAuth();

// role will be: "customer", "landlord", or null
```

## Common Usage Patterns

### Pattern 1: Render Content Based on Role
```javascript
const { role } = useAuth();

return (
  <>
    {role === "landlord" && <LandlordOnly />}
    {role === "customer" && <CustomerOnly />}
  </>
);
```

### Pattern 2: Protect Navigation
```javascript
import { Alert } from "react-native";

const handlePress = () => {
  if (role !== "landlord") {
    Alert.alert("Landlord Only", "This feature is only for landlords");
    return;
  }
  navigation.navigate("AddProperty");
};
```

### Pattern 3: Use Helper Functions
```javascript
import { isLandlord, hasFeature } from "../../utils/roleUtils";

if (isLandlord(role)) {
  // Landlord-specific logic
}

if (hasFeature(role, "createListing")) {
  // Enable creation feature
}
```

### Pattern 4: Disable Button for Non-Landlords
```javascript
<TouchableOpacity 
  disabled={role !== "landlord"}
  style={[styles.button, role !== "landlord" && styles.disabledButton]}
>
  <Text>Create Listing</Text>
</TouchableOpacity>
```

## Registration Flow

Users can only register with one of two roles:
1. **Customer** - Can browse, search, book, review
2. **Landlord** - Can do everything + create/manage listings

```javascript
// Register payload sent to backend
{
  full_name: "John Doe",
  email: "john@example.com",
  phone: "1234567890",
  password: "securePassword123",
  role: "customer"  // or "landlord"
}
```

## Data Persistence

Role is stored in three places:
1. **AsyncStorage** - Survives app restart
2. **AuthContext State** - Used for current session
3. **JWT Token** - Optional, for backend validation

## Flow: App Startup → Role Restoration

```
App Starts
    ↓
AuthContext useEffect
    ↓
Check AsyncStorage for saved role
    ↓
Set role in state
    ↓
Components render with role
    ↓
UI updates based on role
```

## Common Mistakes to Avoid

❌ **DON'T**: Store role in component state
```javascript
// BAD
const [myRole, setMyRole] = useState(null);
```

✅ **DO**: Use useAuth hook
```javascript
// GOOD
const { role } = useAuth();
```

---

❌ **DON'T**: Check role without null check
```javascript
// BAD - will crash if role is null during loading
const isLandlord = role.equals("landlord");
```

✅ **DO**: Handle null/undefined role
```javascript
// GOOD
const isLandlord = role === "landlord";
```

---

❌ **DON'T**: Make permissions-only frontend check
```javascript
// BAD - backend must also validate
if (role === "landlord") {
  // Create property directly without backend check
}
```

✅ **DO**: Also validate on backend
```javascript
// GOOD - frontend UI control + backend validation
if (role === "landlord") {
  // Try to create, backend will verify
  createProperty(data).catch(err => {
    // Backend rejected: 403 Forbidden
  });
}
```

## Available Features Constant

```javascript
import { ROLES } from "../../utils/roleUtils";

ROLES.CUSTOMER  // "customer"
ROLES.LANDLORD  // "landlord"

// Better than hardcoding strings:
if (role === ROLES.LANDLORD) { }  // ✅ GOOD
if (role === "landlord") { }      // ❌ prone to typos
```

## Testing Checklist

### Frontend Tests
- [ ] Register as Customer
  - [ ] See "Select Role" → "Customer" in dropdown
  - [ ] Registration succeeds
  - [ ] Logged in as Customer
  - [ ] "Post" tab not visible
  - [ ] "My Listings" option hidden
  - [ ] "Want to list?" CTA visible

- [ ] Register as Landlord
  - [ ] See "Select Role" → "Landlord" in dropdown
  - [ ] Registration succeeds
  - [ ] Logged in as Landlord
  - [ ] "Post" tab visible
  - [ ] "My Listings" option visible
  - [ ] "Want to list?" CTA hidden
  - [ ] Can access AddPropertyScreen

- [ ] Customer tries to access AddPropertyScreen
  - [ ] See "Landlord Only" error
  - [ ] Cannot create listing

- [ ] Role persists across sessions
  - [ ] Login as Landlord
  - [ ] Verify "Post" tab visible
  - [ ] Close app (simulate)
  - [ ] Restart app
  - [ ] "Post" tab still visible

### Backend Tests
- [ ] Role accepted in registration
- [ ] Role stored in user model
- [ ] Role returned in user profile API
- [ ] Non-landlord cannot POST /api/property/
- [ ] Non-customer cannot POST /api/booking/
- [ ] Only owner can PUT/DELETE their property
- [ ] 403 Forbidden returned for unauthorized role access

## Environment Variables (if needed)

```javascript
// Could add to constants if needed:
export const ROLE_CUSTOMER = "customer";
export const ROLE_LANDLORD = "landlord";
```

## Debugging

### Check Current Role
```javascript
import useAuth from "../../hooks/useAuth";

// In any component:
const { role, user } = useAuth();
console.log("Current role:", role);
console.log("Current user:", user);
```

### Check Role Persistence
```javascript
import { getRole } from "../../services/storage";

// In async function or useEffect:
const savedRole = await getRole();
console.log("Saved role:", savedRole);
```

### Check Context Value
```javascript
import { AuthContext } from "../../context/AuthContext";
const auth = useContext(AuthContext);
console.log("Auth context:", auth);
```

## API Integration Notes

### Expected Registration Response
```json
{
  "user": {
    "id": 123,
    "email": "user@example.com",
    "full_name": "User Name",
    "phone": "1234567890",
    "role": "landlord"
  },
  "access_token": "eyJ0eXAi...",
  "refresh_token": "eyJ0eXAi..."
}
```

### Expected User Profile Response
```json
{
  "id": 123,
  "email": "user@example.com",
  "full_name": "User Name",
  "phone": "1234567890",
  "role": "customer"
}
```

### Expected Error for Unauthorized Role
```json
{
  "detail": "You do not have permission to perform this action."
}
// HTTP Status: 403 Forbidden
```

## Related Documentation

- **IMPLEMENTATION_SUMMARY.md** - Complete overview of all changes
- **ROLE_BASED_AUTH_GUIDE.md** - Detailed usage guide
- **BACKEND_ROLE_VALIDATION.md** - Backend implementation guide

---

**Last Updated**: Implementation Complete ✅
**Version**: 1.0
**Requires**: Backend role validation

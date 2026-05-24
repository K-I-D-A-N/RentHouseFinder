# Post Property API Integration - Frontend Complete ✅

## Summary of Changes

The Post Property screen has been completely rewritten to match the backend API requirements.

### Fields Now Being Sent ✅

The form now sends all required backend fields:

```javascript
{
  "title": "Modern 3BR Apartment",
  "description": "Spacious apartment with modern amenities...",
  "price_per_day": 5000,          // Changed from: price
  "price_per_week": 30000,        // New field
  "price_per_month": 100000,      // New field
  "deposit_amount": 50000,        // New field
  "condition": "good",       // New field (new|like_new|good|fair)
  "city": "Addis Ababa",         // Changed from: location
  "address": "Bole, Woliso St.",
  "category_id": "uuid-string",  // Changed from: property_type (now UUID from backend)
  "images": [ /* file uploads */ ]
}
```

## Form Fields & Features

### 1. **Basic Information**
- Title (required)
- Description (required, multi-line textarea)

### 2. **Pricing** (at least one required)
- Price/Day
- Price/Week
- Price/Month
- Deposit Amount (required)

### 3. **Category** (dropdown - fetches from backend)
- Dynamic category list from `/api/categories/`
- Sends category UUID as `category_id`
- Modal selector with radio buttons

### 4. **Condition** (dropdown)
- New
- Like New
- Good
- Fair

### 5. **Location**
- City (required)
- Address (required)

### 6. **Images** (optional)
- Drag from camera or gallery
- Multiple images supported
- Shown as thumbnails with remove option

## Validation

The form validates all required fields before submission:

✅ Title - must not be empty
✅ Description - must not be empty  
✅ At least one price field (daily/weekly/monthly)
✅ Deposit amount - required
✅ Condition - required
✅ City - required
✅ Address - required
✅ Category - required

If any field is missing, user gets an alert with specific message.

## FormData Structure

When submitting, the frontend properly appends fields to FormData:

```javascript
const formData = new FormData();

// Text fields
formData.append("title", title);
formData.append("description", description);
formData.append("price_per_day", pricePerDay);      // null if empty
formData.append("price_per_week", pricePerWeek);    // null if empty
formData.append("price_per_month", pricePerMonth);  // null if empty
formData.append("deposit_amount", depositAmount);
formData.append("condition", condition);
formData.append("city", city);
formData.append("address", address);
formData.append("category_id", selectedCategoryId);

// Image files (if any)
images.forEach((image, index) => {
  formData.append("images", {
    uri: image.uri,
    type: "image/jpeg",
    name: `property_${index}_${Date.now()}.jpg`,
  });
});
```

## Error Handling

The form displays clean error messages for:

1. **Validation Errors** - Shows specific field requirement
2. **API Errors** - Parses backend response and displays user-friendly message
3. **Network Errors** - Shows generic error message

Error messages are displayed via Alert dialog.

## Category Integration

**On Component Mount:**
- Fetches categories from `/api/categories/`
- Shows loading spinner in modal
- If fetch fails, displays error alert
- Categories displayed with their `name` property

**On Selection:**
- Stores `category.id` as UUID in `selectedCategoryId`
- Displays `category.name` as user-friendly label

## Success Flow

After successful submission:
1. Form fields are reset
2. Success alert is shown
3. User is navigated back to previous screen
4. Back button navigates to the previous screen

## API Endpoint Used

```
POST /listings/create/
Content-Type: multipart/form-data
```

Handled in: `src/api/propertyApi.js`

```javascript
export const createProperty = (data) => {
  const config = data instanceof FormData ? { headers: {} } : undefined;
  return api.post("/listings/create/", data, config);
};
```

## Backend Requirements

For this to work completely, your backend must:

1. ✅ Accept the fields listed above
2. ✅ Validate `category_id` exists and is a valid UUID
3. ✅ Support `price_per_day`, `price_per_week`, `price_per_month` as optional
4. ✅ Support `condition` field with those enum values (new | like_new | good | fair)
5. ✅ Support multiple image uploads via FormData
6. ✅ Return proper error responses with field-level validation

## Testing Checklist

- [ ] Category dropdown fetches and displays categories
- [ ] Can select a category
- [ ] Price fields accept numeric input
- [ ] At least one price field is required
- [ ] City and address are required
- [ ] Condition can be selected
- [ ] Images can be added/removed
- [ ] Form validates before submission
- [ ] Empty required fields show error alerts
- [ ] Form submission succeeds (check backend logs)
- [ ] Success message displays
- [ ] Form resets after successful submission
- [ ] User navigates back after submission

## Notes

- The form uses custom modals instead of native Picker to ensure consistency
- Category IDs are UUIDs (strings) not numeric IDs
- Prices are sent as numbers, not strings
- All text fields are trimmed before sending
- Images are optional - property can be created without images
- The form maintains visual consistency with the app theme

## File Modified

- `src/screens/property/AddPropertyScreen.js` - Complete rewrite

## Related Files

- `src/api/propertyApi.js` - Used for createProperty()
- `src/api/categoryApi.js` - Used for getCategories()
- `src/hooks/useAuth.js` - For role check (landlord only)
- `src/hooks/useTheme.js` - For theming

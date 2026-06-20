/**
 * Role-based access control utilities
 * Helps determine what features/screens should be available based on user role
 */

export const ROLES = {
  CUSTOMER: "customer",
  LANDLORD: "landlord",
};

/**
 * Check if user is a landlord
 * @param {string} role - The user's role
 * @returns {boolean} True if user is a landlord
 */
export const isLandlord = (role) => role === ROLES.LANDLORD;

/**
 * Check if user is a customer
 * @param {string} role - The user's role
 * @returns {boolean} True if user is a customer
 */
export const isCustomer = (role) => role === ROLES.CUSTOMER;

/**
 * Get features available for a role
 * @param {string} role - The user's role
 * @returns {object} Object containing available features
 */
export const getFeaturesByRole = (role) => {
  const baseFeatures = {
    browse: true,
    search: true,
    viewPropertyDetails: true,
    bookProperty: true,
    reviewProperty: true,
    viewBookings: true,
  };

  if (isLandlord(role)) {
    return {
      ...baseFeatures,
      createListing: true,
      manageListing: true,
      viewMyListings: true,
      editProperty: true,
      deleteProperty: true,
      viewAnalytics: true,
    };
  }

  return baseFeatures;
};

/**
 * Check if user has permission for a specific feature
 * @param {string} role - The user's role
 * @param {string} feature - The feature to check
 * @returns {boolean} True if user has permission
 */
export const hasFeature = (role, feature) => {
  const features = getFeaturesByRole(role);
  return features[feature] || false;
};

/**
 * Get role display name
 * @param {string} role - The user's role
 * @returns {string} Human-readable role name
 */
export const getRoleDisplayName = (role) => {
  switch (role) {
    case ROLES.LANDLORD:
      return "Landlord";
    case ROLES.CUSTOMER:
      return "Customer";
    default:
      return "User";
  }
};

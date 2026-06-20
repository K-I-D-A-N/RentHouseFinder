export const canViewContactInfo = (booking) => booking?.contact_visible === true;

export const getOwnerDisplayFromBooking = (booking) => {
  const owner = booking?.owner || booking?.landlord || booking?.listing?.owner || {};
  const base = {
    fullName:
      owner.full_name ||
      booking?.owner_name ||
      owner.name ||
      "Landlord",
    city: owner.city || booking?.owner_city || booking?.listing?.city || "",
  };

  if (!canViewContactInfo(booking)) {
    return base;
  }

  return {
    ...base,
    email: owner.email || booking?.owner_email || "",
    phone: owner.phone || booking?.owner_phone || "",
  };
};

export const getRenterDisplay = (booking) => {
  const renter = booking?.renter || {};
  const base = {
    fullName:
      renter.full_name ||
      booking?.renter_name ||
      renter.name ||
      "Unknown",
    city: renter.city || booking?.renter_city || "",
  };

  if (!canViewContactInfo(booking)) {
    return base;
  }

  return {
    ...base,
    email: renter.email || booking?.renter_email || "",
    phone: renter.phone || booking?.renter_phone || "",
  };
};

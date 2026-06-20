export const canViewContactInfo = (booking) => booking?.contact_visible === true;

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

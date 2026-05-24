// Helpers for listing images and owner fields
export function getPrimaryImageUrl(listing) {
  if (!listing) return null;
  // prefer explicit top-level fields
  const direct = listing.image_url || listing.image || listing.cover_image;
  if (direct && typeof direct === "string" && isValidUrl(direct)) return direct;

  // handle images array (backend format: { id, image_url, is_primary })
  const imgs = Array.isArray(listing.images) ? listing.images : null;
  if (imgs && imgs.length > 0) {
    const primary = imgs.find((i) => i && (i.is_primary === true || i.is_primary === "true"));
    const src = primary?.image_url || primary?.url || primary?.image || primary?.path;
    if (src && isValidUrl(src)) return src;
    // fallback to first image
    const first = imgs[0];
    const firstSrc = first?.image_url || first?.url || first?.image || first?.uri || first;
    if (firstSrc && typeof firstSrc === "string" && isValidUrl(firstSrc)) return firstSrc;
  }

  return null;
}

export function getImageSourceForListing(listing) {
  const url = getPrimaryImageUrl(listing);
  if (url) return { uri: url };
  return require("../../assets/images/placeholder.jpg");
}

export function getOwnerField(listing, field) {
  const owner = listing?.owner || listing?.host || listing?.user || {};
  if (!owner) return "-";
  const val = owner[field];
  if (val == null || val === "" || val === "Unavailable" || val === "Host") return "-";
  return String(val);
}

function isValidUrl(val) {
  if (!val || typeof val !== "string") return false;
  return /^https?:\/\//i.test(val);
}

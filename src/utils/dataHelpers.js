// Base URL for images - extracts domain from API base URL
const IMAGE_BASE_URL = "https://betrent-u5jj.onrender.com";

// Helpers for listing images and owner fields
export function getPrimaryImageUrl(listing) {
  if (!listing) {
    console.log("getPrimaryImageUrl - listing is null/undefined");
    return null;
  }

  const imageKeys = [
    "primary_image",
    "primary_image_url",
    "primaryImage",
    "image_url",
    "image",
    "cover_image",
    "coverImage",
    "thumbnail",
    "photo_url",
    "photo",
    "featured_image",
    "featuredImage",
  ];

  for (const key of imageKeys) {
    if (listing[key]) {
      const result = extractImageFromField(listing[key]);
      if (result) {
        console.log(`getPrimaryImageUrl - found image for key ${key}:`, { output: result });
        return result;
      }
    }
  }

  const arrayKeys = ["images", "photos", "gallery", "media", "attachments", "property_images", "listing_images"];
  for (const key of arrayKeys) {
    const arrayValue = Array.isArray(listing[key]) ? listing[key] : null;
    if (!arrayValue || !arrayValue.length) continue;

    console.log(`getPrimaryImageUrl - scanning image array for key ${key}:`, arrayValue.length);

    const primaryItem = arrayValue.find((item) =>
      item && (item.is_primary === true || item.is_primary === "true" || item.selected === true || item.default === true || item.main === true)
    );
    if (primaryItem) {
      const result = extractImageFromField(primaryItem);
      if (result) {
        console.log(`getPrimaryImageUrl - primary item from ${key}:`, { result });
        return result;
      }
    }

    for (const item of arrayValue) {
      const result = extractImageFromField(item);
      if (result) {
        console.log(`getPrimaryImageUrl - fallback item from ${key}:`, { result });
        return result;
      }
    }
  }

  console.log("getPrimaryImageUrl - NO IMAGE FOUND after all checks");
  return null;
}

// Extract image URL from various field types (object, array, string)
function extractImageFromField(field) {
  if (!field) return null;

  if (typeof field === "string") {
    return normalizeImageUrl(field);
  }

  if (Array.isArray(field)) {
    for (const candidate of field) {
      const result = extractImageFromField(candidate);
      if (result) return result;
    }
    return null;
  }

  if (typeof field === "object") {
    const candidates = [
      field.url,
      field.image,
      field.image_url,
      field.path,
      field.src,
      field.uri,
      field.thumbnail,
      field.thumb,
      field.original,
      field.preview,
      field.photo,
      field.photo_url,
      field.image_uri,
      field.imagePath,
    ];
    for (const url of candidates) {
      if (typeof url === "string" && url.trim()) {
        console.log("extractImageFromField - found URL in object:", { url });
        return normalizeImageUrl(url);
      }
    }

    if (field.data) {
      const result = extractImageFromField(field.data);
      if (result) return result;
    }
    if (field.attributes) {
      const result = extractImageFromField(field.attributes);
      if (result) return result;
    }
    if (field.image && typeof field.image === "object") {
      const result = extractImageFromField(field.image);
      if (result) return result;
    }
    if (field.url && typeof field.url === "object") {
      const result = extractImageFromField(field.url);
      if (result) return result;
    }

    for (const key of Object.keys(field)) {
      if (typeof field[key] === "object") {
        const result = extractImageFromField(field[key]);
        if (result) return result;
      }
    }
  }

  return null;
}

// Convert relative image paths to full URLs
function normalizeImageUrl(url) {
  if (!url || typeof url !== "string") {
    console.log("normalizeImageUrl - invalid input:", url);
    return null;
  }
  
  console.log("normalizeImageUrl - input:", url);
  
  // Already a full URL
  if (/^https?:\/\//i.test(url)) {
    console.log("normalizeImageUrl - already full URL");
    return url;
  }
  
  // Relative path - prepend base URL
  if (url.startsWith("/")) {
    const result = `${IMAGE_BASE_URL}${url}`;
    console.log("normalizeImageUrl - converted relative:", { input: url, output: result });
    return result;
  }
  
  // No leading slash - add it
  const result = `${IMAGE_BASE_URL}/${url}`;
  console.log("normalizeImageUrl - converted no slash:", { input: url, output: result });
  return result;
}

export function getImageSourceForListing(listing) {
  const url = getPrimaryImageUrl(listing);
  if (url) return { uri: url };
  return require("../../assets/images/placeholder.jpg");
}

export function getOwnerField(listing, field) {
  const owner = listing?.owner || listing?.host || listing?.user || {};
  if (!owner) return "Not available";
  
  // Special handling for phone field - try multiple sources
  if (field === "phone" || field === "mobile") {
    const phone = owner.phone || owner.mobile || owner.contact || owner.phone_number || owner.contact_phone || "";
    if (phone && phone !== "" && phone !== "Unavailable" && phone !== "N/A") {
      return String(phone);
    }
    // Fallback to email if phone is not available
    const email = owner.email || owner.contact_email || owner.owner_email || "";
    if (email && email !== "" && email !== "N/A") return String(email);
    return "Contact landlord";
  }
  
  const val = owner[field];
  if (val == null || val === "" || val === "Unavailable" || val === "Host" || val === "N/A") return "Not available";
  return String(val);
}

// Sort listings putting active featured listings first
export function sortByFeatured(listings) {
  if (!Array.isArray(listings)) return listings || [];
  const now = new Date();
  return [...listings].sort((a, b) => {
    const aFeatured = Boolean(a?.is_featured) && (!a?.featured_until || new Date(a.featured_until) > now);
    const bFeatured = Boolean(b?.is_featured) && (!b?.featured_until || new Date(b.featured_until) > now);
    if (aFeatured === bFeatured) return 0;
    return aFeatured ? -1 : 1;
  });
}

// Base URL for images - extracts domain from API base URL
const IMAGE_BASE_URL = "https://betrent-u5jj.onrender.com";

// Helpers for listing images and owner fields
export function getPrimaryImageUrl(listing) {
  if (!listing) {
    console.log("getPrimaryImageUrl - listing is null/undefined");
    return null;
  }
  
  // ALWAYS log the actual listing data
  console.log("getPrimaryImageUrl - FULL LISTING DATA:", JSON.stringify(listing, null, 2).substring(0, 2000));
  
  // Check primary_image - it might be an object/array/string/null
  console.log("getPrimaryImageUrl - primary_image value:", listing.primary_image, "type:", typeof listing.primary_image);
  
  if (listing.primary_image) {
    const result = extractImageFromField(listing.primary_image);
    if (result) {
      console.log("getPrimaryImageUrl - primary_image extracted:", { input: listing.primary_image, output: result });
      return result;
    }
  }
  
  // prefer explicit primary image fields if present
  const primaryDirect = listing.primary_image_url || listing.primaryImage;
  if (primaryDirect && typeof primaryDirect === "string") {
    const result = normalizeImageUrl(primaryDirect);
    console.log("getPrimaryImageUrl - primaryDirect found:", { primaryDirect, result });
    return result;
  }
  
  // prefer explicit top-level fields
  const direct = listing.image_url || listing.image || listing.cover_image;
  if (direct && typeof direct === "string") {
    const result = normalizeImageUrl(direct);
    console.log("getPrimaryImageUrl - direct found:", { field: direct, result });
    return result;
  }

  // handle images array (backend format: { id, image_url, is_primary })
  const imgs = Array.isArray(listing.images) ? listing.images : null;
  if (imgs && imgs.length > 0) {
    console.log("getPrimaryImageUrl - images array found:", imgs.length);
    const primary = imgs.find((i) => i && (i.is_primary === true || i.is_primary === "true"));
    const src = primary?.image_url || primary?.url || primary?.image || primary?.path;
    if (src && typeof src === "string") {
      const result = normalizeImageUrl(src);
      console.log("getPrimaryImageUrl - primary image from array:", { src, result });
      return result;
    }
    
    // fallback to first image
    const first = imgs[0];
    const firstSrc = first?.image_url || first?.url || first?.image || first?.uri || first;
    if (firstSrc && typeof firstSrc === "string") {
      const result = normalizeImageUrl(firstSrc);
      console.log("getPrimaryImageUrl - first image from array:", { firstSrc, result });
      return result;
    }
  }

  console.log("getPrimaryImageUrl - NO IMAGE FOUND after all checks");
  return null;
}

// Extract image URL from various field types (object, array, string)
function extractImageFromField(field) {
  if (!field) return null;
  
  // If it's a string, normalize it
  if (typeof field === "string") {
    return normalizeImageUrl(field);
  }
  
  // If it's an object, try common image field names
  if (typeof field === "object" && !Array.isArray(field)) {
    const url = field.url || field.image || field.image_url || field.path || field.src || field.uri;
    if (url && typeof url === "string") {
      console.log("extractImageFromField - found URL in object:", { url });
      return normalizeImageUrl(url);
    }
  }
  
  // If it's an array, get the first item's URL
  if (Array.isArray(field) && field.length > 0) {
    const firstItem = field[0];
    if (typeof firstItem === "string") {
      console.log("extractImageFromField - found URL in array:", { url: firstItem });
      return normalizeImageUrl(firstItem);
    }
    if (typeof firstItem === "object") {
      const url = firstItem.url || firstItem.image || firstItem.image_url || firstItem.path || firstItem.src || firstItem.uri;
      if (url && typeof url === "string") {
        console.log("extractImageFromField - found URL in array object:", { url });
        return normalizeImageUrl(url);
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

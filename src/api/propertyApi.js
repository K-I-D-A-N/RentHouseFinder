import api from "./axiosConfig";

// Fetch only the current user's listings
export const getMyListings = () => api.get("/listings/my/listings");

export const getProperties = (params) => {
  console.log("getProperties called with params:", params);
  return api.get("/listings/", { params }).then(response => {
    console.log("getProperties response:", { count: response.data?.length || "?", sample: response.data?.[0] });
    return response;
  });
};

export const getPropertyById = (id) => api.get(`/listings/${id}/`);

export const createProperty = (data) => {
  const config = data instanceof FormData ? { headers: {} } : undefined;
  return api.post("/listings/create/", data, config).then(response => {
    console.log("createProperty response:", response.data);
    return response;
  });
};

// Upload image for a listing
export const uploadListingImage = (listingId, imageUri, isPrimary = false, sortOrder = 1) => {
  const formData = new FormData();
  formData.append("image", {
    uri: imageUri,
    type: "image/jpeg",
    name: `listing_${listingId}_${Date.now()}.jpg`,
  });
  formData.append("is_primary", isPrimary ? "true" : "false");
  formData.append("sort_order", sortOrder);

  console.log("uploadListingImage - uploading to /listings/" + listingId + "/images/", {
    isPrimary,
    sortOrder,
  });

  return api.post(`/listings/${listingId}/images/`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  }).then(response => {
    console.log("uploadListingImage response:", response.data);
    return response;
  });
};

export const updateProperty = (id, data) => api.put(`/listings/${id}/update/`, data);
export const deleteProperty = (id) => api.delete(`/listings/${id}/delete/`);


import api from "./axiosConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
export const uploadListingImage = async (listingId, imageUri, imageName, imageType, isPrimary = false, sortOrder = 0) => {
  const fileName = imageName || `listing_${listingId}_${Date.now()}.jpg`;
  const mimeType = imageType || "image/jpeg";

  console.log("uploadListingImage - preparing image upload", {
    listingId,
    imageUri,
    fileName,
    mimeType,
    isPrimary,
    sortOrder,
  });

  const formData = new FormData();
  formData.append("image", {
    uri: imageUri,
    type: mimeType,
    name: fileName,
  });
  formData.append("is_primary", String(isPrimary));
  formData.append("sort_order", String(sortOrder));

  const token = await AsyncStorage.getItem("auth_token");
  const baseURL = api.defaults.baseURL ? api.defaults.baseURL.replace(/\/$/, "") : "";
  const url = `${baseURL}/listings/${listingId}/images/`;

  const headers = {
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  console.log("uploadListingImage - sending fetch request", { url, headers, fileName, mimeType });

  const response = await fetch(url, {
    method: "POST",
    body: formData,
    headers,
  });

  const responseText = await response.text();
  let responseData = responseText;
  try {
    responseData = JSON.parse(responseText);
  } catch (error) {
    // response is not JSON
  }

  if (!response.ok) {
    console.error("uploadListingImage failed:", { status: response.status, responseData });
    const error = new Error(`Image upload failed with status ${response.status}`);
    error.response = { status: response.status, data: responseData };
    throw error;
  }

  console.log("uploadListingImage success:", responseData);
  return { data: responseData };
};

export const updateProperty = (id, data) => api.put(`/listings/${id}/update/`, data);
export const deleteProperty = (id) => api.delete(`/listings/${id}/delete/`);


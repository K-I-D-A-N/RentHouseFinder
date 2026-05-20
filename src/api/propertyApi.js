import api from "./axiosConfig";

export const getProperties = (params) => api.get("/listings/", { params });
export const getPropertyById = (id) => api.get(`/listings/${id}/`);
export const createProperty = (data) => {
  const config = data instanceof FormData ? { headers: {} } : undefined;
  return api.post("/listings/create/", data, config);
};
export const updateProperty = (id, data) => api.put(`/listings/${id}/update/`, data);
export const deleteProperty = (id) => api.delete(`/listings/${id}/delete/`);


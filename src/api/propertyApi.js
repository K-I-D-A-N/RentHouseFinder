import api from "./axiosConfig";

export const getProperties = (params) => api.get("/listings/", { params });
export const getPropertyById = (id) => api.get(`/listings/${id}/`);
export const createProperty = (data) => api.post("/listings/create/", data);
export const updateProperty = (id, data) => api.put(`/listings/${id}/update/`, data);
export const deleteProperty = (id) => api.delete(`/listings/${id}/delete/`);


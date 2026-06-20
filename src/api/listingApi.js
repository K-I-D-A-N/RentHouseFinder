import api from "./axiosConfig";

export const getListingBySlug = (slug) => api.get(`/listings/${slug}/`);

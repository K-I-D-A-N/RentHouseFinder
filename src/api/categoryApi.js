import api from "./axiosConfig";

export const getCategories = (params) => api.get("/categories/", { params });
export const getCategoryBySlug = (slug) => api.get(`/categories/${slug}/`);
export const createCategory = (data) => api.post("/categories/create/", data);
export const updateCategory = (categoryId, data) => api.patch(`/categories/${categoryId}/update/`, data);
export const deleteCategory = (categoryId) => api.delete(`/categories/${categoryId}/delete/`);

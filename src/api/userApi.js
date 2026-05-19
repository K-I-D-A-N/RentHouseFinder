import api from "./axiosConfig";

export const getCurrentUser = () => api.get("/users/me/");
export const updateCurrentUser = (data, config) => api.patch("/users/me/", data, config);
export const getUsers = (params) => api.get("/users/", { params });
export const updateUser = (userId, data) => api.patch(`/users/${userId}/`, data);
export const getUserById = (userId) => api.get(`/users/${userId}/`);

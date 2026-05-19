import api from "./axiosConfig";

export const createBooking = (data) => api.post("/bookings/", data);
export const getBookings = (params) => api.get("/bookings/my/rentals/", { params });
export const getMyBookings = getBookings;
export const getBookingById = (id) => api.get(`/bookings/${id}/`);
export const cancelBooking = (id) => api.put(`/bookings/${id}/status/`, { status: 'cancelled' });


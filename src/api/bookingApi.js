// Fetch landlord's booking requests
export const getMyRequests = () => api.get("/bookings/my/requests/");

// Update booking status (approve/reject)
export const updateBookingStatus = (id, status, cancellation_reason) =>
	api.put(`/bookings/${id}/status/`, cancellation_reason
		? { status, cancellation_reason }
		: { status });
import api from "./axiosConfig";

export const createBooking = (data) => api.post("/bookings/", data);
export const getBookings = (params) => api.get("/bookings/my/rentals/", { params });
export const getMyBookings = getBookings;
export const getBookingById = (id) => api.get(`/bookings/${id}/`);
export const cancelBooking = (id) => api.put(`/bookings/${id}/status/`, { status: 'cancelled' });


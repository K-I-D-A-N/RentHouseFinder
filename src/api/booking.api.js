import api from "./axiosConfig";

export const getMyRequests = () => api.get("/bookings/my/requests/");
export const updateBookingStatus = (id, status, cancellation_reason) =>
  api.put(
    `/bookings/${id}/status/`,
    cancellation_reason
      ? { status, cancellation_reason }
      : { status }
  );

export const createBooking = (data) => api.post("/bookings/", data);
export const getBookings = (params) => api.get("/bookings/my/rentals/", { params });
export const getBookingById = (id) => api.get(`/bookings/${id}/`);
export const cancelBooking = (id) => api.put(`/bookings/${id}/status/`, { status: "cancelled" });

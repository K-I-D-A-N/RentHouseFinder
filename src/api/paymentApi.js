import api from "./axiosConfig";

export const initiatePayment = (data) => api.post("/payments/initiate/", data);
export const verifyPaymentByFixRef = (fixRef) => api.get("/payments/verify/fix_ref/", { params: { fix_ref: fixRef } });
export const getPaymentsByBooking = (bookingId, params) => api.get(`/payments/booking/${bookingId}/`, { params });
export const createPaymentWebhook = (data) => api.post("/payments/webhook/chapa/", data);

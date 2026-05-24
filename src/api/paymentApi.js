import api from "./axiosConfig";

export const initiatePayment = (data) => api.post("/payments/initiate/", data);
export const verifyPaymentByTxRef = (txRef) => api.get(`/payments/verify/${txRef}/`);
export const getPaymentByBooking = (bookingId) => api.get(`/payments/booking/${bookingId}/`);
export const manualUpdatePayment = (paymentId) => api.put(`/payments/${paymentId}/manual-update/`);
export const createPaymentWebhook = (data) => api.post("/payments/webhook/chapa/", data);

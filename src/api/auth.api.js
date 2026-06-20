import api from "./axiosConfig";

export const login = (data) => api.post("/auth/login/", data);
export const register = (data) => api.post("/auth/register/", data);
export const refreshToken = (data) => api.post("/auth/refresh/", data);
export const verifyEmail = (email, otp) => api.post("/auth/verify-email/", { email, otp });
export const resendOtp = (email, purpose = "register") =>
  api.post("/auth/resend-otp/", { email, purpose });
export const forgotPassword = (email) => api.post("/auth/forgot-password/", { email });
export const resetPassword = (data) => api.post("/auth/reset-password/", data);

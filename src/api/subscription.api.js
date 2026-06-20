import api from "./axiosConfig";

export const getPlans = () => api.get("/subscriptions/plans/");
export const upgradeSubscription = (payload) => api.post("/subscriptions/upgrade/", payload);
export const startCustomerPremiumUpgrade = (payload = {}) =>
  api.post("/subscriptions/upgrade/", { upgrade_type: "customer_premium", ...payload });
export const getCustomerPremiumStatus = () => api.get("/subscriptions/customer/premium/status/");
export const verifyCustomerPremium = (txRef) => api.get(`/subscriptions/customer/premium/verify/${txRef}/`);

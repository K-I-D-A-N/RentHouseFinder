import api from "./axiosConfig";

export const getPlans = () => api.get("/subscriptions/plans/");
export const upgradeSubscription = (payload) => api.post("/subscriptions/upgrade/", payload);

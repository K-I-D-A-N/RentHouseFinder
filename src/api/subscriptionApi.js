import api from "./axiosConfig";

export const getLandlordSubscription = () =>
  api.get("/subscriptions/landlord/me/");

import { getPlans, upgradeSubscription } from "../api/subscription.api";
import { verifyExternalPayment } from "../api/paymentApi";

export const fetchPlans = async () => {
  const response = await getPlans();
  const data = response.data;
  return data?.results ?? data?.items ?? (Array.isArray(data) ? data : []);
};

export const upgradePlan = async (payload) => {
  const response = await upgradeSubscription(payload);
  return response.data;
};

export const verifyExternalPaymentStatus = async (transactionId) => {
  const response = await verifyExternalPayment(transactionId);
  return response.data;
};

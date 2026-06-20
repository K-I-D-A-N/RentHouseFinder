import {
  getPlans,
  upgradeSubscription,
  startCustomerPremiumUpgrade,
  getCustomerPremiumStatus,
  verifyCustomerPremium,
} from "../api/subscription.api";
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

export const initiateCustomerPremiumUpgrade = async (payload = {}) => {
  const response = await startCustomerPremiumUpgrade(payload);
  return response.data;
};

export const checkCustomerPremiumStatus = async () => {
  const response = await getCustomerPremiumStatus();
  return response.data;
};

export const verifyCustomerPremiumPayment = async (txRef) => {
  const response = await verifyCustomerPremium(txRef);
  return response.data;
};

export const SUBSCRIPTION_STATUS = {
  PENDING_EMAIL: "pending_email",
  PENDING_PAYMENT: "pending_payment",
  ACTIVE: "active",
};

export const isPendingEmail = (status) => status === SUBSCRIPTION_STATUS.PENDING_EMAIL;
export const isPendingPayment = (status) => status === SUBSCRIPTION_STATUS.PENDING_PAYMENT;
export const isActiveSubscription = (status) => status === SUBSCRIPTION_STATUS.ACTIVE;

export const getSubscriptionScreen = (status) => {
  switch (status) {
    case SUBSCRIPTION_STATUS.PENDING_EMAIL:
      return "OTPVerificationScreen";
    case SUBSCRIPTION_STATUS.PENDING_PAYMENT:
      return "PaymentPendingScreen";
    case SUBSCRIPTION_STATUS.ACTIVE:
      return "SubscriptionStatusScreen";
    default:
      return "PlanSelectionScreen";
  }
};

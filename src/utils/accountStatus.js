export const ACCOUNT_STATUS = {
  PENDING_EMAIL: "pending_email",
  PENDING_PAYMENT: "pending_payment",
  ACTIVE: "active",
};

export const normalizeAccountStatus = (status) =>
  String(status || "").trim().toLowerCase();

export const isPendingEmail = (status, emailVerified) => {
  const normalized = normalizeAccountStatus(status);
  if (normalized === ACCOUNT_STATUS.PENDING_PAYMENT) return false;
  return normalized === ACCOUNT_STATUS.PENDING_EMAIL || (!emailVerified && normalized !== ACCOUNT_STATUS.ACTIVE);
};

export const isPendingPayment = (status) =>
  normalizeAccountStatus(status) === ACCOUNT_STATUS.PENDING_PAYMENT;

export const isActiveAccount = (status) =>
  normalizeAccountStatus(status) === ACCOUNT_STATUS.ACTIVE;

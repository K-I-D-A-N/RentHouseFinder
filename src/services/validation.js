export const ETHIOPIAN_PHONE_PATTERN = /^2519\d{8}$/;

export const normalizeEthiopianPhone = (value) => {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("251")) {
    const normalized = digits.slice(0, 12);
    return normalized.length >= 3 ? normalized : "251";
  }

  const suffix = digits.replace(/^251/, "");
  const normalized = ("251" + suffix).slice(0, 12);
  return normalized.length >= 3 ? normalized : "251";
};

export const validateEthiopianPhone = (value) => ETHIOPIAN_PHONE_PATTERN.test(String(value || ""));

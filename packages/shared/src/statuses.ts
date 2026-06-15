export const contractStatuses = [
  "DRAFT",
  "ACTIVE",
  "DUE_SOON",
  "OVERDUE",
  "GRACE_PERIOD",
  "REVIEW_REQUIRED",
  "RESTRICTED",
  "RECOVERY",
  "PAID_OFF",
  "CANCELLED",
] as const;

export const devicePlatforms = ["ANDROID", "IOS", "IPADOS", "MACOS", "OTHER"] as const;
export const paymentMethods = ["CASH", "BANK_TRANSFER", "PROMPTPAY", "CARD", "OTHER"] as const;
export const agreementTypes = ["LEASE_TO_OWN", "RENTAL", "INSTALLMENT_ONLY"] as const;

export const deviceControlModes = ["NONE", "ANDROID_ENTERPRISE", "APPLE_MDM_ADE", "APPLE_MDM_MANUAL", "ICLOUD_CUSTODY"] as const;

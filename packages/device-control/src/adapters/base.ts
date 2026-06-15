import type { DeviceControlResult } from "../types";

export type PlatformKind = "ANDROID" | "IOS" | "IPADOS" | "MACOS";

export type EnrollmentRequest = {
  organizationId: string;
  deviceId?: string;
  contractId?: string;
  platform: PlatformKind;
  mode: "ANDROID_FULLY_MANAGED" | "ANDROID_DEDICATED" | "APPLE_ADE" | "APPLE_DEVICE_ENROLLMENT";
  policyId?: string;
  displayName?: string;
};

export type EnrollmentResponse = DeviceControlResult & {
  enrollmentId?: string;
  token?: string;
  qrCode?: string;
  enrollmentUrl?: string;
  expiresAt?: string;
  setupRequired?: string[];
};

export type PolicyRequest = {
  organizationId: string;
  policyId: string;
  payload: unknown;
};

export type ProviderSetupStatus = {
  provider: string;
  status: "MOCK" | "SETUP_REQUIRED" | "READY" | "ERROR";
  missing: string[];
  required: string[];
  docs: string[];
};

export type AndroidSignupUrlResponse = DeviceControlResult & {
  signupUrlName?: string;
  url?: string;
  enterpriseToken?: string;
setupRequired?: string[];
};

export type AndroidEnterpriseResponse = DeviceControlResult & {
  enterpriseName?: string;
};

export interface LeaseMdmProvider {
  providerName: string;
  getSetupStatus(): ProviderSetupStatus;
  createEnrollment(input: EnrollmentRequest): Promise<EnrollmentResponse>;
  publishPolicy(input: PolicyRequest): Promise<DeviceControlResult>;
  syncDevice(input: { providerDeviceId?: string; serialNumber?: string; imei?: string }): Promise<DeviceControlResult>;
  sendCommand(input: { deviceId: string; providerDeviceId?: string; commandType: string; payload?: unknown; reason: string }): Promise<DeviceControlResult>;
  releaseDevice(input: { deviceId: string; providerDeviceId?: string; reason: string }): Promise<DeviceControlResult>;
}

export interface AndroidEnterpriseSignupProvider extends LeaseMdmProvider {
  createSignupUrl(input: { callbackUrl: string; adminEmail?: string; allowedDomains?: string[] }): Promise<AndroidSignupUrlResponse>;
  createEnterprise(input: { enterpriseToken: string; signupUrlName: string; displayName: string }): Promise<AndroidEnterpriseResponse>;
}

export function missingEnv(keys: string[]) {
  return keys.filter((key) => !process.env[key] || String(process.env[key]).trim() === "");
}

export function setupRequired(provider: string, required: string[], docs: string[]): ProviderSetupStatus {
  const missing = missingEnv(required);
  return {
    provider,
    status: missing.length ? "SETUP_REQUIRED" : "READY",
    missing,
    required,
    docs,
  };
}

import type { DeviceControlResult } from "../types";
import { leaseBasicAndroidPolicy, leaseLimitedAndroidPolicy, leaseReleaseAndroidPolicy } from "../policies/android-lease-policies";
import { type AndroidEnterpriseResponse, type AndroidSignupUrlResponse, type EnrollmentRequest, type EnrollmentResponse, type AndroidEnterpriseSignupProvider, type PolicyRequest, setupRequired } from "./base";
import { getAndroidEnterpriseName, getAndroidManagementAccessToken } from "./android-auth";
import { providerFetchJson } from "./http";

const ANDROID_REQUIRED_ENV = [
  "ANDROID_MANAGEMENT_PROJECT_ID",
  "ANDROID_MANAGEMENT_ENTERPRISE_NAME",
  "ANDROID_MANAGEMENT_SERVICE_ACCOUNT_JSON",
  "ANDROID_MANAGEMENT_CALLBACK_URL",
];

const BASE_URL = "https://androidmanagement.googleapis.com/v1";

type EnrollmentTokenResponse = {
  name?: string;
  value?: string;
  qrCode?: string;
  expirationTimestamp?: string;
};

type AndroidOperation = {
  name?: string;
  metadata?: unknown;
  done?: boolean;
  error?: unknown;
  response?: unknown;
};

function normalizePolicyId(policyId?: string) {
  return (policyId || "lease-basic").replace(/[^a-zA-Z0-9._-]/g, "-");
}

function pickPolicyPayload(policyId: string, payload: unknown) {
  if (payload && typeof payload === "object" && Object.keys(payload as Record<string, unknown>).length > 0) return payload;
  if (policyId.includes("limited")) return leaseLimitedAndroidPolicy;
  if (policyId.includes("release")) return leaseReleaseAndroidPolicy;
  return leaseBasicAndroidPolicy;
}

async function androidFetch<T>(path: string, init: RequestInit = {}) {
  const token = await getAndroidManagementAccessToken();
  return providerFetchJson<T>(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

export class AndroidManagementAdapter implements AndroidEnterpriseSignupProvider {
  providerName = "ANDROID_MANAGEMENT_API";

  getSetupStatus() {
    return setupRequired(this.providerName, ANDROID_REQUIRED_ENV, [
      "docs/providers/android-management-api-setup-th.md",
      "docs/providers/google-cloud-service-account-th.md",
      "docs/providers/android-enrollment-test-plan-th.md",
    ]);
  }


  async createSignupUrl(input: { callbackUrl: string; adminEmail?: string; allowedDomains?: string[] }): Promise<AndroidSignupUrlResponse> {
    const missing = ["ANDROID_MANAGEMENT_PROJECT_ID", "ANDROID_MANAGEMENT_SERVICE_ACCOUNT_JSON"].filter((key) => !process.env[key]);
    if (missing.length) return { success: false, message: "Android signup URL setup required", setupRequired: missing, raw: { input } };

    try {
      const projectId = process.env.ANDROID_MANAGEMENT_PROJECT_ID!;
      const params = new URLSearchParams({
        projectId,
        callbackUrl: input.callbackUrl,
      });
      if (input.adminEmail) params.set("adminEmail", input.adminEmail);
      if (input.allowedDomains?.length) params.set("allowedDomains", input.allowedDomains.join(","));

      const result = await androidFetch<{ name?: string; url?: string }>(`/signupUrls?${params.toString()}`, {
        method: "POST",
        body: JSON.stringify({}),
      });

      return {
        success: true,
        signupUrlName: result.name,
        url: result.url,
        providerRef: result.name,
        message: "Android enterprise signup URL created. Open the URL as the organization admin, then return enterpriseToken to the callback.",
        raw: result,
      };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : "Android signup URL creation failed", raw: error };
    }
  }

  async createEnterprise(input: { enterpriseToken: string; signupUrlName: string; displayName: string }): Promise<AndroidEnterpriseResponse> {
    const missing = ["ANDROID_MANAGEMENT_PROJECT_ID", "ANDROID_MANAGEMENT_SERVICE_ACCOUNT_JSON"].filter((key) => !process.env[key]);
    if (missing.length) return { success: false, message: "Android enterprise creation setup required", raw: { missing, input } };

    try {
      const projectId = process.env.ANDROID_MANAGEMENT_PROJECT_ID!;
      const params = new URLSearchParams({
        projectId,
        enterpriseToken: input.enterpriseToken,
        signupUrlName: input.signupUrlName,
      });

      const result = await androidFetch<{ name?: string }>(`/enterprises?${params.toString()}`, {
        method: "POST",
        body: JSON.stringify({
          enterpriseDisplayName: input.displayName,
        }),
      });

      return {
        success: true,
        enterpriseName: result.name,
        providerRef: result.name,
        message: "Android enterprise created. Save this value as ANDROID_MANAGEMENT_ENTERPRISE_NAME.",
        raw: result,
      };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : "Android enterprise creation failed", raw: error };
    }
  }

  async createEnrollment(input: EnrollmentRequest): Promise<EnrollmentResponse> {
    const status = this.getSetupStatus();
    if (status.missing.length) {
      return {
        success: false,
        message: "Android Management API ยังไม่ถูกตั้งค่า env ครบ",
        setupRequired: status.missing,
        raw: { input, status },
      };
    }

    try {
      const enterpriseName = getAndroidEnterpriseName();
      const policyId = normalizePolicyId(input.policyId);
      const policyName = `${enterpriseName}/policies/${policyId}`;

      // สร้าง/อัปเดต policy ก่อน token เพื่อให้เครื่องที่ enroll แล้วได้ policy ทันที
      await this.publishPolicy({ organizationId: input.organizationId, policyId, payload: pickPolicyPayload(policyId, {}) });

      const body = {
        policyName,
        duration: process.env.ANDROID_ENROLLMENT_TOKEN_DURATION ?? "86400s",
        oneTimeOnly: process.env.ANDROID_ENROLLMENT_ONE_TIME_ONLY !== "false",
        additionalData: JSON.stringify({
          organizationId: input.organizationId,
          contractId: input.contractId,
          deviceId: input.deviceId,
          platform: input.platform,
          mode: input.mode,
        }),
      };

      const token = await androidFetch<EnrollmentTokenResponse>(`/${enterpriseName}/enrollmentTokens`, {
        method: "POST",
        body: JSON.stringify(body),
      });

      return {
        success: true,
        enrollmentId: token.name,
        token: token.value,
        qrCode: token.qrCode,
        expiresAt: token.expirationTimestamp,
        providerRef: token.name,
        message: "Android enrollment token created from Android Management API",
        raw: token,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Android enrollment failed",
        raw: error,
      };
    }
  }

  async publishPolicy(input: PolicyRequest): Promise<DeviceControlResult> {
    const status = this.getSetupStatus();
    if (status.missing.length) return { success: false, message: "Android provider setup required", raw: status };

    try {
      const enterpriseName = getAndroidEnterpriseName();
      const policyId = normalizePolicyId(input.policyId);
      const policyPayload = pickPolicyPayload(policyId, input.payload);
      const policyName = `${enterpriseName}/policies/${policyId}`;

      const result = await androidFetch<Record<string, unknown>>(`/${policyName}`, {
        method: "PATCH",
        body: JSON.stringify(policyPayload),
      });

      return {
        success: true,
        providerRef: policyName,
        message: "Android policy published with enterprises.policies.patch",
        raw: result,
      };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : "Android policy publish failed", raw: error };
    }
  }

  async syncDevice(input: { providerDeviceId?: string; serialNumber?: string; imei?: string }): Promise<DeviceControlResult> {
    const status = this.getSetupStatus();
    if (status.missing.length) return { success: false, message: "Android provider setup required", raw: status };
    if (!input.providerDeviceId) return { success: false, message: "providerDeviceId is required. ใช้ค่า enterprises/{enterpriseId}/devices/{deviceId} จาก Android webhook/list devices" };

    try {
      const result = await androidFetch<Record<string, unknown>>(`/${input.providerDeviceId}`, { method: "GET" });
      return { success: true, providerRef: input.providerDeviceId, message: "Android device synced", raw: result };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : "Android device sync failed", raw: error };
    }
  }

  async sendCommand(input: { deviceId: string; providerDeviceId?: string; commandType: string; payload?: unknown; reason: string }): Promise<DeviceControlResult> {
    const status = this.getSetupStatus();
    if (status.missing.length) return { success: false, message: "Android provider setup required", raw: status };
    if (!input.providerDeviceId) return { success: false, message: "providerDeviceId is required before sending Android command. Sync/bind the enrolled device first." };

    const commandType = input.commandType === "REQUEST_LIMITED_MODE" || input.commandType === "REQUEST_RESTRICT" ? "LOCK" : input.commandType;

    try {
      const operation = await androidFetch<AndroidOperation>(`/${input.providerDeviceId}:issueCommand`, {
        method: "POST",
        body: JSON.stringify({
          type: commandType,
          ...((input.payload && typeof input.payload === "object") ? input.payload : {}),
        }),
      });
      return {
        success: true,
        providerRef: operation.name,
        message: `Android command ${commandType} issued with enterprises.devices.issueCommand`,
        raw: operation,
      };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : "Android command failed", raw: error };
    }
  }

  async releaseDevice(input: { deviceId: string; providerDeviceId?: string; reason: string }): Promise<DeviceControlResult> {
    const status = this.getSetupStatus();
    if (status.missing.length) return { success: false, message: "Android provider setup required", raw: status };
    if (!input.providerDeviceId) return { success: false, message: "providerDeviceId is required before release. Sync/bind the enrolled device first." };

    try {
      const operation = await androidFetch<AndroidOperation>(`/${input.providerDeviceId}:issueCommand`, {
        method: "POST",
        body: JSON.stringify({ type: "RELINQUISH_OWNERSHIP" }),
      });
      return {
        success: true,
        providerRef: operation.name,
        message: "Android release command issued. Verify device state before ownership transfer.",
        raw: operation,
      };
    } catch (firstError) {
      // บาง enrollment mode ไม่รองรับ RELINQUISH_OWNERSHIP ให้คืน error ชัด ๆ ไม่แอบ wipe แทน
      return {
        success: false,
        message: firstError instanceof Error ? firstError.message : "Android release command failed",
        raw: firstError,
      };
    }
  }

  getRecommendedPolicies() {
    return {
      basic: leaseBasicAndroidPolicy,
      limited: leaseLimitedAndroidPolicy,
      release: leaseReleaseAndroidPolicy,
    };
  }
}

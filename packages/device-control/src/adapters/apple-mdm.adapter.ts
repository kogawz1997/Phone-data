import fs from "node:fs";
import http2 from "node:http2";
import type { DeviceControlResult } from "../types";
import { appleLeaseRestrictionProfile, appleReleaseProfile } from "../policies/apple-lease-profiles";
import { type EnrollmentRequest, type EnrollmentResponse, type LeaseMdmProvider, type PolicyRequest, setupRequired } from "./base";

const APPLE_REQUIRED_ENV = [
  "APPLE_MDM_BASE_URL",
  "APPLE_MDM_APNS_CERT_PATH",
  "APPLE_MDM_APNS_KEY_PATH",
  "APPLE_MDM_APNS_TOPIC",
  "APPLE_ABM_SERVER_TOKEN_PATH",
  "APPLE_MDM_PROFILE_SIGNING_CERT_PATH",
  "APPLE_MDM_PROFILE_SIGNING_KEY_PATH",
];

function fileExistsFromEnv(key: string) {
  const value = process.env[key];
  return Boolean(value && fs.existsSync(value));
}

function assertCertFiles() {
  const missingFiles = [
    "APPLE_MDM_APNS_CERT_PATH",
    "APPLE_MDM_APNS_KEY_PATH",
    "APPLE_ABM_SERVER_TOKEN_PATH",
    "APPLE_MDM_PROFILE_SIGNING_CERT_PATH",
    "APPLE_MDM_PROFILE_SIGNING_KEY_PATH",
  ].filter((key) => !fileExistsFromEnv(key));
  if (missingFiles.length) throw new Error(`Apple certificate/token files not found: ${missingFiles.join(", ")}`);
}

export function buildUnsignedMdmMobileConfig(input: {
  enrollmentId: string;
  displayName?: string;
  checkInUrl: string;
  serverUrl: string;
  topic: string;
}) {
  const uuid = input.enrollmentId;
  const payloadDisplayName = input.displayName || "KOGA Lease MDM";
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>PayloadContent</key>
  <array>
    <dict>
      <key>AccessRights</key><integer>8191</integer>
      <key>CheckInURL</key><string>${input.checkInUrl}</string>
      <key>CheckOutWhenRemoved</key><true/>
      <key>IdentityCertificateUUID</key><string>${uuid}-identity</string>
      <key>PayloadDescription</key><string>ลงทะเบียนเครื่องเข้า MDM สำหรับสัญญาเช่าใช้พร้อมสิทธิ์ซื้อขาด</string>
      <key>PayloadDisplayName</key><string>${payloadDisplayName}</string>
      <key>PayloadIdentifier</key><string>com.koga.lease.mdm.${uuid}</string>
      <key>PayloadType</key><string>com.apple.mdm</string>
      <key>PayloadUUID</key><string>${uuid}</string>
      <key>PayloadVersion</key><integer>1</integer>
      <key>ServerURL</key><string>${input.serverUrl}</string>
      <key>SignMessage</key><true/>
      <key>Topic</key><string>${input.topic}</string>
    </dict>
  </array>
  <key>PayloadDisplayName</key><string>${payloadDisplayName}</string>
  <key>PayloadIdentifier</key><string>com.koga.lease.profile.${uuid}</string>
  <key>PayloadOrganization</key><string>KOGA Lease MDM</string>
  <key>PayloadRemovalDisallowed</key><true/>
  <key>PayloadType</key><string>Configuration</string>
  <key>PayloadUUID</key><string>${uuid}-profile</string>
  <key>PayloadVersion</key><integer>1</integer>
</dict>
</plist>`;
}

async function sendApnsMdmPush(input: { pushMagic?: string; deviceToken?: string; commandUuid?: string }) {
  assertCertFiles();
  if (!input.deviceToken || !input.pushMagic) throw new Error("Apple deviceToken and pushMagic are required before APNs push");

  const cert = fs.readFileSync(process.env.APPLE_MDM_APNS_CERT_PATH!, "utf8");
  const key = fs.readFileSync(process.env.APPLE_MDM_APNS_KEY_PATH!, "utf8");
  const topic = process.env.APPLE_MDM_APNS_TOPIC!;
  const host = process.env.APPLE_MDM_APNS_HOST ?? "https://api.push.apple.com";

  return await new Promise<{ apnsId?: string; statusCode?: number }>((resolve, reject) => {
    const client = http2.connect(host, { cert, key });
    client.on("error", reject);
    const req = client.request({
      ":method": "POST",
      ":path": `/3/device/${input.deviceToken}`,
      "apns-topic": topic,
      "apns-push-type": "mdm",
      "apns-priority": "10",
    });
    let data = "";
    req.setEncoding("utf8");
    req.on("response", (headers) => {
      const statusCode = Number(headers[":status"] ?? 0);
      const apnsId = String(headers["apns-id"] ?? "");
      req.on("end", () => {
        client.close();
        if (statusCode >= 200 && statusCode < 300) resolve({ apnsId, statusCode });
        else reject(new Error(`APNs MDM push failed ${statusCode}: ${data}`));
      });
    });
    req.on("data", (chunk) => { data += chunk; });
    req.on("error", (err) => {
      client.close();
      reject(err);
    });
    req.end(JSON.stringify({ mdm: input.pushMagic }));
  });
}

export class AppleMdmAdapter implements LeaseMdmProvider {
  providerName = "APPLE_MDM_ADE";

  getSetupStatus() {
    const base = setupRequired(this.providerName, APPLE_REQUIRED_ENV, [
      "docs/providers/apple-business-manager-setup-th.md",
      "docs/providers/apple-mdm-certificate-apns-th.md",
      "docs/providers/apple-ade-server-token-th.md",
      "docs/providers/apple-mdm-server-protocol-th.md",
    ]);
    const missingFiles = [
      "APPLE_MDM_APNS_CERT_PATH",
      "APPLE_MDM_APNS_KEY_PATH",
      "APPLE_ABM_SERVER_TOKEN_PATH",
      "APPLE_MDM_PROFILE_SIGNING_CERT_PATH",
      "APPLE_MDM_PROFILE_SIGNING_KEY_PATH",
    ].filter((key) => process.env[key] && !fileExistsFromEnv(key));
    return missingFiles.length ? { ...base, status: "ERROR" as const, missing: [...base.missing, ...missingFiles] } : base;
  }

  async createEnrollment(input: EnrollmentRequest): Promise<EnrollmentResponse> {
    const status = this.getSetupStatus();
    if (status.missing.length) {
      return {
        success: false,
        message: "Apple MDM/ADE ยังไม่ถูกตั้งค่า env/cert ครบ",
        setupRequired: status.missing,
        raw: { input, status },
      };
    }

    const enrollmentId = `apple-${input.organizationId}-${input.deviceId ?? Date.now()}`.replace(/[^a-zA-Z0-9-]/g, "-");
    const baseUrl = process.env.APPLE_MDM_BASE_URL!.replace(/\/$/, "");
    const mobileconfig = buildUnsignedMdmMobileConfig({
      enrollmentId,
      displayName: input.displayName,
      checkInUrl: `${baseUrl}/mdm/apple/checkin`,
      serverUrl: `${baseUrl}/mdm/apple/connect`,
      topic: process.env.APPLE_MDM_APNS_TOPIC!,
    });

    return {
      success: true,
      enrollmentId,
      enrollmentUrl: `${baseUrl}/mdm/apple/enroll/${enrollmentId}.mobileconfig`,
      message: "Apple MDM enrollment profile generated. Sign the mobileconfig before production ADE rollout.",
      raw: { mobileconfigPreview: mobileconfig.slice(0, 500) },
    };
  }

  async publishPolicy(input: PolicyRequest): Promise<DeviceControlResult> {
    const status = this.getSetupStatus();
    if (status.missing.length) return { success: false, message: "Apple provider setup required", raw: status };
    const payload = input.payload && typeof input.payload === "object" && Object.keys(input.payload as Record<string, unknown>).length
      ? input.payload
      : (input.policyId.includes("release") ? appleReleaseProfile : appleLeaseRestrictionProfile);
    return {
      success: true,
      providerRef: `apple-profile-${input.policyId}`,
      message: "Apple configuration profile prepared. Queue InstallProfile via APNs/MDM connect for enrolled devices.",
      raw: payload,
    };
  }

  async syncDevice(input: { providerDeviceId?: string; serialNumber?: string; imei?: string }): Promise<DeviceControlResult> {
    const status = this.getSetupStatus();
    if (status.missing.length) return { success: false, message: "Apple provider setup required", raw: status };
    return { success: true, providerRef: input.providerDeviceId ?? input.serialNumber, message: "Apple ABM/ADE sync hook ready. Upload ABM server token and implement device list sync per Apple Business docs." };
  }

  async sendCommand(input: { deviceId: string; providerDeviceId?: string; commandType: string; payload?: unknown; reason: string }): Promise<DeviceControlResult> {
    const status = this.getSetupStatus();
    if (status.missing.length) return { success: false, message: "Apple provider setup required", raw: status };

    const payload = (input.payload ?? {}) as { deviceToken?: string; pushMagic?: string; commandUuid?: string };
    try {
      const apns = await sendApnsMdmPush(payload);
      return {
        success: true,
        providerRef: apns.apnsId,
        message: `APNs MDM push sent. Device should call /mdm/apple/connect to fetch ${input.commandType}.`,
        raw: { apns, commandType: input.commandType, reason: input.reason },
      };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : "Apple APNs command failed", raw: error };
    }
  }

  async releaseDevice(input: { deviceId: string; providerDeviceId?: string; reason: string }): Promise<DeviceControlResult> {
    const status = this.getSetupStatus();
    if (status.missing.length) return { success: false, message: "Apple provider setup required", raw: status };
    return {
      success: true,
      providerRef: `apple-release-${Date.now()}`,
      message: "Apple release queued. In production, remove/release MDM profile and release the device from ABM after ownership transfer approval.",
      raw: input,
    };
  }

  getRecommendedProfiles() {
    return {
      restriction: appleLeaseRestrictionProfile,
      release: appleReleaseProfile,
    };
  }
}

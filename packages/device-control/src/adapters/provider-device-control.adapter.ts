import type { DeviceControlAdapter, DeviceControlResult, ManagedDeviceContext } from "../types";
import { AndroidManagementAdapter } from "./android-management.adapter";
import { AppleMdmAdapter } from "./apple-mdm.adapter";
function isApple(platform?: string) {
  return ["IOS", "IPADOS", "MACOS"].includes(String(platform ?? "").toUpperCase());
}

function isAndroid(platform?: string) {
  return String(platform ?? "").toUpperCase() === "ANDROID";
}

function getConfiguredProvider() {
  const value = (process.env.DEVICE_CONTROL_PROVIDER ?? "local").toLowerCase();
  if (["android", "android_management", "android-management"].includes(value)) return "android";
  if (["apple", "ios", "apple_mdm", "apple-mdm"].includes(value)) return "apple";
  if (["dual", "both", "android_apple"].includes(value)) return "dual";
  return "local";
}

export class ProviderDeviceControlAdapter implements DeviceControlAdapter {
  private android = new AndroidManagementAdapter();
  private apple = new AppleMdmAdapter();

  private pick(context: ManagedDeviceContext) {
    const configured = getConfiguredProvider();
    if (configured === "android") return this.android;
    if (configured === "apple") return this.apple;
    if (configured === "dual") {
      if (isAndroid(context.platform)) return this.android;
      if (isApple(context.platform)) return this.apple;
      throw new Error(`Unsupported platform for dual provider: ${context.platform ?? "unknown"}`);
    }
    throw new Error("DEVICE_CONTROL_PROVIDER is local/mock. Set it to android, apple, or dual before sending real MDM commands.");
  }

  async enrollDevice(input: ManagedDeviceContext & { imei?: string | null; serialNumber?: string | null; customerId?: string }): Promise<DeviceControlResult> {
    const provider = this.pick(input);
    const result = await provider.createEnrollment({
      organizationId: input.organizationId ?? "unknown",
      deviceId: input.deviceId,
      contractId: input.contractId,
      platform: isApple(input.platform) ? "IOS" : "ANDROID",
      mode: isApple(input.platform) ? "APPLE_ADE" : "ANDROID_FULLY_MANAGED",
      policyId: isApple(input.platform) ? "lease-basic-ios" : "lease-basic",
      displayName: input.displayName,
    });
    return result;
  }

  async sendReminder(input: ManagedDeviceContext & { message: string }): Promise<DeviceControlResult> {
    return {
      success: true,
      providerRef: `local-reminder-${Date.now()}`,
      message: `Reminder recorded locally. Notification provider handles delivery: ${input.message}`,
    };
  }

  async requestLimitedMode(input: ManagedDeviceContext & { reason: string }): Promise<DeviceControlResult> {
    const provider = this.pick(input);
    if (isAndroid(input.platform)) {
      return provider.sendCommand({
        deviceId: input.deviceId,
        providerDeviceId: input.providerDeviceId,
        commandType: "LOCK",
        payload: input.payload,
        reason: input.reason,
      });
    }
    return provider.sendCommand({
      deviceId: input.deviceId,
      providerDeviceId: input.providerDeviceId,
      commandType: "DeviceLock",
      payload: input.payload,
      reason: input.reason,
    });
  }

  async requestRestriction(input: ManagedDeviceContext & { reason: string }): Promise<DeviceControlResult> {
    return this.requestLimitedMode(input);
  }

  async releaseDevice(input: ManagedDeviceContext & { reason: string }): Promise<DeviceControlResult> {
    const provider = this.pick(input);
    return provider.releaseDevice({
      deviceId: input.deviceId,
      providerDeviceId: input.providerDeviceId,
      reason: input.reason,
    });
  }

  async confirmOwnershipTransfer(input: ManagedDeviceContext & { reason: string }): Promise<DeviceControlResult> {
    return {
      success: true,
      providerRef: `ownership-transfer-${Date.now()}`,
      message: `Ownership transfer recorded after provider release: ${input.reason}`,
    };
  }
}

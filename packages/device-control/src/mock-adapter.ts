import type { DeviceControlAdapter, DeviceControlResult } from "./types";

function ref(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export class MockDeviceControlAdapter implements DeviceControlAdapter {
  async enrollDevice(): Promise<DeviceControlResult> {
    return {
      success: true,
      providerRef: ref("mock_enroll"),
      message: "Mock lease-to-own enrollment completed. No real device control was performed.",
    };
  }

  async sendReminder(input: { deviceId: string; message: string }): Promise<DeviceControlResult> {
    return {
      success: true,
      providerRef: ref("mock_reminder"),
      message: `Mock reminder for leased device ${input.deviceId}: ${input.message}`,
    };
  }

  async requestLimitedMode(input: { deviceId: string; reason: string }): Promise<DeviceControlResult> {
    return {
      success: true,
      providerRef: ref("mock_limited_mode"),
      message: `Mock limited-mode request accepted for leased device ${input.deviceId}. Real limitation requires approved Android Enterprise/Apple MDM/provider integration. Reason: ${input.reason}`,
    };
  }

  async requestRestriction(input: { deviceId: string; reason: string }): Promise<DeviceControlResult> {
    return this.requestLimitedMode(input);
  }

  async releaseDevice(input: { deviceId: string; reason: string }): Promise<DeviceControlResult> {
    return {
      success: true,
      providerRef: ref("mock_release"),
      message: `Mock MDM release completed for ${input.deviceId}. Reason: ${input.reason}`,
    };
  }

  async confirmOwnershipTransfer(input: { deviceId: string; reason: string }): Promise<DeviceControlResult> {
    return {
      success: true,
      providerRef: ref("mock_title_transfer"),
      message: `Mock ownership transfer recorded for ${input.deviceId}. Reason: ${input.reason}`,
    };
  }
}

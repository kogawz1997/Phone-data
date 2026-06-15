export type DeviceControlAction =
  | "SEND_REMINDER"
  | "REQUEST_LIMITED_MODE"
  | "REQUEST_RESTRICT"
  | "REQUEST_RELEASE"
  | "CONFIRM_OWNERSHIP_TRANSFER"
  | "MARK_RECOVERY";

export type DeviceControlResult = {
  success: boolean;
  providerRef?: string;
  message?: string;
  raw?: unknown;
};

export type ManagedDeviceContext = {
  organizationId?: string;
  contractId?: string;
  deviceId: string;
  platform?: "ANDROID" | "IOS" | "IPADOS" | "MACOS" | "OTHER" | string;
  providerDeviceId?: string | null;
  displayName?: string;
  payload?: unknown;
};

export interface DeviceControlAdapter {
  enrollDevice(input: ManagedDeviceContext & { imei?: string | null; serialNumber?: string | null; customerId?: string }): Promise<DeviceControlResult>;
  sendReminder(input: ManagedDeviceContext & { message: string }): Promise<DeviceControlResult>;
  requestLimitedMode(input: ManagedDeviceContext & { reason: string }): Promise<DeviceControlResult>;
  requestRestriction(input: ManagedDeviceContext & { reason: string }): Promise<DeviceControlResult>;
  releaseDevice(input: ManagedDeviceContext & { reason: string }): Promise<DeviceControlResult>;
  confirmOwnershipTransfer(input: ManagedDeviceContext & { reason: string }): Promise<DeviceControlResult>;
}

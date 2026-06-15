import { AndroidManagementAdapter } from "./android-management.adapter";
import { AppleMdmAdapter } from "./apple-mdm.adapter";
import { MockDeviceControlAdapter } from "../mock-adapter";
import { ProviderDeviceControlAdapter } from "./provider-device-control.adapter";

export type DeviceControlProviderName = "mock" | "android" | "apple" | "dual";

export function getProviderName(): DeviceControlProviderName {
  const value = (process.env.DEVICE_CONTROL_PROVIDER ?? "mock").toLowerCase();
  if (["android", "android_management", "android-management"].includes(value)) return "android";
  if (["apple", "ios", "apple_mdm", "apple-mdm"].includes(value)) return "apple";
  if (["dual", "both", "android_apple"].includes(value)) return "dual";
  return "mock";
}

export function createAndroidProvider() {
  return new AndroidManagementAdapter();
}

export function createAppleProvider() {
  return new AppleMdmAdapter();
}

export function createDeviceControlAdapter() {
  const provider = getProviderName();
  if (provider === "mock") return new MockDeviceControlAdapter();
  return new ProviderDeviceControlAdapter();
}

export function getDualProviderStatus() {
  return {
    selected: getProviderName(),
    android: createAndroidProvider().getSetupStatus(),
    apple: createAppleProvider().getSetupStatus(),
  };
}

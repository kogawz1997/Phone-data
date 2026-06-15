export function assertSafeDeviceAction(input: {
  actionType: string;
  hasConsent: boolean;
  hasContract: boolean;
  isPaidOff?: boolean;
  legalTitleStatus?: string;
}) {
  if (!input.hasConsent) {
    throw new Error("Device action blocked: missing lease-to-own device-management consent");
  }

  if (!input.hasContract) {
    throw new Error("Device action blocked: missing lease-to-own contract context");
  }

  if (["REQUEST_LIMITED_MODE", "REQUEST_RESTRICT"].includes(input.actionType) && input.isPaidOff) {
    throw new Error("Device action blocked: paid-off contract cannot be restricted");
  }

  if (["REQUEST_LIMITED_MODE", "REQUEST_RESTRICT"].includes(input.actionType) && input.legalTitleStatus === "TRANSFERRED") {
    throw new Error("Device action blocked: ownership already transferred");
  }

  if (["REQUEST_RELEASE", "CONFIRM_OWNERSHIP_TRANSFER"].includes(input.actionType) && !input.isPaidOff) {
    throw new Error("Release/ownership transfer blocked: contract is not paid off yet");
  }

  return true;
}

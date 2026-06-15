export const leaseBasicAndroidPolicy = {
  name: "lease-basic",
  description: "นโยบายปกติสำหรับเครื่อง lease-to-own ที่ร้านยังถือกรรมสิทธิ์",
  payload: {
    passwordRequirements: {
      passwordQuality: "NUMERIC",
      passwordMinimumLength: 6,
    },
    installUnknownSourcesAllowed: false,
    safeBootDisabled: true,
    factoryResetDisabled: true,
    statusBarDisabled: false,
    cameraDisabled: false,
    applications: [
      {
        packageName: "com.koga.customer",
        installType: "FORCE_INSTALLED",
        defaultPermissionPolicy: "GRANT",
      },
    ],
  },
};

export const leaseLimitedAndroidPolicy = {
  name: "lease-limited",
  description: "โหมดจำกัดแบบต้องผ่าน approval และแจ้งลูกค้าก่อน",
  payload: {
    passwordRequirements: {
      passwordQuality: "NUMERIC",
      passwordMinimumLength: 6,
    },
    installUnknownSourcesAllowed: false,
    safeBootDisabled: true,
    factoryResetDisabled: true,
    statusBarDisabled: false,
    cameraDisabled: false,
    applications: [
      {
        packageName: "com.koga.customer",
        installType: "FORCE_INSTALLED",
        defaultPermissionPolicy: "GRANT",
      },
    ],
  },
};

export const leaseReleaseAndroidPolicy = {
  name: "lease-release",
  description: "นโยบายปลดข้อจำกัดก่อน retire/release เมื่อจ่ายครบ",
  payload: {
    installUnknownSourcesAllowed: true,
    factoryResetDisabled: false,
    safeBootDisabled: false,
  },
};

export const appleLeaseRestrictionProfile = {
  identifier: "com.koga.mdm.lease.restrictions",
  displayName: "KOGA Lease-to-own Restrictions",
  description: "แนว profile สำหรับเครื่อง iOS/iPadOS supervised/ADE ของร้าน",
  payloads: [
    {
      PayloadType: "com.apple.applicationaccess",
      PayloadIdentifier: "com.koga.mdm.lease.applicationaccess",
      PayloadDisplayName: "Lease Device Restrictions",
      allowCamera: true,
      allowAppInstallation: true,
      allowUIConfigurationProfileInstallation: false,
      forceEncryptedBackup: true,
    },
    {
      PayloadType: "com.apple.mobiledevice.passwordpolicy",
      PayloadIdentifier: "com.koga.mdm.lease.passcode",
      PayloadDisplayName: "Passcode Policy",
      minLength: 6,
      maxFailedAttempts: 10,
      requireAlphanumeric: false,
    },
  ],
};

export const appleReleaseProfile = {
  identifier: "com.koga.mdm.lease.release",
  displayName: "KOGA Lease Release Profile",
  description: "ใช้เป็นข้อมูลกำกับ flow ปลด profile/ยืนยันโอนกรรมสิทธิ์ ไม่ใช่ profile จริงที่ทำทุกอย่างได้เอง",
  payloads: [],
};

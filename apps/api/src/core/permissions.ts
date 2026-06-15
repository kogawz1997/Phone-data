import type { SessionUser } from "@repo/auth";

export type PermissionKey =
  | "platform:*"
  | "store:*"
  | "store:read_all"
  | "billing:manage"
  | "mdm:platform_manage"
  | "audit:read_all"
  | "users:manage"
  | "customers:manage"
  | "customers:read"
  | "contracts:manage"
  | "contracts:read"
  | "payments:manage"
  | "payments:review"
  | "payments:create"
  | "payments:read"
  | "devices:manage"
  | "collection:manage"
  | "collection:read"
  | "disputes:manage"
  | "reports:read"
  | "integrations:manage"
  | "mdm:request"
  | "portal:own_data";

export const PERMISSIONS_BY_ROLE: Record<string, PermissionKey[]> = {
  PLATFORM_OWNER: ["platform:*", "store:read_all", "billing:manage", "mdm:platform_manage", "audit:read_all"],
  OWNER: ["store:*", "users:manage", "contracts:manage", "payments:manage", "devices:manage", "mdm:request", "integrations:manage"],
  ADMIN: ["customers:manage", "contracts:manage", "payments:manage", "devices:manage", "collection:manage", "reports:read"],
  MANAGER: ["customers:manage", "contracts:manage", "payments:review", "collection:manage", "reports:read"],
  STAFF: ["customers:read", "contracts:read", "payments:create", "collection:read"],
  COLLECTION: ["customers:read", "collection:manage", "disputes:manage", "payments:read"],
  CUSTOMER: ["portal:own_data"],
};

export function getPermissionsForRole(role: string): PermissionKey[] {
  return PERMISSIONS_BY_ROLE[role] ?? [];
}

export function hasPermission(user: Pick<SessionUser, "role">, permission: PermissionKey): boolean {
  const permissions = getPermissionsForRole(user.role);
  return permissions.includes(permission) || permissions.includes("platform:*") || permissions.includes("store:*");
}

export function assertPermission(user: Pick<SessionUser, "role">, permission: PermissionKey) {
  if (!hasPermission(user, permission)) {
    throw new Error(`Permission denied: ${permission}`);
  }
}

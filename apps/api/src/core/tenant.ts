import type { SessionUser } from "@repo/auth";

export type TenantOwned = {
  organizationId?: string | null;
};

export function canAccessOrganization(user: SessionUser, organizationId?: string | null) {
  if (user.role === "PLATFORM_OWNER") return true;
  return Boolean(organizationId && user.organizationId === organizationId);
}

export function assertTenantAccess(user: SessionUser, resource: TenantOwned, resourceName = "resource") {
  if (!canAccessOrganization(user, resource.organizationId)) {
    throw new Error(`Forbidden: ${resourceName} belongs to another store`);
  }
}

export function scopedWhere<T extends object>(user: SessionUser, extra?: T): T & { organizationId?: string } {
  if (user.role === "PLATFORM_OWNER") return { ...(extra ?? {}) } as T & { organizationId?: string };
  return { ...(extra ?? {}), organizationId: user.organizationId } as T & { organizationId: string };
}

export function storeScopedWhere<T extends object>(user: SessionUser, extra?: T): T & { organizationId: string } {
  if (!user.organizationId) throw new Error("Missing organizationId in session");
  return { ...(extra ?? {}), organizationId: user.organizationId } as T & { organizationId: string };
}

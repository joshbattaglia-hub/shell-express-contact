import { useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import type { Tenant } from "../lib/api";

export function useTenant(): Tenant {
  const { tenant } = useParams();
  const [params] = useSearchParams();
  return useMemo(() => {
    const q = params.get("t");
    if (q === "ca" || q === "coco") return q;
    if (tenant === "ca" || tenant === "coco") return tenant;
    return "ca";
  }, [params, tenant]);
}

export function tenantPath(tenant: Tenant, path = ""): string {
  const p = path.startsWith("/") ? path : path ? `/${path}` : "";
  return `/${tenant}${p}`;
}

export function adminPath(tenant: Tenant, path = ""): string {
  const p = path.startsWith("/") ? path.slice(1) : path;
  const base = p ? `/admin/app/${p}` : "/admin/app";
  return `${base}?t=${tenant}`;
}

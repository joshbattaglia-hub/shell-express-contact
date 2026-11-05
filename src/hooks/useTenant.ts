import { useParams } from "react-router-dom";
import type { Tenant } from "../lib/api";

export function useTenant(): Tenant {
  const { tenant } = useParams();
  if (tenant === "ca" || tenant === "coco") return tenant;
  return "ca";
}

export function tenantPath(tenant: Tenant, path = ""): string {
  const p = path.startsWith("/") ? path : path ? `/${path}` : "";
  return `/${tenant}${p}`;
}

export async function api<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`/api/${path}`, {
    credentials: "include",
    ...options,
    headers: {
      ...(options.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...options.headers,
    },
  });
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("text/csv")) {
    const text = await res.text();
    if (!res.ok) throw new Error(res.statusText);
    return text as unknown as T;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || res.statusText);
  }
  return data as T;
}

export type PublicSite = { id: string; name: string; address?: string };
export type FieldDef = {
  id: string;
  label: string;
  type: string;
  required: boolean;
  options?: string[];
  accept?: string | null;
  maxBytes?: number | null;
  help?: string | null;
  order?: number;
};
export type SiteRecord = {
  id: string;
  name: string;
  address: string;
  managerName: string;
  managerEmail: string;
  active: boolean;
};
export type Enquiry = {
  id: string;
  reference: string;
  siteId: string;
  siteName: string;
  status: "new" | "in_progress" | "closed";
  values: Record<string, string>;
  attachment?: { filename: string; contentType: string; byteSize: number } | null;
  createdAt: string;
  updatedAt: string;
  emailResult?: {
    ok?: boolean;
    pending?: boolean;
    reason?: string;
    provider?: string;
  } | null;
  adminNote?: string;
};

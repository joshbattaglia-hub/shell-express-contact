export type Tenant = "ca" | "coco";

export async function api<T = unknown>(
  tenant: Tenant,
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`/api/${tenant}/${path}`, {
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
  managerEmails?: string[];
  manager?: string;
  manager_name?: string;
  active: boolean;
};
export type Enquiry = {
  id: string;
  reference: string;
  siteId: string | null;
  siteName: string | null;
  status: "new" | "in_progress" | "closed";
  kind?: string;
  values: Record<string, string>;
  path?: string[];
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

export type SurveyQuestion = {
  id: string;
  label: string;
  type: "yesno" | "single" | string;
  required?: boolean;
  options?: string[];
};
export type SurveyStep = {
  id: string;
  title?: string;
  kind?: "message" | string;
  message?: string;
  questions?: SurveyQuestion[];
  showIf?: { questionId: string; equals: string };
  next?: {
    type: string;
    goto?: string;
    default?: string;
    rules?: { when: { questionId: string; equals: string }; goto: string }[];
  };
};
export type SurveyConfig = {
  title: string;
  sitePickerEnabled: boolean;
  phoneNumber: string;
  contactEmail: string;
  steps: SurveyStep[];
};

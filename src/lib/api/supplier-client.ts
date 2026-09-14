import type {
  SupplierRole,
  SupplierStatus,
  SupplierUnitBusinessType,
  SupplierUnitForm,
  SupplierUnitStatus,
} from "@/server/suppliers/constants";

export type SupplierRecord = {
  id: string;
  name: string;
  type: string | null;
  roles: SupplierRole[];
  contactName: string | null;
  phone: string | null;
  address: string | null;
  country: string | null;
  city: string | null;
  email: string | null;
  socialContact: string | null;
  specialties: string | null;
  defaultLeadTime: string | null;
  defaultMoq: string | null;
  paymentTerms: string | null;
  cooperationComment: string | null;
  riskNote: string | null;
  remarks: string | null;
  status: SupplierStatus;
  createdAt: string;
  updatedAt: string;
  _count: { productionUnits: number };
};

export type SupplierUnitRecord = {
  id: string;
  supplierId: string;
  name: string;
  unitForm: SupplierUnitForm;
  businessTypes: SupplierUnitBusinessType[];
  status: SupplierUnitStatus;
  primaryBusiness: string | null;
  primaryProducts: string | null;
  materialScope: string | null;
  processCapabilities: string | null;
  restrictions: string | null;
  defaultMoq: string | null;
  regularLeadTime: string | null;
  peakLeadTime: string | null;
  supportsSampling: boolean;
  managerName: string | null;
  phone: string | null;
  socialContact: string | null;
  qualityFeatures: string | null;
  riskNote: string | null;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
  supplier: { id: string; name: string; status: string };
};

export type SupplierPayload = {
  name: string;
  roles: SupplierRole[];
  status: SupplierStatus;
  country?: string | null;
  city?: string | null;
  address?: string | null;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  socialContact?: string | null;
  specialties?: string | null;
  defaultLeadTime?: string | null;
  defaultMoq?: string | null;
  paymentTerms?: string | null;
  cooperationComment?: string | null;
  riskNote?: string | null;
  remarks?: string | null;
};

export type SupplierUnitPayload = {
  name: string;
  unitForm: SupplierUnitForm;
  businessTypes: SupplierUnitBusinessType[];
  status: SupplierUnitStatus;
  primaryBusiness?: string | null;
  primaryProducts?: string | null;
  materialScope?: string | null;
  processCapabilities?: string | null;
  restrictions?: string | null;
  defaultMoq?: string | null;
  regularLeadTime?: string | null;
  peakLeadTime?: string | null;
  supportsSampling: boolean;
  managerName?: string | null;
  phone?: string | null;
  socialContact?: string | null;
  qualityFeatures?: string | null;
  riskNote?: string | null;
  remarks?: string | null;
};

export class SupplierApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "SupplierApiError";
  }
}

async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const body = (await response.json().catch(() => ({}))) as { error?: string; details?: unknown } & T;

  if (!response.ok) {
    throw new SupplierApiError(response.status, body.error ?? "请求失败，请稍后重试", body.details);
  }

  return body;
}

function jsonRequest(method: "POST" | "PATCH", body: unknown): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

export function getSupplierFieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof SupplierApiError)) return {};
  const details = error.details as
    | { properties?: Record<string, { errors?: string[] }> }
    | undefined;
  const properties = details?.properties ?? {};

  return Object.fromEntries(
    Object.entries(properties)
      .filter((entry): entry is [string, { errors: string[] }] => Boolean(entry[1].errors?.[0]))
      .map(([field, value]) => [field, value.errors[0]]),
  );
}

export async function fetchSuppliers(
  filters: { q?: string; role?: SupplierRole | "all"; status?: SupplierStatus | "all"; limit?: number } = {},
  signal?: AbortSignal,
) {
  const params = new URLSearchParams();
  if (filters.q?.trim()) params.set("q", filters.q.trim());
  if (filters.role && filters.role !== "all") params.set("role", filters.role);
  if (filters.status) params.set("status", filters.status);
  params.set("limit", String(filters.limit ?? 50));
  const data = await requestJson<{ suppliers: SupplierRecord[] }>(`/api/suppliers?${params}`, { signal });
  return data.suppliers;
}

export async function fetchSupplier(id: string, signal?: AbortSignal) {
  return (await requestJson<{ supplier: SupplierRecord }>(`/api/suppliers/${id}`, { signal })).supplier;
}

export async function createSupplier(payload: SupplierPayload) {
  return (await requestJson<{ supplier: SupplierRecord }>("/api/suppliers", jsonRequest("POST", payload))).supplier;
}

export async function patchSupplier(id: string, payload: Partial<SupplierPayload>) {
  return (
    await requestJson<{ supplier: SupplierRecord }>(`/api/suppliers/${id}`, jsonRequest("PATCH", payload))
  ).supplier;
}

export async function fetchSupplierUnits(
  supplierId: string,
  filters: {
    q?: string;
    unitForm?: SupplierUnitForm | "all";
    businessType?: SupplierUnitBusinessType | "all";
    status?: SupplierUnitStatus | "all";
    limit?: number;
  } = {},
  signal?: AbortSignal,
) {
  const params = new URLSearchParams();
  if (filters.q?.trim()) params.set("q", filters.q.trim());
  if (filters.unitForm && filters.unitForm !== "all") params.set("unitForm", filters.unitForm);
  if (filters.businessType && filters.businessType !== "all") params.set("businessType", filters.businessType);
  if (filters.status && filters.status !== "all") params.set("status", filters.status);
  params.set("limit", String(filters.limit ?? 50));
  const data = await requestJson<{ units: SupplierUnitRecord[] }>(
    `/api/suppliers/${supplierId}/units?${params}`,
    { signal },
  );
  return Array.isArray(data.units) ? data.units : [];
}

export async function fetchSupplierUnit(id: string, signal?: AbortSignal) {
  return (await requestJson<{ unit: SupplierUnitRecord }>(`/api/supplier-units/${id}`, { signal })).unit;
}

export async function createSupplierUnit(supplierId: string, payload: SupplierUnitPayload) {
  return (
    await requestJson<{ unit: SupplierUnitRecord }>(
      `/api/suppliers/${supplierId}/units`,
      jsonRequest("POST", payload),
    )
  ).unit;
}

export async function patchSupplierUnit(id: string, payload: Partial<SupplierUnitPayload>) {
  return (
    await requestJson<{ unit: SupplierUnitRecord }>(`/api/supplier-units/${id}`, jsonRequest("PATCH", payload))
  ).unit;
}

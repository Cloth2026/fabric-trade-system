import type { CustomerContactStatus, CustomerLevel, CustomerStatus, CustomerType } from "@/server/customers/constants";

export type CustomerRecord = {
  id: string;
  name: string;
  type: CustomerType | null;
  level: CustomerLevel | null;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  socialContact: string | null;
  country: string | null;
  city: string | null;
  address: string | null;
  mainProducts: string | null;
  cooperationBrands: string | null;
  paymentTerms: string | null;
  defaultCurrency: string | null;
  remarks: string | null;
  status: CustomerStatus;
  createdAt: string;
  updatedAt: string;
  _count: { contacts: number };
};

export type CustomerContactRecord = {
  id: string;
  customerId: string;
  name: string;
  title: string | null;
  department: string | null;
  phone: string | null;
  email: string | null;
  socialContact: string | null;
  isPrimary: boolean;
  status: CustomerContactStatus;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
  customer: { id: string; name: string; status: string };
};

export type CustomerDetailRecord = Omit<CustomerRecord, "_count"> & {
  contacts: CustomerContactRecord[];
};

export type CustomerPayload = {
  name: string;
  type?: CustomerType | null;
  level?: CustomerLevel | null;
  status?: CustomerStatus;
  country?: string | null;
  city?: string | null;
  address?: string | null;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  socialContact?: string | null;
  mainProducts?: string | null;
  cooperationBrands?: string | null;
  paymentTerms?: string | null;
  defaultCurrency?: string | null;
  remarks?: string | null;
};

export type CustomerContactPayload = {
  name: string;
  title?: string | null;
  department?: string | null;
  phone?: string | null;
  email?: string | null;
  socialContact?: string | null;
  isPrimary?: boolean;
  status?: CustomerContactStatus;
  remarks?: string | null;
};

export class CustomerApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "CustomerApiError";
  }
}

async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const body = (await response.json().catch(() => ({}))) as { error?: string; details?: unknown } & T;

  if (!response.ok) {
    throw new CustomerApiError(response.status, body.error ?? "请求失败，请稍后重试", body.details);
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

export function getCustomerFieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof CustomerApiError)) return {};
  const details = error.details as { properties?: Record<string, { errors?: string[] }> } | undefined;
  const properties = details?.properties ?? {};

  return Object.fromEntries(
    Object.entries(properties)
      .filter((entry): entry is [string, { errors: string[] }] => Boolean(entry[1].errors?.[0]))
      .map(([field, value]) => [field, value.errors[0]]),
  );
}

export function getCustomerErrorMessage(error: unknown, fallback: string) {
  if (error instanceof CustomerApiError) {
    if (error.status === 404) return "客户不存在或无权访问";
    if (error.status === 409) return "客户名称已存在，请更换后重试";
    if (error.status === 400) return "请检查填写内容，修正标记字段后再保存";
  }
  return fallback;
}

function buildCustomerQuery(filters: {
  q?: string;
  type?: CustomerType | "all";
  level?: CustomerLevel | "all";
  status?: CustomerStatus | "all";
  limit?: number;
}) {
  const params = new URLSearchParams();
  if (filters.q?.trim()) params.set("q", filters.q.trim());
  if (filters.type && filters.type !== "all") params.set("type", filters.type);
  if (filters.level && filters.level !== "all") params.set("level", filters.level);
  if (filters.status) params.set("status", filters.status);
  params.set("limit", String(filters.limit ?? 50));
  return params;
}

export async function fetchCustomers(
  filters: {
    q?: string;
    type?: CustomerType | "all";
    level?: CustomerLevel | "all";
    status?: CustomerStatus | "all";
    limit?: number;
  } = {},
  signal?: AbortSignal,
) {
  const result = await requestJson<{ customers: CustomerRecord[] }>(`/api/customers?${buildCustomerQuery(filters)}`, {
    signal,
    cache: "no-store",
  });
  return result.customers;
}

export async function createCustomer(payload: CustomerPayload) {
  const result = await requestJson<{ customer: CustomerRecord }>("/api/customers", jsonRequest("POST", payload));
  return result.customer;
}

export async function fetchCustomer(id: string, signal?: AbortSignal) {
  const result = await requestJson<{ customer: CustomerDetailRecord }>(`/api/customers/${encodeURIComponent(id)}`, {
    signal,
    cache: "no-store",
  });
  return result.customer;
}

// PATCH is a partial update: every field including `name` stays optional.
export type CustomerUpdatePayload = Partial<CustomerPayload>;
export type CustomerContactUpdatePayload = Partial<CustomerContactPayload>;

export async function patchCustomer(id: string, payload: CustomerUpdatePayload) {
  const result = await requestJson<{ customer: CustomerDetailRecord }>(
    `/api/customers/${encodeURIComponent(id)}`,
    jsonRequest("PATCH", payload),
  );
  return result.customer;
}

export async function fetchCustomerContacts(
  customerId: string,
  filters: { q?: string; status?: CustomerContactStatus | "all"; limit?: number } = {},
  signal?: AbortSignal,
) {
  const params = new URLSearchParams();
  if (filters.q?.trim()) params.set("q", filters.q.trim());
  if (filters.status && filters.status !== "all") params.set("status", filters.status);
  params.set("limit", String(filters.limit ?? 50));
  const result = await requestJson<{ contacts: CustomerContactRecord[] }>(
    `/api/customers/${encodeURIComponent(customerId)}/contacts?${params}`,
    { signal, cache: "no-store" },
  );
  return result.contacts;
}

export async function createCustomerContact(customerId: string, payload: CustomerContactPayload) {
  const result = await requestJson<{ contact: CustomerContactRecord }>(
    `/api/customers/${encodeURIComponent(customerId)}/contacts`,
    jsonRequest("POST", payload),
  );
  return result.contact;
}

export async function patchCustomerContact(customerId: string, contactId: string, payload: CustomerContactUpdatePayload) {
  const result = await requestJson<{ contact: CustomerContactRecord }>(
    `/api/customers/${encodeURIComponent(customerId)}/contacts/${encodeURIComponent(contactId)}`,
    jsonRequest("PATCH", payload),
  );
  return result.contact;
}

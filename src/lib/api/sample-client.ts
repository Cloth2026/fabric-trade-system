import type { SampleFeedbackResult, SampleRequestStatus } from "@/server/samples/constants";

export type SampleFabricBrief = {
  id: string;
  code: string;
  name: string;
  englishName: string | null;
  fabricType: string | null;
  pricingUnit: string | null;
  composition: string | null;
};

export type SampleCustomerBrief = {
  id: string;
  name: string;
  status: string;
  city: string | null;
};

export type SampleContactBrief = {
  id: string;
  name: string;
  title: string | null;
  phone: string | null;
};

export type SampleRequestItemRecord = {
  id: string;
  requestId: string;
  fabricId: string;
  unit: string | null;
  quantity: number | null;
  colorOrRemark: string | null;
  feedback: string | null;
  feedbackResult: SampleFeedbackResult | null;
  feedbackAt: string | null;
  createdAt: string;
  updatedAt: string;
  fabric: SampleFabricBrief;
};

export type SampleRequestRecord = {
  id: string;
  code: string;
  customerId: string;
  contactId: string | null;
  status: SampleRequestStatus;
  sentAt: string | null;
  expectedReturnAt: string | null;
  returnedAt: string | null;
  carrier: string | null;
  trackingNo: string | null;
  receiverName: string | null;
  receiverPhone: string | null;
  purpose: string | null;
  remark: string | null;
  createdAt: string;
  updatedAt: string;
  customer: SampleCustomerBrief;
  contact: SampleContactBrief | null;
  _count: { items: number };
};

export type SampleRequestDetailRecord = Omit<SampleRequestRecord, "_count"> & {
  receiverAddress: string | null;
  items: SampleRequestItemRecord[];
};

export type SampleRequestItemInput = {
  fabricId: string;
  quantity?: string | null;
  colorOrRemark?: string | null;
};

export type SampleRequestPayload = {
  customerId: string;
  contactId?: string | null;
  status?: SampleRequestStatus | null;
  sentAt?: string | null;
  expectedReturnAt?: string | null;
  returnedAt?: string | null;
  carrier?: string | null;
  trackingNo?: string | null;
  receiverName?: string | null;
  receiverPhone?: string | null;
  receiverAddress?: string | null;
  purpose?: string | null;
  remark?: string | null;
  items: SampleRequestItemInput[];
};

export type SampleRequestUpdatePayload = Partial<Omit<SampleRequestPayload, "items" | "customerId">>;

export type SampleStatusPayload = {
  status: SampleRequestStatus;
  sentAt?: string | null;
  returnedAt?: string | null;
  carrier?: string | null;
  trackingNo?: string | null;
};

export type SampleFeedbackPayload = {
  feedback?: string | null;
  feedbackResult?: SampleFeedbackResult | null;
};

export class SampleApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "SampleApiError";
  }
}

async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const body = (await response.json().catch(() => ({}))) as { error?: string; details?: unknown } & T;

  if (!response.ok) {
    throw new SampleApiError(response.status, body.error ?? "请求失败，请稍后重试", body.details);
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

export function getSampleFieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof SampleApiError)) return {};
  const details = error.details as { properties?: Record<string, { errors?: string[] }> } | undefined;
  const properties = details?.properties ?? {};

  return Object.fromEntries(
    Object.entries(properties)
      .filter((entry): entry is [string, { errors: string[] }] => Boolean(entry[1].errors?.[0]))
      .map(([field, value]) => [field, value.errors[0]]),
  );
}

export function getSampleErrorMessage(error: unknown, fallback: string) {
  if (error instanceof SampleApiError) {
    if (error.status === 404) return "寄样单不存在或无权访问";
    if (error.status === 409) return "数据冲突，请刷新后重试";
    if (error.status === 400) return "请检查填写内容，修正标记字段后再保存";
  }
  return error instanceof Error ? error.message : fallback;
}

export async function fetchSampleRequests(
  filters: { q?: string; status?: SampleRequestStatus | "all"; customerId?: string; limit?: number } = {},
  signal?: AbortSignal,
) {
  const params = new URLSearchParams();
  if (filters.q?.trim()) params.set("q", filters.q.trim());
  if (filters.status && filters.status !== "all") params.set("status", filters.status);
  if (filters.customerId) params.set("customerId", filters.customerId);
  params.set("limit", String(filters.limit ?? 50));

  const result = await requestJson<{ sampleRequests: SampleRequestRecord[] }>(`/api/sample-requests?${params}`, {
    signal,
    cache: "no-store",
  });
  return result.sampleRequests;
}

export async function createSampleRequest(payload: SampleRequestPayload) {
  const result = await requestJson<{ sampleRequest: SampleRequestDetailRecord }>(
    "/api/sample-requests",
    jsonRequest("POST", payload),
  );
  return result.sampleRequest;
}

export async function fetchSampleRequest(id: string, signal?: AbortSignal) {
  const result = await requestJson<{ sampleRequest: SampleRequestDetailRecord }>(
    `/api/sample-requests/${encodeURIComponent(id)}`,
    { signal, cache: "no-store" },
  );
  return result.sampleRequest;
}

export async function patchSampleRequest(id: string, payload: SampleRequestUpdatePayload) {
  const result = await requestJson<{ sampleRequest: SampleRequestDetailRecord }>(
    `/api/sample-requests/${encodeURIComponent(id)}`,
    jsonRequest("PATCH", payload),
  );
  return result.sampleRequest;
}

export async function patchSampleRequestStatus(id: string, payload: SampleStatusPayload) {
  const result = await requestJson<{ sampleRequest: SampleRequestDetailRecord }>(
    `/api/sample-requests/${encodeURIComponent(id)}/status`,
    jsonRequest("PATCH", payload),
  );
  return result.sampleRequest;
}

export async function patchSampleItemFeedback(
  requestId: string,
  itemId: string,
  payload: SampleFeedbackPayload,
) {
  const result = await requestJson<{ item: SampleRequestItemRecord }>(
    `/api/sample-requests/${encodeURIComponent(requestId)}/items/${encodeURIComponent(itemId)}/feedback`,
    jsonRequest("PATCH", payload),
  );
  return result.item;
}

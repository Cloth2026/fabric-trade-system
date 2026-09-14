export type ConfigOption = {
  group: string;
  key: string;
  label: string;
  sortOrder: number;
};

export type SupplierSearchItem = {
  id: string;
  name: string;
  type: string | null;
  contactName: string | null;
  phone: string | null;
};

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const body = (await response.json().catch(() => ({}))) as { error?: string; details?: unknown } & T;

  if (!response.ok) {
    throw new ApiClientError(response.status, body.error ?? "请求失败，请稍后重试", body.details);
  }

  return body;
}

export async function fetchConfigOptions(groups: string[], signal?: AbortSignal) {
  const query = new URLSearchParams({ groups: groups.join(",") });
  const data = await requestJson<{ options: ConfigOption[] }>(`/api/config-options?${query}`, { signal });
  return data.options;
}

export async function searchSuppliers(query: string, signal?: AbortSignal) {
  const params = new URLSearchParams({ q: query.trim(), limit: "20" });
  const data = await requestJson<{ suppliers: SupplierSearchItem[] }>(`/api/suppliers?${params}`, { signal });
  return data.suppliers;
}

export async function postCreateFabric(payload: unknown) {
  return requestJson<{ fabric: { id: string; code: string; name: string } }>("/api/fabrics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function createSingleFlightSubmitter<TPayload, TResult>(request: (payload: TPayload) => Promise<TResult>) {
  let activeRequest: Promise<TResult> | null = null;

  return (payload: TPayload) => {
    if (activeRequest) return activeRequest;
    activeRequest = request(payload).finally(() => {
      activeRequest = null;
    });
    return activeRequest;
  };
}

export function getCreateFabricErrorMessage(error: unknown) {
  if (error instanceof ApiClientError && error.status === 409) {
    return "该面料编号已存在";
  }

  if (error instanceof ApiClientError && error.status === 400) {
    return "请检查新增面料信息，修正标记字段后再保存";
  }

  return "保存失败，请稍后重试";
}

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

export type FabricType = "knitted" | "woven";
export type PricingUnit = "kg" | "meter";
export type FabricCompletenessFilter = "all" | "complete" | "needs_attention";

export type FabricListQuery = {
  q?: string;
  fabricType?: FabricType | "all";
  status?: string;
  developmentSource?: string;
  completeness?: FabricCompletenessFilter;
  page?: number;
  pageSize?: number;
};

export type FabricQuote = {
  id: string;
  supplierUnitId: string | null;
  supplierUnit: SupplierUnitSummary | null;
  purchasePrice: string;
  currency: string;
  pricingUnit: PricingUnit;
  minimumOrderQty: string | null;
  leadTime: string | null;
  contactName: string | null;
  quoteDate: string;
  qualityDifferences: string | null;
  remarks: string | null;
  createdAt: string;
};

export type SupplierUnitSummary = {
  id: string;
  name: string;
  unitForm: string;
  status: string;
};

export type PreferredFabricSource = {
  id: string;
  supplierId: string;
  supplierName: string;
  supplierUnitId: string | null;
  supplierUnitName: string | null;
  supplierFabricCode: string | null;
  sampleStatus: string | null;
  latestQuote: Omit<FabricQuote, "supplierUnitId" | "supplierUnit"> | null;
};

export type FabricListItem = {
  id: string;
  code: string;
  name: string;
  englishName: string | null;
  fabricType: FabricType;
  pricingUnit: PricingUnit;
  composition: string;
  weight: string;
  width: string;
  yarnCount: string | null;
  warpWeftDensity: string | null;
  developmentSource: string;
  status: string;
  completenessPercent: number;
  missingInfoFlags: string[];
  createdAt: string;
  updatedAt: string;
  supplierSourceCount: number;
  preferredSupplierSource: PreferredFabricSource | null;
};

export type FabricListResponse = {
  data: FabricListItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

type SupplierSummary = { id: string; name: string; status: string };

export type FabricSupplierSource = {
  id: string;
  supplierId: string;
  supplierUnitId: string | null;
  supplierFabricCode: string | null;
  sampleStatus: string | null;
  qualityDifferences: string | null;
  isPreferred: boolean;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
  supplier: SupplierSummary;
  supplierUnit: SupplierUnitSummary | null;
  quotes: FabricQuote[];
};

type ProcessSupplierFields = {
  supplierId?: string | null;
  supplier?: SupplierSummary | null;
  factoryId?: string | null;
  factory?: SupplierSummary | null;
};

export type FabricDetail = Omit<FabricListItem, "supplierSourceCount" | "preferredSupplierSource"> & {
  category: string | null;
  structure: string | null;
  elasticity: string | null;
  usageOptionKeys: string[];
  seasonOptionKeys: string[];
  certificationOptionKeys: string[];
  tags: string[];
  sourceContact: string | null;
  sourceDate: string | null;
  finishedReferencePrice: string | null;
  repurchaseStatus: string | null;
  tubeWeight: string | null;
  tolerance: string | null;
  greigeStatus: "none" | "pending" | "available";
  dyeingStatus: "none" | "pending" | "available";
  postProcessStatus: "none" | "pending" | "available";
  colorFastness: string | null;
  pilling: string | null;
  inspectionConclusion: string | null;
  handFeel: string | null;
  remarks: string | null;
  supplierSources: FabricSupplierSource[];
  greige: (ProcessSupplierFields & {
    id: string;
    code: string | null;
    name: string | null;
    composition: string | null;
    weight: string | null;
    width: string | null;
    yarnOrDensity: string | null;
    unitPrice: string | null;
    lossRate: string | null;
    remarks: string | null;
    createdAt: string;
    updatedAt: string;
  }) | null;
  dyeingFinishing: (ProcessSupplierFields & {
    id: string;
    processType: string | null;
    unitPrice: string | null;
    lossRate: string | null;
    leadTime: string | null;
    cautions: string | null;
    createdAt: string;
    updatedAt: string;
  }) | null;
  postProcesses: Array<ProcessSupplierFields & {
    id: string;
    processType: string | null;
    effectDescription: string | null;
    unitPrice: string | null;
    lossRate: string | null;
    minimumOrderQty: string | null;
    leadTime: string | null;
    riskNotes: string | null;
    remarks: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
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

export function buildFabricListQuery(query: FabricListQuery) {
  const params = new URLSearchParams();
  const keyword = query.q?.trim();
  if (keyword) params.set("q", keyword);
  if (query.fabricType) params.set("fabricType", query.fabricType);
  if (query.status) params.set("status", query.status);
  if (query.developmentSource) params.set("developmentSource", query.developmentSource);
  if (query.completeness) params.set("completeness", query.completeness);
  if (query.page) params.set("page", String(query.page));
  if (query.pageSize) params.set("pageSize", String(query.pageSize));
  return params;
}

export async function fetchFabrics(query: FabricListQuery, signal?: AbortSignal) {
  const params = buildFabricListQuery(query);
  return requestJson<FabricListResponse>(`/api/fabrics?${params}`, { signal, cache: "no-store" });
}

export async function fetchFabricDetail(id: string, signal?: AbortSignal) {
  const result = await requestJson<{ data: FabricDetail }>(`/api/fabrics/${encodeURIComponent(id)}`, {
    signal,
    cache: "no-store",
  });
  return result.data;
}

export function createLatestRequestGuard() {
  let latestRequest = 0;
  return {
    begin() {
      latestRequest += 1;
      return latestRequest;
    },
    isLatest(requestId: number) {
      return requestId === latestRequest;
    },
    invalidate() {
      latestRequest += 1;
    },
  };
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

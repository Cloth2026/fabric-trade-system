import type {
  FabricQuote,
  FabricSupplierSource,
  PricingUnit,
  SupplierUnitSummary,
} from "@/lib/api/fabric-client";

export const prototypeIdPrefix = "prototype-";

export function isPrototypeEntry(id: string | null | undefined) {
  return Boolean(id?.startsWith(prototypeIdPrefix));
}

export type SourceDraft = {
  supplierId: string;
  supplierName: string;
  supplierUnit: SupplierUnitSummary | null;
  supplierFabricCode: string;
  sampleStatus: string;
  qualityDifferences: string;
  remarks: string;
  isPreferred: boolean;
};

export type QuoteDraft = {
  purchasePrice: string;
  currency: string;
  minimumOrderQty: string;
  leadTime: string;
  contactName: string;
  quoteDate: string;
  supplierUnit: SupplierUnitSummary | null;
  qualityDifferences: string;
  remarks: string;
};

export type SourceMaintenanceErrors = Record<string, string>;

function createPrototypeId(kind: "source" | "quote") {
  const random = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prototypeIdPrefix}${kind}-${random}`;
}

function timestampOf(value: string) {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

export function compareQuotesDesc(a: FabricQuote, b: FabricQuote) {
  const dateDiff = timestampOf(b.quoteDate) - timestampOf(a.quoteDate);
  if (dateDiff !== 0) return dateDiff;

  const createdDiff = timestampOf(b.createdAt) - timestampOf(a.createdAt);
  if (createdDiff !== 0) return createdDiff;

  return b.id.localeCompare(a.id);
}

export function sortQuotesDesc(quotes: FabricQuote[]) {
  return [...quotes].sort(compareQuotesDesc);
}

export function validateSourceDraft(draft: SourceDraft, existingSources: FabricSupplierSource[]): SourceMaintenanceErrors {
  const errors: SourceMaintenanceErrors = {};

  if (draft.supplierId.trim().length === 0) {
    errors.supplier = "请先搜索并选择供应商";
  } else if (existingSources.some((source) => source.supplierId === draft.supplierId)) {
    errors.supplier = "同一面料与同一供应商只能保留一条长期货源关系";
  }

  return errors;
}

export function createEmptySourceDraft(): SourceDraft {
  return {
    supplierId: "",
    supplierName: "",
    supplierUnit: null,
    supplierFabricCode: "",
    sampleStatus: "",
    qualityDifferences: "",
    remarks: "",
    isPreferred: false,
  };
}

export function createSourceDraftFromSource(source: FabricSupplierSource): SourceDraft {
  return {
    supplierId: source.supplierId,
    supplierName: source.supplier.name,
    supplierUnit: source.supplierUnit,
    supplierFabricCode: source.supplierFabricCode ?? "",
    sampleStatus: source.sampleStatus ?? "",
    qualityDifferences: source.qualityDifferences ?? "",
    remarks: source.remarks ?? "",
    isPreferred: source.isPreferred,
  };
}

export function createPrototypeSource(
  draft: SourceDraft,
  now = new Date(),
): FabricSupplierSource {
  const timestamp = now.toISOString();
  return {
    id: createPrototypeId("source"),
    supplierId: draft.supplierId,
    supplierUnitId: draft.supplierUnit?.id ?? null,
    supplierFabricCode: draft.supplierFabricCode.trim() || null,
    sampleStatus: draft.sampleStatus || null,
    qualityDifferences: draft.qualityDifferences.trim() || null,
    isPreferred: draft.isPreferred,
    remarks: draft.remarks.trim() || null,
    createdAt: timestamp,
    updatedAt: timestamp,
    supplier: { id: draft.supplierId, name: draft.supplierName, status: "active" },
    supplierUnit: draft.supplierUnit,
    quotes: [],
  };
}

export function addPrototypeSource(
  sources: FabricSupplierSource[],
  draft: SourceDraft,
  now = new Date(),
): { sources: FabricSupplierSource[]; error?: string } {
  const errors = validateSourceDraft(draft, sources);
  if (Object.keys(errors).length > 0) {
    return { sources, error: errors.supplier };
  }

  const next = createPrototypeSource(draft, now);
  // 与新增面料 API 的规则保持一致：唯一货源自动成为首选，指定首选时取消其他首选。
  next.isPreferred = sources.length === 0 || draft.isPreferred;

  return {
    sources: [
      ...sources.map((source) => (next.isPreferred ? { ...source, isPreferred: false } : source)),
      next,
    ],
  };
}

export function updatePrototypeSource(
  sources: FabricSupplierSource[],
  sourceId: string,
  draft: SourceDraft,
  now = new Date(),
): FabricSupplierSource[] {
  return sources.map((source) => {
    if (source.id !== sourceId) {
      return draft.isPreferred ? { ...source, isPreferred: false } : source;
    }

    return {
      ...source,
      supplierUnitId: draft.supplierUnit?.id ?? null,
      supplierUnit: draft.supplierUnit,
      supplierFabricCode: draft.supplierFabricCode.trim() || null,
      sampleStatus: draft.sampleStatus || null,
      qualityDifferences: draft.qualityDifferences.trim() || null,
      remarks: draft.remarks.trim() || null,
      isPreferred: draft.isPreferred,
      updatedAt: now.toISOString(),
    };
  });
}

export function setPrototypePreferredSource(
  sources: FabricSupplierSource[],
  sourceId: string,
): FabricSupplierSource[] {
  return sources.map((source) => ({ ...source, isPreferred: source.id === sourceId }));
}

export function validateQuoteDraft(draft: QuoteDraft): SourceMaintenanceErrors {
  const errors: SourceMaintenanceErrors = {};
  const price = draft.purchasePrice.trim();

  if (price.length === 0) {
    errors.purchasePrice = "采购价不能为空";
  } else if (!Number.isFinite(Number(price)) || Number(price) < 0) {
    errors.purchasePrice = "采购价必须是非负数";
  }

  const currency = draft.currency.trim().toUpperCase();
  if (currency.length > 0 && !/^[A-Z]{3}$/.test(currency)) {
    errors.currency = "币种需使用3位大写代码";
  }

  return errors;
}

export function createEmptyQuoteDraft(now = new Date()): QuoteDraft {
  return {
    purchasePrice: "",
    currency: "CNY",
    minimumOrderQty: "",
    leadTime: "",
    contactName: "",
    quoteDate: now.toISOString().slice(0, 10),
    supplierUnit: null,
    qualityDifferences: "",
    remarks: "",
  };
}

export function createPrototypeQuote(
  draft: QuoteDraft,
  pricingUnit: PricingUnit,
  now = new Date(),
): FabricQuote {
  const timestamp = now.toISOString();
  return {
    id: createPrototypeId("quote"),
    supplierUnitId: draft.supplierUnit?.id ?? null,
    supplierUnit: draft.supplierUnit,
    purchasePrice: draft.purchasePrice.trim(),
    currency: draft.currency.trim().toUpperCase() || "CNY",
    pricingUnit,
    minimumOrderQty: draft.minimumOrderQty.trim() || null,
    leadTime: draft.leadTime.trim() || null,
    contactName: draft.contactName.trim() || null,
    quoteDate: draft.quoteDate || timestamp,
    qualityDifferences: draft.qualityDifferences.trim() || null,
    remarks: draft.remarks.trim() || null,
    createdAt: timestamp,
  };
}

export function addPrototypeQuoteToSource(
  sources: FabricSupplierSource[],
  sourceId: string,
  draft: QuoteDraft,
  pricingUnit: PricingUnit,
  now = new Date(),
): { sources: FabricSupplierSource[]; error?: string } {
  const errors = validateQuoteDraft(draft);
  if (Object.keys(errors).length > 0) {
    return { sources, error: Object.values(errors)[0] };
  }

  const target = sources.find((source) => source.id === sourceId);
  if (!target) {
    return { sources, error: "未找到对应货源，请刷新后重试" };
  }

  // 与真实 API 的快照语义一致：报价未指定生产单元时，沿用货源当前生产单元。
  const effectiveDraft: QuoteDraft =
    draft.supplierUnit === null && target.supplierUnit
      ? { ...draft, supplierUnit: target.supplierUnit }
      : draft;
  const quote = createPrototypeQuote(effectiveDraft, pricingUnit, now);
  return {
    sources: sources.map((source) =>
      source.id === sourceId
        ? { ...source, quotes: sortQuotesDesc([...source.quotes, quote]) }
        : source,
    ),
  };
}

export function hasPrototypeEntries(sources: FabricSupplierSource[]) {
  return (
    sources.some((source) => isPrototypeEntry(source.id)) ||
    sources.some((source) => source.quotes.some((quote) => isPrototypeEntry(quote.id)))
  );
}

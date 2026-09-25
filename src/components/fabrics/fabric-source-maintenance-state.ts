import type {
  FabricQuote,
  FabricSupplierSource,
  SupplierUnitSummary,
} from "@/lib/api/fabric-client";
import type { FabricQuotePayload, FabricSourcePayload, FabricSourceUpdatePayload } from "@/lib/api/fabric-client";
import { percentInputToTaxRate, validateTaxRatePercent } from "@/lib/tax-rate";

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
  purchasePriceExclTax: string;
  purchasePriceInclTax: string;
  purchaseTaxRate: string;
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

export function buildSourcePayload(draft: SourceDraft): FabricSourcePayload {
  return {
    supplierId: draft.supplierId,
    supplierUnitId: draft.supplierUnit?.id ?? null,
    supplierFabricCode: draft.supplierFabricCode.trim() || null,
    sampleStatus: draft.sampleStatus || null,
    qualityDifferences: draft.qualityDifferences.trim() || null,
    remarks: draft.remarks.trim() || null,
    isPreferred: draft.isPreferred,
  };
}

export function buildSourceUpdatePayload(draft: SourceDraft): FabricSourceUpdatePayload {
  return {
    supplierUnitId: draft.supplierUnit?.id ?? null,
    supplierFabricCode: draft.supplierFabricCode.trim() || null,
    sampleStatus: draft.sampleStatus || null,
    qualityDifferences: draft.qualityDifferences.trim() || null,
    remarks: draft.remarks.trim() || null,
    isPreferred: draft.isPreferred,
  };
}

export function validateQuoteDraft(draft: QuoteDraft): SourceMaintenanceErrors {
  const errors: SourceMaintenanceErrors = {};
  const price = draft.purchasePriceExclTax.trim();

  if (price.length === 0) {
    errors.purchasePriceExclTax = "不含税采购价不能为空";
  } else if (!Number.isFinite(Number(price)) || Number(price) < 0) {
    errors.purchasePriceExclTax = "不含税采购价必须是非负数";
  }

  const inclusivePrice = draft.purchasePriceInclTax.trim();
  if (inclusivePrice.length > 0 && (!Number.isFinite(Number(inclusivePrice)) || Number(inclusivePrice) < 0)) {
    errors.purchasePriceInclTax = "含税采购价必须是非负数";
  }

  const taxRateError = validateTaxRatePercent(draft.purchaseTaxRate);
  if (taxRateError) {
    errors.purchaseTaxRate = taxRateError;
  }

  const currency = draft.currency.trim().toUpperCase();
  if (currency.length > 0 && !/^[A-Z]{3}$/.test(currency)) {
    errors.currency = "币种需使用3位大写代码";
  }

  return errors;
}

export function createEmptyQuoteDraft(now = new Date()): QuoteDraft {
  return {
    purchasePriceExclTax: "",
    purchasePriceInclTax: "",
    purchaseTaxRate: "",
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

export function buildQuotePayload(draft: QuoteDraft): FabricQuotePayload {
  return {
    purchasePriceExclTax: draft.purchasePriceExclTax.trim(),
    purchasePriceInclTax: draft.purchasePriceInclTax.trim() || null,
    purchaseTaxRate: percentInputToTaxRate(draft.purchaseTaxRate),
    currency: draft.currency.trim().toUpperCase() || "CNY",
    minimumOrderQty: draft.minimumOrderQty.trim() || null,
    leadTime: draft.leadTime.trim() || null,
    contactName: draft.contactName.trim() || null,
    quoteDate: draft.quoteDate.trim() || null,
    // 未指定时由服务器沿用货源当前生产单元作为历史快照。
    supplierUnitId: draft.supplierUnit?.id ?? null,
    qualityDifferences: draft.qualityDifferences.trim() || null,
    remarks: draft.remarks.trim() || null,
  };
}

export function isSameQuoteUnit(quote: FabricQuote, unit: SupplierUnitSummary | null) {
  return (quote.supplierUnitId ?? null) === (unit?.id ?? null);
}

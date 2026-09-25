import { percentInputToTaxRate, validateTaxRatePercent } from "@/lib/tax-rate";

export type FabricType = "knitted" | "woven";
export type ProcessStatus = "none" | "pending" | "available";

export type GreigeDraft = {
  id: string;
  supplierId: string;
  supplierName: string;
  code: string;
  name: string;
  composition: string;
  weight: string;
  width: string;
  yarnOrDensity: string;
  unitPriceExclTax: string;
  unitPriceInclTax: string;
  taxRate: string;
  lossRate: string;
  remarks: string;
};

export type DyeingDraft = {
  id: string;
  processType: string;
  factoryId: string;
  factoryName: string;
  unitPriceExclTax: string;
  unitPriceInclTax: string;
  taxRate: string;
  lossRate: string;
  leadTime: string;
  cautions: string;
};

export type PostProcessDraft = {
  id: string;
  processType: string;
  factoryId: string;
  factoryName: string;
  effectDescription: string;
  unitPriceExclTax: string;
  unitPriceInclTax: string;
  taxRate: string;
  lossRate: string;
  minimumOrderQty: string;
  leadTime: string;
  riskNotes: string;
  remarks: string;
};

export type SupplierQuoteDraft = {
  purchasePriceExclTax: string;
  purchasePriceInclTax: string;
  purchaseTaxRate: string;
  currency: string;
  minimumOrderQty: string;
  leadTime: string;
  contactName: string;
  quoteDate: string;
  remarks: string;
};

export type FabricSupplierDraft = {
  id: string;
  supplierId: string;
  supplierName: string;
  supplierFabricCode: string;
  sampleStatus: string;
  qualityDifferences: string;
  isPreferred: boolean;
  remarks: string;
  initialQuote: SupplierQuoteDraft;
};

export type FabricFormState = {
  codeSuffix: string;
  englishName: string;
  name: string;
  fabricType: FabricType;
  developmentSource: string;
  status: string;
  composition: string;
  weight: string;
  width: string;
  yarnCount: string;
  warpWeftDensity: string;
  category: string;
  structure: string;
  elasticity: string;
  sourceContact: string;
  sourceDate: string;
  finishedReferencePriceExclTax: string;
  finishedReferencePriceInclTax: string;
  finishedReferenceTaxRate: string;
  repurchaseStatus: string;
  tubeWeight: string;
  tolerance: string;
  greigeStatus: ProcessStatus;
  dyeingStatus: ProcessStatus;
  postProcessStatus: ProcessStatus;
  colorFastness: string;
  pilling: string;
  inspectionConclusion: string;
  handFeel: string;
  remarks: string;
  usageOptionKeys: string[];
  seasonOptionKeys: string[];
  certificationOptionKeys: string[];
  greigeFabrics: GreigeDraft[];
  dyeingFinishings: DyeingDraft[];
  postProcesses: PostProcessDraft[];
  suppliers: FabricSupplierDraft[];
};

export type FieldErrors = Record<string, string>;

const randomId = () => globalThis.crypto?.randomUUID?.() ?? `row-${Date.now()}-${Math.random()}`;

export const emptyGreige = (id = randomId()): GreigeDraft => ({
  id,
  supplierId: "",
  supplierName: "",
  code: "",
  name: "",
  composition: "",
  weight: "",
  width: "",
  yarnOrDensity: "",
  unitPriceExclTax: "",
  unitPriceInclTax: "",
  taxRate: "",
  lossRate: "",
  remarks: "",
});

export const emptyDyeing = (id = randomId()): DyeingDraft => ({
  id,
  processType: "",
  factoryId: "",
  factoryName: "",
  unitPriceExclTax: "",
  unitPriceInclTax: "",
  taxRate: "",
  lossRate: "",
  leadTime: "",
  cautions: "",
});

export const createGreigeDraft = emptyGreige;
export const createDyeingDraft = emptyDyeing;

export function createPostProcessDraft(id = globalThis.crypto?.randomUUID?.() ?? `post-${Date.now()}`): PostProcessDraft {
  return {
    id,
    processType: "",
    factoryId: "",
    factoryName: "",
    effectDescription: "",
    unitPriceExclTax: "",
    unitPriceInclTax: "",
    taxRate: "",
    lossRate: "",
    minimumOrderQty: "",
    leadTime: "",
    riskNotes: "",
    remarks: "",
  };
}

export function createSupplierDraft(
  supplier: { id: string; name: string },
  id = globalThis.crypto?.randomUUID?.() ?? `supplier-${Date.now()}`,
): FabricSupplierDraft {
  return {
    id,
    supplierId: supplier.id,
    supplierName: supplier.name,
    supplierFabricCode: "",
    sampleStatus: "",
    qualityDifferences: "",
    isPreferred: false,
    remarks: "",
    initialQuote: {
      purchasePriceExclTax: "",
      purchasePriceInclTax: "",
      purchaseTaxRate: "",
      currency: "CNY",
      minimumOrderQty: "",
      leadTime: "",
      contactName: "",
      quoteDate: "",
      remarks: "",
    },
  };
}

export function createInitialFabricFormState(): FabricFormState {
  return {
    codeSuffix: "",
    englishName: "",
    name: "",
    fabricType: "knitted",
    developmentSource: "",
    status: "",
    composition: "",
    weight: "",
    width: "",
    yarnCount: "",
    warpWeftDensity: "",
    category: "",
    structure: "",
    elasticity: "",
    sourceContact: "",
    sourceDate: "",
    finishedReferencePriceExclTax: "",
    finishedReferencePriceInclTax: "",
    finishedReferenceTaxRate: "",
    repurchaseStatus: "",
    tubeWeight: "",
    tolerance: "",
    greigeStatus: "pending",
    dyeingStatus: "pending",
    postProcessStatus: "pending",
    colorFastness: "",
    pilling: "",
    inspectionConclusion: "",
    handFeel: "",
    remarks: "",
    usageOptionKeys: [],
    seasonOptionKeys: [],
    certificationOptionKeys: [],
    greigeFabrics: [],
    dyeingFinishings: [],
    postProcesses: [],
    suppliers: [],
  };
}

export function getPricingUnit(fabricType: FabricType): "kg" | "meter" {
  return fabricType === "knitted" ? "kg" : "meter";
}

export function getPricingUnitLabel(fabricType: FabricType): "公斤" | "米" {
  return fabricType === "knitted" ? "公斤" : "米";
}

export function changeProcessStatus(
  state: FabricFormState,
  process: "greige" | "dyeing" | "postProcess",
  status: ProcessStatus,
): FabricFormState {
  if (process === "greige") {
    return {
      ...state,
      greigeStatus: status,
      greigeFabrics:
        status === "none"
          ? []
          : status === "available" && state.greigeFabrics.length === 0
            ? [emptyGreige()]
            : state.greigeFabrics,
    };
  }

  if (process === "dyeing") {
    return {
      ...state,
      dyeingStatus: status,
      dyeingFinishings:
        status === "none"
          ? []
          : status === "available" && state.dyeingFinishings.length === 0
            ? [emptyDyeing()]
            : state.dyeingFinishings,
    };
  }

  return {
    ...state,
    postProcessStatus: status,
    postProcesses:
      status === "none"
        ? []
        : status === "available" && state.postProcesses.length === 0
          ? [createPostProcessDraft()]
          : state.postProcesses,
  };
}

export function addSupplierToDraft(
  state: FabricFormState,
  supplier: { id: string; name: string },
  draftId?: string,
): { state: FabricFormState; error?: string } {
  if (state.suppliers.some((item) => item.supplierId === supplier.id)) {
    return { state, error: "同一家供应商不能重复添加" };
  }

  const draft = createSupplierDraft(supplier, draftId);
  if (state.suppliers.length === 0) {
    draft.isPreferred = true;
  }

  return { state: { ...state, suppliers: [...state.suppliers, draft] } };
}

export function removeSupplierFromDraft(state: FabricFormState, draftId: string): FabricFormState {
  const remaining = state.suppliers.filter((supplier) => supplier.id !== draftId);
  if (remaining.length > 0 && !remaining.some((supplier) => supplier.isPreferred)) {
    remaining[0] = { ...remaining[0], isPreferred: true };
  }
  return { ...state, suppliers: remaining };
}

export function setPreferredSupplier(state: FabricFormState, draftId: string): FabricFormState {
  return {
    ...state,
    suppliers: state.suppliers.map((supplier) => ({ ...supplier, isPreferred: supplier.id === draftId })),
  };
}

const trimmed = (value: string) => value.trim();
const optional = (value: string) => {
  const valueTrimmed = value.trim();
  return valueTrimmed.length > 0 ? valueTrimmed : undefined;
};
const optionalNumber = (value: string) => {
  const valueTrimmed = value.trim();
  return valueTrimmed.length > 0 ? Number(valueTrimmed) : undefined;
};

function hasQuoteDetails(quote: SupplierQuoteDraft) {
  return [
    quote.purchasePriceExclTax,
    quote.purchasePriceInclTax,
    quote.purchaseTaxRate,
    quote.minimumOrderQty,
    quote.leadTime,
    quote.contactName,
    quote.quoteDate,
    quote.remarks,
  ].some((value) => value.trim().length > 0);
}

export function assertNonNegativeMoney(value: string, label: string, errors: FieldErrors, path: string) {
  const trimmedValue = value.trim();
  if (trimmedValue.length === 0) {
    return;
  }

  const parsed = Number(trimmedValue);
  if (!Number.isFinite(parsed) || parsed < 0) {
    errors[path] = `${label}必须是非负数`;
  }
}

export function assertTaxRatePercent(value: string, errors: FieldErrors, path: string) {
  const message = validateTaxRatePercent(value);
  if (message) {
    errors[path] = message;
  }
}

export function assertPriceTaxTriple(
  value: { unitPriceExclTax: string; unitPriceInclTax: string; taxRate: string },
  label: string,
  errors: FieldErrors,
  path: string,
) {
  assertNonNegativeMoney(value.unitPriceExclTax, `${label}不含税单价`, errors, `${path}.unitPriceExclTax`);
  assertNonNegativeMoney(value.unitPriceInclTax, `${label}含税单价`, errors, `${path}.unitPriceInclTax`);
  assertTaxRatePercent(value.taxRate, errors, `${path}.taxRate`);
}

export function validateCreateFabricDraft(state: FabricFormState): FieldErrors {
  const errors: FieldErrors = {};
  const requiredFields: Array<[keyof FabricFormState, string]> = [
    ["codeSuffix", "请填写面料编号"],
    ["name", "请填写面料名称"],
    ["developmentSource", "请选择开发来源"],
    ["composition", "请填写成分"],
    ["weight", "请填写克重"],
    ["width", "请填写门幅"],
  ];

  for (const [field, message] of requiredFields) {
    if (typeof state[field] === "string" && state[field].trim().length === 0) {
      errors[field] = message;
    }
  }

  if (`SDD-${state.codeSuffix.trim()}`.length > 64) {
    errors.codeSuffix = "面料编号总长度不能超过64个字符";
  }

  assertNonNegativeMoney(state.finishedReferencePriceExclTax, "不含税参考价", errors, "finishedReferencePriceExclTax");
  assertNonNegativeMoney(state.finishedReferencePriceInclTax, "含税参考价", errors, "finishedReferencePriceInclTax");
  assertTaxRatePercent(state.finishedReferenceTaxRate, errors, "finishedReferenceTaxRate");

  state.suppliers.forEach((supplier, index) => {
    const quotePath = `suppliers.${index}.initialQuote.purchasePriceExclTax`;
    if (hasQuoteDetails(supplier.initialQuote) && supplier.initialQuote.purchasePriceExclTax.trim().length === 0) {
      errors[quotePath] = "填写首次报价时，不含税采购价不能为空";
    }

    assertNonNegativeMoney(supplier.initialQuote.purchasePriceExclTax, "不含税采购价", errors, quotePath);
    assertNonNegativeMoney(
      supplier.initialQuote.purchasePriceInclTax,
      "含税采购价",
      errors,
      `suppliers.${index}.initialQuote.purchasePriceInclTax`,
    );
    assertTaxRatePercent(
      supplier.initialQuote.purchaseTaxRate,
      errors,
      `suppliers.${index}.initialQuote.purchaseTaxRate`,
    );

    if (hasQuoteDetails(supplier.initialQuote) && !/^[A-Z]{3}$/.test(supplier.initialQuote.currency.trim().toUpperCase())) {
      errors[`suppliers.${index}.initialQuote.currency`] = "币种需使用3位大写代码";
    }
  });

  if (new Set(state.suppliers.map((supplier) => supplier.supplierId)).size !== state.suppliers.length) {
    errors.suppliers = "同一家供应商不能重复添加";
  }

  if (state.suppliers.filter((supplier) => supplier.isPreferred).length > 1) {
    errors.suppliers = "最多只能设置一家首选供应商";
  }

  if (state.greigeStatus === "available" && state.greigeFabrics.length === 0) {
    errors.greigeFabrics = "请至少添加一条坯布信息";
  }

  if (state.dyeingStatus === "available" && state.dyeingFinishings.length === 0) {
    errors.dyeingFinishings = "请至少添加一条染整信息";
  }

  if (state.postProcessStatus === "available" && state.postProcesses.length === 0) {
    errors.postProcesses = "请至少添加一条后工艺信息";
  }

  if (state.greigeStatus === "available") {
    state.greigeFabrics.forEach((greige, index) => {
      assertPriceTaxTriple(greige, "坯布", errors, `greigeFabrics.${index}`);
    });
  }

  if (state.dyeingStatus === "available") {
    state.dyeingFinishings.forEach((dyeing, index) => {
      assertPriceTaxTriple(dyeing, "染整", errors, `dyeingFinishings.${index}`);
    });
  }

  if (state.postProcessStatus === "available") {
    state.postProcesses.forEach((process, index) => {
      assertPriceTaxTriple(process, "后工艺", errors, `postProcesses.${index}`);
    });
  }

  return errors;
}

export function buildCreateFabricPayload(state: FabricFormState) {
  return {
    code: `SDD-${trimmed(state.codeSuffix)}`,
    englishName: optional(state.englishName),
    name: trimmed(state.name),
    fabricType: state.fabricType,
    developmentSource: trimmed(state.developmentSource),
    status: optional(state.status),
    composition: trimmed(state.composition),
    weight: trimmed(state.weight),
    width: trimmed(state.width),
    yarnCount: optional(state.yarnCount),
    warpWeftDensity: state.fabricType === "woven" ? optional(state.warpWeftDensity) : undefined,
    category: optional(state.category),
    structure: optional(state.structure),
    elasticity: optional(state.elasticity),
    sourceContact: optional(state.sourceContact),
    sourceDate: optional(state.sourceDate),
    finishedReferencePriceExclTax: optionalNumber(state.finishedReferencePriceExclTax),
    finishedReferencePriceInclTax: optionalNumber(state.finishedReferencePriceInclTax),
    finishedReferenceTaxRate: percentInputToTaxRate(state.finishedReferenceTaxRate),
    repurchaseStatus: optional(state.repurchaseStatus),
    tubeWeight: state.fabricType === "knitted" ? optional(state.tubeWeight) : undefined,
    tolerance: optional(state.tolerance),
    greigeStatus: state.greigeStatus,
    dyeingStatus: state.dyeingStatus,
    postProcessStatus: state.postProcessStatus,
    colorFastness: optional(state.colorFastness),
    pilling: optional(state.pilling),
    inspectionConclusion: optional(state.inspectionConclusion),
    handFeel: optional(state.handFeel),
    remarks: optional(state.remarks),
    usageOptionKeys: state.usageOptionKeys,
    seasonOptionKeys: state.seasonOptionKeys,
    certificationOptionKeys: state.certificationOptionKeys,
    greigeFabrics:
      state.greigeStatus === "available"
        ? state.greigeFabrics.map((greige) => ({
            supplierId: optional(greige.supplierId),
            code: optional(greige.code),
            name: optional(greige.name),
            composition: optional(greige.composition),
            weight: optional(greige.weight),
            width: optional(greige.width),
            yarnOrDensity: optional(greige.yarnOrDensity),
            unitPriceExclTax: optionalNumber(greige.unitPriceExclTax),
            unitPriceInclTax: optionalNumber(greige.unitPriceInclTax),
            taxRate: percentInputToTaxRate(greige.taxRate),
            lossRate: optional(greige.lossRate),
            remarks: optional(greige.remarks),
          }))
        : [],
    dyeingFinishings:
      state.dyeingStatus === "available"
        ? state.dyeingFinishings.map((dyeing) => ({
            processType: optional(dyeing.processType),
            factoryId: optional(dyeing.factoryId),
            unitPriceExclTax: optionalNumber(dyeing.unitPriceExclTax),
            unitPriceInclTax: optionalNumber(dyeing.unitPriceInclTax),
            taxRate: percentInputToTaxRate(dyeing.taxRate),
            lossRate: optional(dyeing.lossRate),
            leadTime: optional(dyeing.leadTime),
            cautions: optional(dyeing.cautions),
          }))
        : [],
    postProcesses:
      state.postProcessStatus === "available"
        ? state.postProcesses.map((process) => ({
            processType: optional(process.processType),
            factoryId: optional(process.factoryId),
            effectDescription: optional(process.effectDescription),
            unitPriceExclTax: optionalNumber(process.unitPriceExclTax),
            unitPriceInclTax: optionalNumber(process.unitPriceInclTax),
            taxRate: percentInputToTaxRate(process.taxRate),
            lossRate: optional(process.lossRate),
            minimumOrderQty: optional(process.minimumOrderQty),
            leadTime: optional(process.leadTime),
            riskNotes: optional(process.riskNotes),
            remarks: optional(process.remarks),
          }))
        : [],
    suppliers: state.suppliers.map((supplier) => ({
      supplierId: supplier.supplierId,
      supplierFabricCode: optional(supplier.supplierFabricCode),
      sampleStatus: optional(supplier.sampleStatus),
      qualityDifferences: optional(supplier.qualityDifferences),
      isPreferred: supplier.isPreferred,
      remarks: optional(supplier.remarks),
      initialQuote: hasQuoteDetails(supplier.initialQuote)
        ? {
            purchasePriceExclTax: optionalNumber(supplier.initialQuote.purchasePriceExclTax),
            purchasePriceInclTax: optionalNumber(supplier.initialQuote.purchasePriceInclTax),
            purchaseTaxRate: percentInputToTaxRate(supplier.initialQuote.purchaseTaxRate),
            currency: supplier.initialQuote.currency.trim().toUpperCase(),
            minimumOrderQty: optional(supplier.initialQuote.minimumOrderQty),
            leadTime: optional(supplier.initialQuote.leadTime),
            contactName: optional(supplier.initialQuote.contactName),
            quoteDate: optional(supplier.initialQuote.quoteDate),
            remarks: optional(supplier.initialQuote.remarks),
          }
        : undefined,
    })),
  };
}

type ErrorTree = {
  errors?: string[];
  properties?: Record<string, ErrorTree>;
  items?: Array<ErrorTree | undefined>;
};

export function flattenValidationErrors(tree: unknown, prefix = "", output: FieldErrors = {}): FieldErrors {
  if (!tree || typeof tree !== "object") {
    return output;
  }

  const node = tree as ErrorTree;
  if (node.errors?.length && prefix) {
    output[prefix] = node.errors[0];
  }

  for (const [key, child] of Object.entries(node.properties ?? {})) {
    flattenValidationErrors(child, prefix ? `${prefix}.${key}` : key, output);
  }

  node.items?.forEach((child, index) => {
    if (child) {
      flattenValidationErrors(child, prefix ? `${prefix}.${index}` : String(index), output);
    }
  });

  return output;
}

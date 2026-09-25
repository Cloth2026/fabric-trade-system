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
  unitPrice: string;
  lossRate: string;
  remarks: string;
};

export type DyeingDraft = {
  id: string;
  processType: string;
  factoryId: string;
  factoryName: string;
  unitPrice: string;
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
  unitPrice: string;
  lossRate: string;
  minimumOrderQty: string;
  leadTime: string;
  riskNotes: string;
  remarks: string;
};

export type SupplierQuoteDraft = {
  purchasePrice: string;
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
  finishedReferencePrice: string;
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
  unitPrice: "",
  lossRate: "",
  remarks: "",
});

export const emptyDyeing = (id = randomId()): DyeingDraft => ({
  id,
  processType: "",
  factoryId: "",
  factoryName: "",
  unitPrice: "",
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
    unitPrice: "",
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
      purchasePrice: "",
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
    finishedReferencePrice: "",
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
  return [quote.purchasePrice, quote.minimumOrderQty, quote.leadTime, quote.contactName, quote.quoteDate, quote.remarks].some(
    (value) => value.trim().length > 0,
  );
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

  if (state.finishedReferencePrice.trim() && (!Number.isFinite(Number(state.finishedReferencePrice)) || Number(state.finishedReferencePrice) < 0)) {
    errors.finishedReferencePrice = "成品参考价必须是非负数";
  }

  state.suppliers.forEach((supplier, index) => {
    const quotePath = `suppliers.${index}.initialQuote.purchasePrice`;
    if (hasQuoteDetails(supplier.initialQuote) && supplier.initialQuote.purchasePrice.trim().length === 0) {
      errors[quotePath] = "填写首次报价时，采购价不能为空";
    }

    if (
      supplier.initialQuote.purchasePrice.trim() &&
      (!Number.isFinite(Number(supplier.initialQuote.purchasePrice)) || Number(supplier.initialQuote.purchasePrice) < 0)
    ) {
      errors[quotePath] = "采购价必须是非负数";
    }

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
    finishedReferencePrice: optionalNumber(state.finishedReferencePrice),
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
            unitPrice: optionalNumber(greige.unitPrice),
            lossRate: optional(greige.lossRate),
            remarks: optional(greige.remarks),
          }))
        : [],
    dyeingFinishings:
      state.dyeingStatus === "available"
        ? state.dyeingFinishings.map((dyeing) => ({
            processType: optional(dyeing.processType),
            factoryId: optional(dyeing.factoryId),
            unitPrice: optionalNumber(dyeing.unitPrice),
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
            unitPrice: optionalNumber(process.unitPrice),
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
            purchasePrice: optionalNumber(supplier.initialQuote.purchasePrice),
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

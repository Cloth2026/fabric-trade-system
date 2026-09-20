import type { FabricDetail } from "@/lib/api/fabric-client";
import { getPricingUnitLabel, type FabricFormState, type FieldErrors } from "./create-fabric-state";

function isoDateToInputValue(iso: string | null) {
  if (!iso) return "";
  // detail.sourceDate is ISO with time; <input type="date"> only takes yyyy-MM-dd.
  return iso.slice(0, 10);
}

function decimalToInputValue(value: string | null) {
  if (!value) return "";
  const asNumber = Number(value);
  return Number.isFinite(asNumber) ? String(asNumber) : "";
}

// Edit draft reuses the FabricFormState shape so FabricBasicFields renders
// identically. code and fabricType are prefilled from the detail and locked;
// greige/dyeing/postProcesses and suppliers carry the fabric's actual values
// only to keep any future reuse consistent — they are NOT submitted.
export function createEditFabricFormState(fabric: FabricDetail): FabricFormState {
  return {
    codeSuffix: fabric.code.startsWith("SDD-") ? fabric.code.slice(4) : fabric.code,
    englishName: fabric.englishName ?? "",
    name: fabric.name ?? "",
    fabricType: fabric.fabricType,
    developmentSource: fabric.developmentSource ?? "",
    status: fabric.status ?? "",
    composition: fabric.composition ?? "",
    weight: fabric.weight ?? "",
    width: fabric.width ?? "",
    yarnCount: fabric.yarnCount ?? "",
    warpWeftDensity: fabric.warpWeftDensity ?? "",
    category: fabric.category ?? "",
    structure: fabric.structure ?? "",
    elasticity: fabric.elasticity ?? "",
    sourceContact: fabric.sourceContact ?? "",
    sourceDate: isoDateToInputValue(fabric.sourceDate),
    finishedReferencePrice: decimalToInputValue(fabric.finishedReferencePrice),
    repurchaseStatus: fabric.repurchaseStatus ?? "",
    tubeWeight: fabric.tubeWeight ?? "",
    tolerance: fabric.tolerance ?? "",
    greigeStatus: fabric.greigeStatus,
    dyeingStatus: fabric.dyeingStatus,
    postProcessStatus: fabric.postProcessStatus,
    colorFastness: fabric.colorFastness ?? "",
    pilling: fabric.pilling ?? "",
    inspectionConclusion: fabric.inspectionConclusion ?? "",
    handFeel: fabric.handFeel ?? "",
    remarks: fabric.remarks ?? "",
    usageOptionKeys: [...fabric.usageOptionKeys],
    seasonOptionKeys: [...fabric.seasonOptionKeys],
    certificationOptionKeys: [...fabric.certificationOptionKeys],
    greige: { supplierId: "", supplierName: "", code: "", name: "", composition: "", weight: "", width: "", yarnOrDensity: "", unitPrice: "", lossRate: "", remarks: "" },
    dyeingFinishing: { processType: "", factoryId: "", factoryName: "", unitPrice: "", lossRate: "", leadTime: "", cautions: "" },
    postProcesses: [],
    suppliers: [],
  };
}

export function validateEditFabricDraft(state: FabricFormState): FieldErrors {
  const errors: FieldErrors = {};
  const required: Array<[keyof FabricFormState, string]> = [
    ["name", "请填写面料名称"],
    ["developmentSource", "请选择开发来源"],
    ["composition", "请填写成分"],
    ["weight", "请填写克重"],
    ["width", "请填写门幅"],
  ];

  for (const [field, message] of required) {
    const value = state[field];
    if (typeof value === "string" && value.trim().length === 0) {
      errors[field] = message;
    }
  }

  if (state.finishedReferencePrice.trim().length > 0) {
    const price = Number(state.finishedReferencePrice);
    if (!Number.isFinite(price) || price < 0) {
      errors.finishedReferencePrice = "成品参考价必须是非负数";
    }
  }

  return errors;
}

const trimmed = (value: string) => value.trim();
const optional = (value: string) => {
  const t = value.trim();
  return t.length > 0 ? t : null;
};
const optionalNumber = (value: string) => {
  const t = value.trim();
  return t.length > 0 ? Number(t) : null;
};

export function buildEditFabricPayload(state: FabricFormState) {
  return {
    englishName: optional(state.englishName),
    name: trimmed(state.name),
    developmentSource: trimmed(state.developmentSource),
    status: optional(state.status),
    composition: trimmed(state.composition),
    weight: trimmed(state.weight),
    width: trimmed(state.width),
    yarnCount: optional(state.yarnCount),
    warpWeftDensity: optional(state.warpWeftDensity),
    category: optional(state.category),
    structure: optional(state.structure),
    elasticity: optional(state.elasticity),
    sourceContact: optional(state.sourceContact),
    sourceDate: optional(state.sourceDate) || null,
    finishedReferencePrice: optionalNumber(state.finishedReferencePrice),
    repurchaseStatus: optional(state.repurchaseStatus),
    tubeWeight: optional(state.tubeWeight),
    tolerance: optional(state.tolerance),
    colorFastness: optional(state.colorFastness),
    pilling: optional(state.pilling),
    inspectionConclusion: optional(state.inspectionConclusion),
    handFeel: optional(state.handFeel),
    remarks: optional(state.remarks),
    usageOptionKeys: state.usageOptionKeys,
    seasonOptionKeys: state.seasonOptionKeys,
    certificationOptionKeys: state.certificationOptionKeys,
  };
}

export function getEditFabricErrorMessage(error: unknown) {
  if (error && typeof error === "object" && "status" in error) {
    const status = (error as { status?: number }).status;
    if (status === 404) return "面料不存在，可能已被删除或无权访问";
    if (status === 400) return "请检查填写内容，修正标记字段后再保存";
  }
  return "保存失败，请稍后再试";
}

export function pricingUnitLabelForFabric(fabric: FabricDetail) {
  return getPricingUnitLabel(fabric.fabricType);
}
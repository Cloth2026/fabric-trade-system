import type { FabricDetail } from "@/lib/api/fabric-client";
import {
  createPostProcessDraft,
  createGreigeDraft,
  createDyeingDraft,
  getPricingUnitLabel,
  type FabricFormState,
  type FieldErrors,
} from "./create-fabric-state";

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

// Editing now covers the whole dossier: main record, the three process status
// switches and every process detail row. The draft reuses FabricFormState so
// the create and edit drawers render through the exact same field components.
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
    greigeFabrics: fabric.greigeFabrics.map((greige) => ({
      ...createGreigeDraft(greige.id),
      supplierId: greige.supplierId ?? "",
      supplierName: greige.supplier?.name ?? "",
      code: greige.code ?? "",
      name: greige.name ?? "",
      composition: greige.composition ?? "",
      weight: greige.weight ?? "",
      width: greige.width ?? "",
      yarnOrDensity: greige.yarnOrDensity ?? "",
      unitPrice: decimalToInputValue(greige.unitPrice),
      lossRate: greige.lossRate ?? "",
      remarks: greige.remarks ?? "",
    })),
    dyeingFinishings: fabric.dyeingFinishings.map((dyeing) => ({
      ...createDyeingDraft(dyeing.id),
      processType: dyeing.processType ?? "",
      factoryId: dyeing.factoryId ?? "",
      factoryName: dyeing.factory?.name ?? "",
      unitPrice: decimalToInputValue(dyeing.unitPrice),
      lossRate: dyeing.lossRate ?? "",
      leadTime: dyeing.leadTime ?? "",
      cautions: dyeing.cautions ?? "",
    })),
    postProcesses: fabric.postProcesses.map((process) => ({
      ...createPostProcessDraft(process.id),
      processType: process.processType ?? "",
      factoryId: process.factoryId ?? "",
      factoryName: process.factory?.name ?? "",
      effectDescription: process.effectDescription ?? "",
      unitPrice: decimalToInputValue(process.unitPrice),
      lossRate: process.lossRate ?? "",
      minimumOrderQty: process.minimumOrderQty ?? "",
      leadTime: process.leadTime ?? "",
      riskNotes: process.riskNotes ?? "",
      remarks: process.remarks ?? "",
    })),
    suppliers: [],
  };
}

export function validateEditFabricDraft(state: FabricFormState): FieldErrors {
  const errors: FieldErrors = {};
  const required: Array<[keyof FabricFormState, string]> = [
    ["codeSuffix", "请填写面料编号"],
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

  if (`SDD-${state.codeSuffix.trim()}`.length > 64) {
    errors.codeSuffix = "面料编号总长度不能超过64个字符";
  }

  if (state.finishedReferencePrice.trim().length > 0) {
    const price = Number(state.finishedReferencePrice);
    if (!Number.isFinite(price) || price < 0) {
      errors.finishedReferencePrice = "成品参考价必须是非负数";
    }
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

const trimmed = (value: string) => value.trim();
const optional = (value: string) => {
  const t = value.trim();
  return t.length > 0 ? t : null;
};
const optionalNumber = (value: string) => {
  const t = value.trim();
  return t.length > 0 ? Number(t) : null;
};
const onlyWhenAvailable = (status: string) => status === "available";

export function buildEditFabricPayload(state: FabricFormState, baseCode: string) {
  const nextCode = `SDD-${trimmed(state.codeSuffix)}`;

  return {
    code: nextCode === baseCode ? undefined : nextCode,
    fabricType: state.fabricType,
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
    greigeStatus: state.greigeStatus,
    dyeingStatus: state.dyeingStatus,
    postProcessStatus: state.postProcessStatus,
    greigeFabrics: onlyWhenAvailable(state.greigeStatus)
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
    dyeingFinishings: onlyWhenAvailable(state.dyeingStatus)
      ? state.dyeingFinishings.map((dyeing) => ({
          processType: optional(dyeing.processType),
          factoryId: optional(dyeing.factoryId),
          unitPrice: optionalNumber(dyeing.unitPrice),
          lossRate: optional(dyeing.lossRate),
          leadTime: optional(dyeing.leadTime),
          cautions: optional(dyeing.cautions),
        }))
      : [],
    postProcesses: onlyWhenAvailable(state.postProcessStatus)
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
  };
}

export function getEditFabricErrorMessage(error: unknown) {
  if (error && typeof error === "object" && "status" in error) {
    const status = (error as { status?: number }).status;
    if (status === 404) return "面料不存在，可能已被删除或无权访问";
    if (status === 409) {
      const message = (error as { message?: string }).message ?? "";
      if (message.includes("面料类型")) return message;
      return "该面料编号已存在";
    }
    if (status === 400) return "请检查填写内容，修正标记字段后再保存";
  }
  return "保存失败，请稍后再试";
}

export function fabricHasPurchaseQuotes(fabric: FabricDetail) {
  return fabric.supplierSources.some((source) => source.quotes.length > 0);
}

export function pricingUnitLabelForFabric(fabric: FabricDetail) {
  return getPricingUnitLabel(fabric.fabricType);
}

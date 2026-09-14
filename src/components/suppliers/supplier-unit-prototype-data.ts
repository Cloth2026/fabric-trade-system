import type { SupplierUnitPayload, SupplierUnitRecord } from "@/lib/api/supplier-client";
import {
  supplierUnitBusinessTypes as supplierUnitBusinessTypeKeys,
  supplierUnitForms as supplierUnitFormKeys,
} from "@/server/suppliers/constants";
import type {
  SupplierUnitBusinessType,
  SupplierUnitForm,
  SupplierUnitStatus,
} from "@/server/suppliers/constants";

export type {
  SupplierUnitBusinessType,
  SupplierUnitForm,
  SupplierUnitStatus,
} from "@/server/suppliers/constants";
export type SupplierUnitPrototype = SupplierUnitRecord;

export const supplierUnitFormLabels: Record<SupplierUnitForm, string> = {
  branch: "分厂",
  business_unit: "事业部",
  workshop: "车间",
  department: "部门",
  production_line: "生产线",
  outsourced_site: "外协点",
  other: "其他",
};

export const supplierUnitBusinessTypeLabels: Record<SupplierUnitBusinessType, string> = {
  greige: "坯布",
  weaving: "织造",
  dyeing: "染色",
  printing: "印花",
  finishing: "后整理",
  coating: "涂层",
  laminating: "复合",
  inspection: "检验",
  other: "其他",
};

export const supplierUnitStatusLabels: Record<SupplierUnitStatus, string> = {
  active: "启用",
  paused: "暂停合作",
};

export const supplierUnitForms = supplierUnitFormKeys;
export const supplierUnitBusinessTypes = supplierUnitBusinessTypeKeys;

export type SupplierUnitFormState = {
  name: string;
  unitForm: SupplierUnitForm;
  businessTypes: SupplierUnitBusinessType[];
  status: SupplierUnitStatus;
  primaryBusiness: string;
  primaryProducts: string;
  materialScope: string;
  processCapabilities: string;
  restrictions: string;
  defaultMoq: string;
  regularLeadTime: string;
  peakLeadTime: string;
  supportsSampling: boolean;
  managerName: string;
  phone: string;
  socialContact: string;
  qualityFeatures: string;
  riskNote: string;
  remarks: string;
};

export function createEmptySupplierUnitForm(): SupplierUnitFormState {
  return {
    name: "",
    unitForm: "other",
    businessTypes: [],
    status: "active",
    primaryBusiness: "",
    primaryProducts: "",
    materialScope: "",
    processCapabilities: "",
    restrictions: "",
    defaultMoq: "",
    regularLeadTime: "",
    peakLeadTime: "",
    supportsSampling: true,
    managerName: "",
    phone: "",
    socialContact: "",
    qualityFeatures: "",
    riskNote: "",
    remarks: "",
  };
}

export function supplierUnitToForm(unit: SupplierUnitRecord): SupplierUnitFormState {
  return {
    name: unit.name,
    unitForm: unit.unitForm,
    businessTypes: [...unit.businessTypes],
    status: unit.status,
    primaryBusiness: unit.primaryBusiness ?? "",
    primaryProducts: unit.primaryProducts ?? "",
    materialScope: unit.materialScope ?? "",
    processCapabilities: unit.processCapabilities ?? "",
    restrictions: unit.restrictions ?? "",
    defaultMoq: unit.defaultMoq ?? "",
    regularLeadTime: unit.regularLeadTime ?? "",
    peakLeadTime: unit.peakLeadTime ?? "",
    supportsSampling: unit.supportsSampling,
    managerName: unit.managerName ?? "",
    phone: unit.phone ?? "",
    socialContact: unit.socialContact ?? "",
    qualityFeatures: unit.qualityFeatures ?? "",
    riskNote: unit.riskNote ?? "",
    remarks: unit.remarks ?? "",
  };
}

function optionalValue(value: string) {
  return value.trim() || null;
}

export function supplierUnitFormToPayload(state: SupplierUnitFormState): SupplierUnitPayload {
  return {
    name: state.name.trim(),
    unitForm: state.unitForm,
    businessTypes: [...state.businessTypes],
    status: state.status,
    primaryBusiness: optionalValue(state.primaryBusiness),
    primaryProducts: optionalValue(state.primaryProducts),
    materialScope: optionalValue(state.materialScope),
    processCapabilities: optionalValue(state.processCapabilities),
    restrictions: optionalValue(state.restrictions),
    defaultMoq: optionalValue(state.defaultMoq),
    regularLeadTime: optionalValue(state.regularLeadTime),
    peakLeadTime: optionalValue(state.peakLeadTime),
    supportsSampling: state.supportsSampling,
    managerName: optionalValue(state.managerName),
    phone: optionalValue(state.phone),
    socialContact: optionalValue(state.socialContact),
    qualityFeatures: optionalValue(state.qualityFeatures),
    riskNote: optionalValue(state.riskNote),
    remarks: optionalValue(state.remarks),
  };
}

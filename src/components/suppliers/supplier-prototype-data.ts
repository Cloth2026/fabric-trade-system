import type { SupplierPayload, SupplierRecord } from "@/lib/api/supplier-client";
import {
  supplierRoles as supplierRoleKeys,
  supplierStatuses,
} from "@/server/suppliers/constants";
import type { SupplierRole, SupplierStatus } from "@/server/suppliers/constants";

export type { SupplierRole, SupplierStatus } from "@/server/suppliers/constants";
export type SupplierPrototype = SupplierRecord;

export const supplierRoleLabels: Record<SupplierRole, string> = {
  fabric_supplier: "面料供应商",
  greige_supplier: "坯布供应商",
  weaving_factory: "织厂",
  dyeing_factory: "染厂",
  printing_factory: "印花厂",
  finishing_factory: "后整理厂",
  market_stall: "市场档口",
  trading_company: "贸易商",
};

export const supplierStatusLabels: Record<SupplierStatus, string> = {
  active: "启用",
  inactive: "停用",
};

export const supplierRoles = supplierRoleKeys;
export const supplierStatusKeys = supplierStatuses;

export type SupplierFormState = {
  name: string;
  roles: SupplierRole[];
  status: SupplierStatus;
  country: string;
  city: string;
  address: string;
  contactName: string;
  phone: string;
  email: string;
  socialContact: string;
  specialties: string;
  defaultLeadTime: string;
  defaultMoq: string;
  paymentTerms: string;
  cooperationComment: string;
  riskNote: string;
  remarks: string;
};

export function createEmptySupplierForm(): SupplierFormState {
  return {
    name: "",
    roles: [],
    status: "active",
    country: "中国",
    city: "",
    address: "",
    contactName: "",
    phone: "",
    email: "",
    socialContact: "",
    specialties: "",
    defaultLeadTime: "",
    defaultMoq: "",
    paymentTerms: "",
    cooperationComment: "",
    riskNote: "",
    remarks: "",
  };
}

export function supplierToForm(supplier: SupplierRecord): SupplierFormState {
  return {
    name: supplier.name,
    roles: [...supplier.roles],
    status: supplier.status,
    country: supplier.country ?? "",
    city: supplier.city ?? "",
    address: supplier.address ?? "",
    contactName: supplier.contactName ?? "",
    phone: supplier.phone ?? "",
    email: supplier.email ?? "",
    socialContact: supplier.socialContact ?? "",
    specialties: supplier.specialties ?? "",
    defaultLeadTime: supplier.defaultLeadTime ?? "",
    defaultMoq: supplier.defaultMoq ?? "",
    paymentTerms: supplier.paymentTerms ?? "",
    cooperationComment: supplier.cooperationComment ?? "",
    riskNote: supplier.riskNote ?? "",
    remarks: supplier.remarks ?? "",
  };
}

function optionalValue(value: string) {
  return value.trim() || null;
}

export function supplierFormToPayload(state: SupplierFormState): SupplierPayload {
  return {
    name: state.name.trim(),
    roles: [...state.roles],
    status: state.status,
    country: optionalValue(state.country),
    city: optionalValue(state.city),
    address: optionalValue(state.address),
    contactName: optionalValue(state.contactName),
    phone: optionalValue(state.phone),
    email: optionalValue(state.email),
    socialContact: optionalValue(state.socialContact),
    specialties: optionalValue(state.specialties),
    defaultLeadTime: optionalValue(state.defaultLeadTime),
    defaultMoq: optionalValue(state.defaultMoq),
    paymentTerms: optionalValue(state.paymentTerms),
    cooperationComment: optionalValue(state.cooperationComment),
    riskNote: optionalValue(state.riskNote),
    remarks: optionalValue(state.remarks),
  };
}

export function calculateSupplierCompleteness(supplier: SupplierRecord) {
  const values = [
    supplier.name,
    supplier.roles.length ? "roles" : "",
    supplier.country,
    supplier.city,
    supplier.address,
    supplier.contactName,
    supplier.phone,
    supplier.specialties,
    supplier.defaultLeadTime,
    supplier.defaultMoq,
    supplier.paymentTerms,
  ];
  return Math.round((values.filter(Boolean).length / values.length) * 100);
}

export function formatSupplierDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

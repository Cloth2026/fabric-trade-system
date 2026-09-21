import type { CustomerLevel, CustomerStatus, CustomerType } from "@/server/customers/constants";
import { customerLevels, customerStatuses, customerTypes } from "@/server/customers/constants";
import type { CustomerDetailRecord, CustomerPayload, CustomerRecord } from "@/lib/api/customer-client";

export const customerTypeLabels: Record<CustomerType, string> = {
  brand: "品牌客户",
  garment_factory: "成衣工厂",
  trading_company: "贸易公司",
  wholesaler: "批发商",
  agent: "代理商",
  designer_studio: "设计工作室",
  other: "其他",
};

export const customerLevelLabels: Record<CustomerLevel, string> = {
  strategic: "战略客户",
  a: "A 级",
  b: "B 级",
  c: "C 级",
};

export const customerStatusLabels: Record<CustomerStatus, string> = {
  active: "合作中",
  inactive: "已停用",
};

export const customerLevelOptions = customerLevels.map((value) => ({ value, label: customerLevelLabels[value] }));
export const customerTypeOptions = customerTypes.map((value) => ({ value, label: customerTypeLabels[value] }));
export const customerStatusOptions = customerStatuses.map((value) => ({ value, label: customerStatusLabels[value] }));

export type CustomerFormState = {
  name: string;
  type: CustomerType | "";
  level: CustomerLevel | "";
  status: CustomerStatus;
  country: string;
  city: string;
  address: string;
  contactName: string;
  phone: string;
  email: string;
  socialContact: string;
  mainProducts: string;
  cooperationBrands: string;
  paymentTerms: string;
  defaultCurrency: string;
  remarks: string;
};

export function createEmptyCustomerFormState(): CustomerFormState {
  return {
    name: "",
    type: "",
    level: "",
    status: "active",
    country: "",
    city: "",
    address: "",
    contactName: "",
    phone: "",
    email: "",
    socialContact: "",
    mainProducts: "",
    cooperationBrands: "",
    paymentTerms: "",
    defaultCurrency: "",
    remarks: "",
  };
}

export function createCustomerFormState(customer: CustomerRecord | CustomerDetailRecord): CustomerFormState {
  return {
    name: customer.name,
    type: customer.type ?? "",
    level: customer.level ?? "",
    status: customer.status,
    country: customer.country ?? "",
    city: customer.city ?? "",
    address: customer.address ?? "",
    contactName: customer.contactName ?? "",
    phone: customer.phone ?? "",
    email: customer.email ?? "",
    socialContact: customer.socialContact ?? "",
    mainProducts: customer.mainProducts ?? "",
    cooperationBrands: customer.cooperationBrands ?? "",
    paymentTerms: customer.paymentTerms ?? "",
    defaultCurrency: customer.defaultCurrency ?? "",
    remarks: customer.remarks ?? "",
  };
}

const optional = (value: string) => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export function validateCustomerForm(state: CustomerFormState) {
  const errors: Partial<Record<keyof CustomerFormState, string>> = {};
  if (state.name.trim().length === 0) errors.name = "请填写客户名称";
  if (state.email.trim().length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email.trim())) {
    errors.email = "邮箱格式不正确";
  }
  if (state.defaultCurrency.trim().length > 0 && state.defaultCurrency.trim().length !== 3) {
    errors.defaultCurrency = "币种请使用 3 位代码，如 CNY";
  }
  return errors;
}

export function customerFormToPayload(state: CustomerFormState): CustomerPayload {
  return {
    name: state.name.trim(),
    type: (state.type || null) as CustomerType | null,
    level: (state.level || null) as CustomerLevel | null,
    status: state.status,
    country: optional(state.country),
    city: optional(state.city),
    address: optional(state.address),
    contactName: optional(state.contactName),
    phone: optional(state.phone),
    email: optional(state.email),
    socialContact: optional(state.socialContact),
    mainProducts: optional(state.mainProducts),
    cooperationBrands: optional(state.cooperationBrands),
    paymentTerms: optional(state.paymentTerms),
    defaultCurrency: state.defaultCurrency.trim() ? state.defaultCurrency.trim().toUpperCase() : null,
    remarks: optional(state.remarks),
  };
}

export function formatCustomerDate(iso: string | null | undefined) {
  if (!iso) return "暂无";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "暂无";
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;
}

export function calculateCustomerCompleteness(customer: CustomerRecord) {
  const filled = [
    customer.type,
    customer.level,
    customer.contactName ?? customer.phone,
    customer.city ?? customer.country,
    customer.mainProducts,
    customer.paymentTerms,
  ].filter((value) => Boolean(value && String(value).trim().length > 0)).length;

  return Math.round((filled / 6) * 100);
}

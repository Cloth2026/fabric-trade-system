import { z } from "zod";
import {
  supplierRoles,
  supplierStatuses,
  supplierUnitBusinessTypes,
  supplierUnitForms,
  supplierUnitStatuses,
} from "./constants";

const requiredName = z.string().trim().min(1).max(200);
const optionalText = (maxLength = 2_000) =>
  z.preprocess(
    (value) => {
      if (typeof value !== "string") return value;
      const trimmed = value.trim();
      return trimmed === "" ? null : trimmed;
    },
    z.string().max(maxLength).nullable().optional(),
  );
const optionalEmail = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  },
  z.email().max(320).nullable().optional(),
);

const uniqueEnumArray = <T extends readonly [string, ...string[]]>(values: T) =>
  z
    .array(z.enum(values))
    .min(1)
    .transform((items) => [...new Set(items)]);

const supplierFields = {
  name: requiredName,
  roles: uniqueEnumArray(supplierRoles),
  status: z.enum(supplierStatuses),
  country: optionalText(200),
  city: optionalText(200),
  address: optionalText(1_000),
  contactName: optionalText(200),
  phone: optionalText(100),
  email: optionalEmail,
  socialContact: optionalText(300),
  specialties: optionalText(),
  defaultLeadTime: optionalText(500),
  defaultMoq: optionalText(500),
  paymentTerms: optionalText(1_000),
  cooperationComment: optionalText(2_000),
  riskNote: optionalText(2_000),
  remarks: optionalText(5_000),
};

export const createSupplierSchema = z
  .object({
    ...supplierFields,
    status: supplierFields.status.default("active"),
  })
  .strict();

export const updateSupplierSchema = z
  .object(supplierFields)
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, { message: "At least one field is required." });

const supplierUnitFields = {
  name: requiredName,
  unitForm: z.enum(supplierUnitForms),
  businessTypes: uniqueEnumArray(supplierUnitBusinessTypes),
  status: z.enum(supplierUnitStatuses),
  primaryBusiness: optionalText(),
  primaryProducts: optionalText(),
  materialScope: optionalText(),
  processCapabilities: optionalText(),
  restrictions: optionalText(2_000),
  defaultMoq: optionalText(500),
  regularLeadTime: optionalText(500),
  peakLeadTime: optionalText(500),
  supportsSampling: z.boolean(),
  managerName: optionalText(200),
  phone: optionalText(100),
  socialContact: optionalText(300),
  qualityFeatures: optionalText(2_000),
  riskNote: optionalText(2_000),
  remarks: optionalText(5_000),
};

export const createSupplierUnitSchema = z
  .object({
    ...supplierUnitFields,
    status: supplierUnitFields.status.default("active"),
    supportsSampling: supplierUnitFields.supportsSampling.default(true),
  })
  .strict();

export const updateSupplierUnitSchema = z
  .object(supplierUnitFields)
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, { message: "At least one field is required." });

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;
export type CreateSupplierUnitInput = z.infer<typeof createSupplierUnitSchema>;
export type UpdateSupplierUnitInput = z.infer<typeof updateSupplierUnitSchema>;

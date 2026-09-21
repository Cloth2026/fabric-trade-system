import { z } from "zod";
import { customerContactStatuses, customerLevels, customerStatuses, customerTypes } from "./constants";

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
const optionalEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z.preprocess(
    (value) => {
      if (typeof value !== "string") return value;
      return value.trim() === "" ? null : value.trim();
    },
    z.enum(values).nullable().optional(),
  );
const optionalCurrency = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed.toUpperCase();
  },
  z.string().length(3).nullable().optional(),
);

const customerFields = {
  name: requiredName,
  type: optionalEnum(customerTypes),
  level: optionalEnum(customerLevels),
  status: z.enum(customerStatuses),
  country: optionalText(200),
  city: optionalText(200),
  address: optionalText(1_000),
  contactName: optionalText(200),
  phone: optionalText(100),
  email: optionalEmail,
  socialContact: optionalText(300),
  mainProducts: optionalText(),
  cooperationBrands: optionalText(),
  paymentTerms: optionalText(1_000),
  defaultCurrency: optionalCurrency,
  remarks: optionalText(5_000),
};

export const createCustomerSchema = z
  .object({
    ...customerFields,
    status: customerFields.status.default("active"),
  })
  .strict();

export const updateCustomerSchema = z
  .object(customerFields)
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, { message: "At least one field is required." });

const customerContactFields = {
  name: requiredName,
  title: optionalText(200),
  department: optionalText(200),
  phone: optionalText(100),
  email: optionalEmail,
  socialContact: optionalText(300),
  isPrimary: z.boolean(),
  status: z.enum(customerContactStatuses),
  remarks: optionalText(5_000),
};

export const createCustomerContactSchema = z
  .object({
    ...customerContactFields,
    isPrimary: customerContactFields.isPrimary.default(false),
    status: customerContactFields.status.default("active"),
  })
  .strict();

export const updateCustomerContactSchema = z
  .object(customerContactFields)
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, { message: "At least one field is required." });

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type CreateCustomerContactInput = z.infer<typeof createCustomerContactSchema>;
export type UpdateCustomerContactInput = z.infer<typeof updateCustomerContactSchema>;

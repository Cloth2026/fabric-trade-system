import { z } from "zod";
import { customerQuoteCurrencies, customerQuoteStatuses } from "./constants";

const emptyStringToNull = (value: unknown) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
};

const optionalText = (maxLength = 2_000) =>
  z.preprocess(emptyStringToNull, z.string().max(maxLength).nullable().optional());
const requiredId = z.string().trim().min(1);
const optionalId = z.preprocess(emptyStringToNull, z.string().trim().min(1).nullable().optional());
const optionalDate = z.preprocess(emptyStringToNull, z.coerce.date().nullable().optional());

// Quantity is optional: some quotes only carry a unit price.
const optionalQuantity = z.preprocess(
  emptyStringToNull,
  z.coerce.number().positive().max(1_000_000).nullable().optional(),
);
const requiredPrice = z.coerce.number().positive().max(1_000_000);
const optionalCost = z.preprocess(
  emptyStringToNull,
  z.coerce.number().min(0).max(1_000_000).nullable().optional(),
);
const optionalRate = z.preprocess(
  emptyStringToNull,
  z.coerce.number().min(0).max(1).nullable().optional(),
);
const optionalExchangeRate = z.preprocess(
  emptyStringToNull,
  z.coerce.number().positive().max(1_000).nullable().optional(),
);

export const customerQuoteItemInputSchema = z
  .object({
    fabricId: requiredId,
    // Optional link to the purchase quote; only used to seed costPrice.
    fabricSupplierQuoteId: optionalId,
    // Quoting only a unit price is valid, so quantity may be omitted.
    quantity: optionalQuantity,
    minimumOrderQty: optionalText(120),
    unitPrice: requiredPrice,
    // Cost stays editable on purpose: the operator may override the snapshot.
    costPrice: optionalCost,
    taxRate: optionalRate,
    leadTime: optionalText(120),
    colorOrRemark: optionalText(300),
    remark: optionalText(2_000),
  })
  .strict();

const customerQuoteFields = {
  customerId: requiredId,
  contactId: optionalId,
  currency: z.enum(customerQuoteCurrencies).default("CNY"),
  exchangeRate: optionalExchangeRate,
  quoteDate: optionalDate,
  validUntil: optionalDate,
  priceTerms: optionalText(120),
  deliveryTerms: optionalText(120),
  leadTime: optionalText(120),
  paymentTerms: optionalText(200),
  taxRate: optionalRate,
  remark: optionalText(2_000),
};

export const createCustomerQuoteSchema = z
  .object({
    ...customerQuoteFields,
    customerId: requiredId,
    items: z.array(customerQuoteItemInputSchema).min(1).max(50),
  })
  .strict();

export const updateCustomerQuoteSchema = z
  .object({
    customerId: requiredId.optional(),
    contactId: optionalId,
    currency: z.enum(customerQuoteCurrencies).optional(),
    exchangeRate: optionalExchangeRate,
    quoteDate: optionalDate,
    validUntil: optionalDate,
    priceTerms: optionalText(120),
    deliveryTerms: optionalText(120),
    leadTime: optionalText(120),
    paymentTerms: optionalText(200),
    taxRate: optionalRate,
    remark: optionalText(2_000),
    // Replacing the whole item list keeps a draft consistent: there is no
    // per-item patch endpoint, and the quote is only editable while draft.
    items: z.array(customerQuoteItemInputSchema).min(1).max(50).optional(),
  })
  .strict();

export const updateCustomerQuoteStatusSchema = z
  .object({
    status: z.enum(customerQuoteStatuses),
  })
  .strict();

export type CreateCustomerQuoteInput = z.infer<typeof createCustomerQuoteSchema>;
export type UpdateCustomerQuoteInput = z.infer<typeof updateCustomerQuoteSchema>;

import { z } from "zod";
import { salesOrderCurrencies, salesOrderStatuses } from "./constants";

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

// Orders commit to a quantity, unlike quotes which may price a unit only.
const requiredQuantity = z.preprocess(emptyStringToNull, z.coerce.number().positive().max(1_000_000));
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

export const salesOrderItemInputSchema = z
  .object({
    // Only meaningful when updating: it lets the service keep the delivered
    // quantity already booked against that line.
    id: optionalId,
    // Traceability back to the quote line; kept when the line is edited.
    sourceQuoteItemId: optionalId,
    fabricId: requiredId,
    // Purchase side kept for reference. Neither is written back to.
    fabricSupplierId: optionalId,
    fabricSupplierQuoteId: optionalId,
    quantity: requiredQuantity,
    unitPrice: requiredPrice,
    // Cost stays editable on purpose: the operator may override the snapshot.
    costPrice: optionalCost,
    taxRate: optionalRate,
    leadTime: optionalText(120),
    colorOrRemark: optionalText(300),
    remark: optionalText(2_000),
  })
  .strict();

const salesOrderFields = {
  customerId: requiredId,
  contactId: optionalId,
  currency: z.enum(salesOrderCurrencies).default("CNY"),
  exchangeRate: optionalExchangeRate,
  orderDate: optionalDate,
  requestedDeliveryDate: optionalDate,
  priceTerms: optionalText(120),
  deliveryTerms: optionalText(120),
  paymentTerms: optionalText(200),
  taxRate: optionalRate,
  receiverName: optionalText(120),
  receiverPhone: optionalText(60),
  receiverAddress: optionalText(300),
  remark: optionalText(2_000),
};

export const createSalesOrderSchema = z
  .object({
    ...salesOrderFields,
    items: z.array(salesOrderItemInputSchema).min(1).max(50),
  })
  .strict();

export const updateSalesOrderSchema = z
  .object({
    customerId: requiredId.optional(),
    contactId: optionalId,
    currency: z.enum(salesOrderCurrencies).optional(),
    exchangeRate: optionalExchangeRate,
    orderDate: optionalDate,
    requestedDeliveryDate: optionalDate,
    priceTerms: optionalText(120),
    deliveryTerms: optionalText(120),
    paymentTerms: optionalText(200),
    taxRate: optionalRate,
    receiverName: optionalText(120),
    receiverPhone: optionalText(60),
    receiverAddress: optionalText(300),
    remark: optionalText(2_000),
    // Replacing the whole item list keeps the document consistent; there is no
    // per-item patch endpoint.
    items: z.array(salesOrderItemInputSchema).min(1).max(50).optional(),
  })
  .strict();

export const createSalesOrderFromQuoteSchema = z
  .object({
    quoteId: requiredId,
  })
  .strict();

export const updateSalesOrderStatusSchema = z
  .object({
    status: z.enum(salesOrderStatuses),
    // Required when cancelling, so the reason is always on record.
    cancelReason: optionalText(500),
  })
  .strict();

export const updateSalesOrderDeliverySchema = z
  .object({
    items: z
      .array(
        z
          .object({
            id: requiredId,
            deliveredQuantity: z.preprocess(
              emptyStringToNull,
              z.coerce.number().min(0).max(1_000_000),
            ),
          })
          .strict(),
      )
      .min(1)
      .max(50),
  })
  .strict();

export type CreateSalesOrderInput = z.infer<typeof createSalesOrderSchema>;
export type UpdateSalesOrderInput = z.infer<typeof updateSalesOrderSchema>;

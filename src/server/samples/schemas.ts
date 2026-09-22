import { z } from "zod";
import { sampleFeedbackResults, sampleRequestStatuses } from "./constants";

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
const optionalEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z.preprocess(emptyStringToNull, z.enum(values).nullable().optional());
const optionalQuantity = z.preprocess(emptyStringToNull, z.coerce.number().positive().max(1_000_000).nullable().optional());

export const sampleRequestItemInputSchema = z
  .object({
    fabricId: requiredId,
    quantity: optionalQuantity,
    colorOrRemark: optionalText(300),
  })
  .strict();

const sampleRequestFields = {
  customerId: requiredId,
  contactId: optionalId,
  status: optionalEnum(sampleRequestStatuses),
  sentAt: optionalDate,
  expectedReturnAt: optionalDate,
  returnedAt: optionalDate,
  carrier: optionalText(120),
  trackingNo: optionalText(120),
  receiverName: optionalText(120),
  receiverPhone: optionalText(60),
  receiverAddress: optionalText(300),
  purpose: optionalText(200),
  remark: optionalText(2_000),
};

// A sample request always ships at least one fabric; items cannot be added or
// removed afterwards through the update endpoint (only feedback is editable
// per item), which keeps historical shipments auditable.
export const createSampleRequestSchema = z
  .object({
    ...sampleRequestFields,
    customerId: requiredId,
    items: z.array(sampleRequestItemInputSchema).min(1).max(50),
  })
  .strict();

export const updateSampleRequestSchema = z.object(sampleRequestFields).partial().strict();

// Moving a request along the pipeline is where the logistics details get
// filled in (carrier / tracking no when shipping, return date when the
// samples come back), so those travel with the status transition.
export const updateSampleRequestStatusSchema = z
  .object({
    status: z.enum(sampleRequestStatuses),
    sentAt: optionalDate,
    returnedAt: optionalDate,
    carrier: optionalText(120),
    trackingNo: optionalText(120),
  })
  .strict();

export const sampleItemFeedbackSchema = z
  .object({
    feedback: optionalText(2_000),
    feedbackResult: optionalEnum(sampleFeedbackResults),
  })
  .strict();

export type CreateSampleRequestInput = z.infer<typeof createSampleRequestSchema>;
export type UpdateSampleRequestInput = z.infer<typeof updateSampleRequestSchema>;
export type SampleItemFeedbackInput = z.infer<typeof sampleItemFeedbackSchema>;

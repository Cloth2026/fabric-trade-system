import { z } from "zod";
import type { Prisma } from "../generated/prisma/client";
import { prisma } from "../lib/prisma";
import { assertEnabledConfigKeys, configGroups } from "./config-options";
import { AppError } from "./errors";
import { getServerTenant } from "./tenant";
import { sampleFeedbackResults, sampleRequestStatuses } from "./samples/constants";
import {
  createSampleRequestSchema,
  sampleItemFeedbackSchema,
  updateSampleRequestSchema,
  updateSampleRequestStatusSchema,
} from "./samples/schemas";

type SampleSearchOptions = {
  q?: string | null;
  status?: string | null;
  customerId?: string | null;
  fabricId?: string | null;
  limit?: number | string | null;
};

const fabricBriefSelect = {
  id: true,
  code: true,
  name: true,
  englishName: true,
  fabricType: true,
  pricingUnit: true,
  composition: true,
} as const;

const customerBriefSelect = { id: true, name: true, status: true, city: true } as const;
const contactBriefSelect = { id: true, name: true, title: true, phone: true } as const;

const sampleItemSelect = {
  id: true,
  requestId: true,
  fabricId: true,
  unit: true,
  quantity: true,
  colorOrRemark: true,
  feedback: true,
  feedbackResult: true,
  feedbackAt: true,
  createdAt: true,
  updatedAt: true,
  fabric: { select: fabricBriefSelect },
} as const;

const sampleListSelect = {
  id: true,
  code: true,
  customerId: true,
  contactId: true,
  status: true,
  sentAt: true,
  expectedReturnAt: true,
  returnedAt: true,
  carrier: true,
  trackingNo: true,
  receiverName: true,
  receiverPhone: true,
  purpose: true,
  remark: true,
  createdAt: true,
  updatedAt: true,
  customer: { select: customerBriefSelect },
  contact: { select: contactBriefSelect },
  _count: { select: { items: true } },
} as const;

const sampleDetailSelect = {
  ...sampleListSelect,
  receiverAddress: true,
  items: { select: sampleItemSelect, orderBy: { createdAt: "asc" as const } },
};

function parsePayload<T>(schema: z.ZodType<T>, input: unknown, message: string) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    throw new AppError(400, message, z.treeifyError(parsed.error));
  }
  return parsed.data;
}

export function normalizeSampleLimit(limit: number | string | null | undefined) {
  if (limit === null || limit === undefined || limit === "") return 20;
  const numericLimit = typeof limit === "number" ? limit : Number(limit);
  if (!Number.isFinite(numericLimit)) return 20;
  return Math.min(Math.max(Math.trunc(numericLimit), 1), 50);
}

function deriveUnit(fabricType: string) {
  return fabricType === "knitted" ? "kg" : "meter";
}

function parseShanghaiDateParts(date = new Date()) {
  // Sample codes follow the operator's business day in Asia/Shanghai.
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const read = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${read("year")}${read("month")}${read("day")}`;
}

async function generateSampleCode(tx: Prisma.TransactionClient, tenantId: string) {
  const dayPart = parseShanghaiDateParts();
  const prefix = `SMP-${dayPart}-`;

  // Retry a few times so concurrent inserts cannot collide on the unique code.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const sameDayCount = await tx.sampleRequest.count({
      where: { tenantId, code: { startsWith: prefix } },
    });
    const candidate = `${prefix}${String(sameDayCount + 1 + attempt).padStart(3, "0")}`;
    const existing = await tx.sampleRequest.findUnique({
      where: { tenantId_code: { tenantId, code: candidate } },
      select: { id: true },
    });
    if (!existing) return candidate;
  }

  throw new AppError(409, "Could not allocate a sample request code. Please retry.");
}

export async function searchSampleRequests(options: SampleSearchOptions = {}) {
  const tenant = await getServerTenant();
  const query = options.q?.trim();
  const status =
    options.status && options.status !== "all"
      ? parsePayload(z.enum(sampleRequestStatuses), options.status, "Invalid sample status.")
      : undefined;

  return prisma.sampleRequest.findMany({
    where: {
      tenantId: tenant.id,
      ...(status ? { status } : {}),
      ...(options.customerId ? { customerId: options.customerId } : {}),
      ...(options.fabricId ? { items: { some: { fabricId: options.fabricId } } } : {}),
      ...(query
        ? {
            OR: [
              { code: { contains: query, mode: "insensitive" as const } },
              { trackingNo: { contains: query, mode: "insensitive" as const } },
              { purpose: { contains: query, mode: "insensitive" as const } },
              { remark: { contains: query, mode: "insensitive" as const } },
              { customer: { name: { contains: query, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    },
    select: sampleListSelect,
    orderBy: [{ createdAt: "desc" as const }],
    take: normalizeSampleLimit(options.limit),
  });
}

export async function getSampleRequest(id: string) {
  const tenant = await getServerTenant();
  const request = await prisma.sampleRequest.findFirst({
    where: { id, tenantId: tenant.id },
    select: sampleDetailSelect,
  });
  if (!request) throw new AppError(404, "Sample request not found.");
  return request;
}

export async function createSampleRequest(input: unknown) {
  const data = parsePayload(createSampleRequestSchema, input, "Invalid sample request payload.");
  const tenant = await getServerTenant();

  return prisma.$transaction(async (tx) => {
    const customer = await tx.customer.findFirst({
      where: { id: data.customerId, tenantId: tenant.id },
      select: { id: true, status: true },
    });
    if (!customer) throw new AppError(404, "Customer not found.");
    if (customer.status !== "active") {
      throw new AppError(409, "Inactive customers cannot receive samples.");
    }

    let contactId: string | null = null;
    if (data.contactId) {
      const contact = await tx.customerContact.findFirst({
        where: { id: data.contactId, tenantId: tenant.id, customerId: customer.id },
        select: { id: true },
      });
      if (!contact) throw new AppError(404, "Customer contact not found.");
      contactId = contact.id;
    }

    const fabricIds = [...new Set(data.items.map((item) => item.fabricId))];
    const fabrics = await tx.fabric.findMany({
      where: { id: { in: fabricIds }, tenantId: tenant.id },
      select: { id: true, fabricType: true, pricingUnit: true },
    });
    if (fabrics.length !== fabricIds.length) {
      throw new AppError(404, "One or more fabrics were not found.");
    }
    const fabricMap = new Map(fabrics.map((fabric) => [fabric.id, fabric]));

    const status = data.status ?? "preparing";
    await assertEnabledConfigKeys(tx, tenant.id, [
      { group: configGroups.sampleRequestStatus, keys: [status], label: "status" },
    ]);

    const code = await generateSampleCode(tx, tenant.id);

    const request = await tx.sampleRequest.create({
      data: {
        tenantId: tenant.id,
        code,
        customerId: customer.id,
        contactId,
        status,
        sentAt: data.sentAt ?? null,
        expectedReturnAt: data.expectedReturnAt ?? null,
        returnedAt: data.returnedAt ?? null,
        carrier: data.carrier ?? null,
        trackingNo: data.trackingNo ?? null,
        receiverName: data.receiverName ?? null,
        receiverPhone: data.receiverPhone ?? null,
        receiverAddress: data.receiverAddress ?? null,
        purpose: data.purpose ?? null,
        remark: data.remark ?? null,
        items: {
          create: data.items.map((item) => ({
            tenantId: tenant.id,
            fabricId: item.fabricId,
            // Snapshot the unit so later fabric edits never rewrite history.
            unit: deriveUnit(fabricMap.get(item.fabricId)?.fabricType ?? "woven"),
            quantity: item.quantity ?? null,
            colorOrRemark: item.colorOrRemark ?? null,
          })),
        },
      },
      select: sampleDetailSelect,
    });

    await tx.operationLog.create({
      data: {
        tenantId: tenant.id,
        module: "sample_management",
        action: "create",
        targetType: "SampleRequest",
        targetId: request.id,
        detail: { code: request.code, customerId: customer.id, itemCount: data.items.length },
      },
    });

    return request;
  });
}

export async function updateSampleRequest(id: string, input: unknown) {
  const data = parsePayload(updateSampleRequestSchema, input, "Invalid sample request payload.");
  const tenant = await getServerTenant();

  return prisma.$transaction(async (tx) => {
    const existing = await tx.sampleRequest.findFirst({
      where: { id, tenantId: tenant.id },
      select: { id: true, code: true, customerId: true, status: true },
    });
    if (!existing) throw new AppError(404, "Sample request not found.");

    if (data.contactId) {
      const contact = await tx.customerContact.findFirst({
        where: { id: data.contactId, tenantId: tenant.id, customerId: existing.customerId },
        select: { id: true },
      });
      if (!contact) throw new AppError(404, "Customer contact not found.");
    }

    if (data.status) {
      await assertEnabledConfigKeys(tx, tenant.id, [
        { group: configGroups.sampleRequestStatus, keys: [data.status], label: "status" },
      ]);
    }

    const request = await tx.sampleRequest.update({
      where: { id: existing.id },
      // SampleRequest.status is NOT NULL: drop null instead of writing it.
      data: { ...data, status: data.status ?? undefined },
      select: sampleDetailSelect,
    });

    await tx.operationLog.create({
      data: {
        tenantId: tenant.id,
        module: "sample_management",
        action: "update",
        targetType: "SampleRequest",
        targetId: request.id,
        detail: { code: request.code, changedFields: Object.keys(data) },
      },
    });

    return request;
  });
}

export async function updateSampleRequestStatus(id: string, input: unknown) {
  const data = parsePayload(updateSampleRequestStatusSchema, input, "Invalid sample status payload.");
  const tenant = await getServerTenant();

  return prisma.$transaction(async (tx) => {
    const existing = await tx.sampleRequest.findFirst({
      where: { id, tenantId: tenant.id },
      select: { id: true, code: true, status: true, sentAt: true, returnedAt: true },
    });
    if (!existing) throw new AppError(404, "Sample request not found.");

    await assertEnabledConfigKeys(tx, tenant.id, [
      { group: configGroups.sampleRequestStatus, keys: [data.status], label: "status" },
    ]);

    const sentAt = data.sentAt ?? (data.status === "shipped" && !existing.sentAt ? new Date() : undefined);
    const returnedAt =
      data.returnedAt ?? (data.status === "returned" && !existing.returnedAt ? new Date() : undefined);

    const request = await tx.sampleRequest.update({
      where: { id: existing.id },
      data: {
        status: data.status,
        ...(sentAt ? { sentAt } : {}),
        ...(returnedAt ? { returnedAt } : {}),
        ...(data.carrier !== undefined ? { carrier: data.carrier } : {}),
        ...(data.trackingNo !== undefined ? { trackingNo: data.trackingNo } : {}),
      },
      select: sampleDetailSelect,
    });

    await tx.operationLog.create({
      data: {
        tenantId: tenant.id,
        module: "sample_management",
        action: "update_status",
        targetType: "SampleRequest",
        targetId: request.id,
        detail: {
          code: request.code,
          from: existing.status,
          to: data.status,
          trackingNo: data.trackingNo ?? null,
        },
      },
    });

    return request;
  });
}

export async function updateSampleItemFeedback(requestId: string, itemId: string, input: unknown) {
  const data = parsePayload(sampleItemFeedbackSchema, input, "Invalid sample feedback payload.");
  const tenant = await getServerTenant();

  return prisma.$transaction(async (tx) => {
    const item = await tx.sampleRequestItem.findFirst({
      where: { id: itemId, requestId, tenantId: tenant.id },
      select: { id: true, feedbackResult: true, fabric: { select: { code: true } } },
    });
    if (!item) throw new AppError(404, "Sample request item not found.");

    if (data.feedbackResult) {
      await assertEnabledConfigKeys(tx, tenant.id, [
        { group: configGroups.sampleFeedbackResult, keys: [data.feedbackResult], label: "feedbackResult" },
      ]);
    }

    const hasFeedbackChange = data.feedback !== undefined || data.feedbackResult !== undefined;
    const updated = await tx.sampleRequestItem.update({
      where: { id: item.id },
      data: {
        ...(data.feedback !== undefined ? { feedback: data.feedback } : {}),
        ...(data.feedbackResult !== undefined ? { feedbackResult: data.feedbackResult } : {}),
        feedbackAt: hasFeedbackChange ? new Date() : undefined,
      },
      select: sampleItemSelect,
    });

    await tx.operationLog.create({
      data: {
        tenantId: tenant.id,
        module: "sample_management",
        action: "feedback",
        targetType: "SampleRequestItem",
        targetId: updated.id,
        detail: {
          requestId,
          fabricCode: item.fabric.code,
          feedbackResult: updated.feedbackResult,
        },
      },
    });

    return updated;
  });
}

// Feedback results exposed for UI option lists.
export const sampleFeedbackResultValues = sampleFeedbackResults;

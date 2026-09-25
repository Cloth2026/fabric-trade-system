import { z } from "zod";
import type { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { assertEnabledConfigKeys, configGroups } from "../config-options";
import { AppError } from "../errors";
import { getServerTenant } from "../tenant";
import { calculateFabricCompleteness } from "./completeness";
import { getFabricDetail } from "./read-fabrics";

type DbClient = typeof prisma;
type Transaction = Prisma.TransactionClient;

const emptyStringToNull = (value: unknown) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
};

const optionalText = z.preprocess(emptyStringToNull, z.string().nullable().optional());
const requiredText = z.string().trim().min(1);
const nonNegativeMoney = z.coerce.number().nonnegative();
const optionalMoney = z.preprocess(emptyStringToNull, nonNegativeMoney.nullable().optional());

// Tax rates travel as fractions: 0.13 means 13%, matching CustomerQuote.taxRate.
const optionalTaxRate = z.preprocess(
  emptyStringToNull,
  z.coerce.number().min(0).max(1).nullable().optional(),
);
const requiredMoney = z.preprocess((value) => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length === 0 ? undefined : trimmed;
  }

  return value === null ? undefined : value;
}, nonNegativeMoney);
const optionalDate = z.preprocess(emptyStringToNull, z.coerce.date().nullable().optional());

const currency = z
  .preprocess(emptyStringToNull, z.string().regex(/^[A-Z]{3}$/).default("CNY"))
  .optional();

const sourceDetailFields = {
  supplierId: requiredText,
  supplierUnitId: optionalText,
  supplierFabricCode: optionalText,
  sampleStatus: optionalText,
  qualityDifferences: optionalText,
  remarks: optionalText,
} as const;

const initialQuoteSchema = z.object({
  purchasePriceExclTax: requiredMoney,
  purchasePriceInclTax: optionalMoney,
  purchaseTaxRate: optionalTaxRate,
  currency,
  minimumOrderQty: optionalText,
  leadTime: optionalText,
  contactName: optionalText,
  quoteDate: optionalDate,
  qualityDifferences: optionalText,
  remarks: optionalText,
});

export const addFabricSourceSchema = z
  .object({
    ...sourceDetailFields,
    isPreferred: z.boolean().optional(),
    initialQuote: initialQuoteSchema.nullable().optional(),
  })
  .strict();

export const addFabricSourceQuoteSchema = z
  .object({
    purchasePriceExclTax: requiredMoney,
    purchasePriceInclTax: optionalMoney,
    purchaseTaxRate: optionalTaxRate,
    currency,
    minimumOrderQty: optionalText,
    leadTime: optionalText,
    contactName: optionalText,
    quoteDate: optionalDate,
    supplierUnitId: optionalText,
    qualityDifferences: optionalText,
    remarks: optionalText,
  })
  .strict();

export const updateFabricSourceSchema = z
  .object({
    ...sourceDetailFields,
    isPreferred: z.boolean().optional(),
  })
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, { message: "At least one field is required." });

export type AddFabricSourceInput = z.infer<typeof addFabricSourceSchema>;
export type AddFabricSourceQuoteInput = z.infer<typeof addFabricSourceQuoteSchema>;
export type UpdateFabricSourceInput = z.infer<typeof updateFabricSourceSchema>;

async function loadFabricCore(tx: Transaction, tenantId: string, fabricId: string) {
  const fabric = await tx.fabric.findFirst({
    where: { id: fabricId, tenantId },
    select: {
      id: true,
      code: true,
      name: true,
      fabricType: true,
      pricingUnit: true,
      developmentSource: true,
      composition: true,
      weight: true,
      width: true,
      warpWeftDensity: true,
      greigeStatus: true,
      dyeingStatus: true,
      postProcessStatus: true,
    },
  });

  if (!fabric) {
    throw new AppError(404, "Fabric not found.");
  }

  return fabric;
}

async function assertSupplierUnitBelongsToSupplier(
  tx: Transaction,
  tenantId: string,
  supplierId: string,
  supplierUnitId: string,
) {
  const unit = await tx.supplierUnit.findFirst({
    where: { id: supplierUnitId, tenantId, supplierId },
    select: { id: true, status: true },
  });

  if (!unit) {
    throw new AppError(400, "Supplier unit does not belong to the supplier in current tenant.", {
      supplierUnitId,
    });
  }

  if (unit.status !== "active") {
    throw new AppError(400, "Supplier unit is not active.", { supplierUnitId });
  }
}

async function assertSampleStatusConfig(tx: Transaction, tenantId: string, sampleStatus: string) {
  await assertEnabledConfigKeys(tx, tenantId, [
    { group: configGroups.sampleStatus, keys: [sampleStatus], label: "sampleStatus" },
  ]);
}

export async function recalcFabricCompleteness(tx: Transaction, tenantId: string, fabricId: string) {
  const fabric = await loadFabricCore(tx, tenantId, fabricId);
  const sources = await tx.fabricSupplier.findMany({
    where: { tenantId, fabricId },
    select: { id: true, isPreferred: true, createdAt: true, quotes: { where: { tenantId }, select: { id: true }, take: 1 } },
    orderBy: [{ isPreferred: "desc" }, { createdAt: "asc" }, { id: "asc" }],
  });

  const preferred = sources.find((source) => source.isPreferred) ?? sources[0];
  const completeness = calculateFabricCompleteness({
    code: fabric.code,
    name: fabric.name,
    fabricType: fabric.fabricType,
    developmentSource: fabric.developmentSource,
    composition: fabric.composition,
    weight: fabric.weight,
    width: fabric.width,
    warpWeftDensity: fabric.warpWeftDensity,
    greigeStatus: fabric.greigeStatus,
    dyeingStatus: fabric.dyeingStatus,
    postProcessStatus: fabric.postProcessStatus,
    supplierCount: sources.length,
    preferredSupplierHasQuote: (preferred?.quotes.length ?? 0) > 0,
  });

  await tx.fabric.update({
    where: { id: fabricId },
    data: {
      completenessPercent: completeness.completenessPercent,
      missingInfoFlags: completeness.missingInfoFlags,
    },
  });

  return completeness;
}

async function ensurePreferredConsistency(tx: Transaction, tenantId: string, fabricId: string) {
  const sources = await tx.fabricSupplier.findMany({
    where: { tenantId, fabricId },
    select: { id: true, isPreferred: true },
    orderBy: [{ isPreferred: "desc" }, { createdAt: "asc" }, { id: "asc" }],
  });

  if (sources.length === 0) return;
  if (sources.some((source) => source.isPreferred)) return;

  const nextPreferred = sources[0];
  await tx.fabricSupplier.update({
    where: { id: nextPreferred.id },
    data: { isPreferred: true },
  });
}

export async function addFabricSource(fabricId: string, input: unknown, options: { client?: DbClient } = {}) {
  const client = options.client ?? prisma;
  const parsed = addFabricSourceSchema.safeParse(input);

  if (!parsed.success) {
    throw new AppError(400, "Invalid fabric source payload.", z.treeifyError(parsed.error));
  }

  const data = parsed.data;
  const tenant = await getServerTenant(client);
  const tenantId = tenant.id;

  await client.$transaction(async (tx) => {
    const fabric = await loadFabricCore(tx, tenantId, fabricId);

    const supplier = await tx.supplier.findFirst({
      where: { id: data.supplierId, tenantId },
      select: { id: true, status: true },
    });

    if (!supplier) {
      throw new AppError(400, "Supplier does not belong to current tenant.", { supplierId: data.supplierId });
    }

    if (supplier.status !== "active") {
      throw new AppError(400, "Supplier is not active.", { supplierId: data.supplierId });
    }

    const duplicate = await tx.fabricSupplier.findFirst({
      where: { tenantId, fabricId: fabric.id, supplierId: data.supplierId },
      select: { id: true },
    });

    if (duplicate) {
      throw new AppError(409, "Supplier is already a source of this fabric.");
    }

    if (data.supplierUnitId) {
      await assertSupplierUnitBelongsToSupplier(tx, tenantId, data.supplierId, data.supplierUnitId);
    }

    if (data.sampleStatus) {
      await assertSampleStatusConfig(tx, tenantId, data.sampleStatus);
    }

    const existingCount = await tx.fabricSupplier.count({ where: { tenantId, fabricId: fabric.id } });
    const isFirstSource = existingCount === 0;
    const becomesPreferred = isFirstSource || data.isPreferred === true;

    if (becomesPreferred && !isFirstSource) {
      await tx.fabricSupplier.updateMany({
        where: { tenantId, fabricId: fabric.id, isPreferred: true },
        data: { isPreferred: false },
      });
    }

    const source = await tx.fabricSupplier.create({
      data: {
        tenantId,
        fabricId: fabric.id,
        supplierId: data.supplierId,
        supplierUnitId: data.supplierUnitId ?? null,
        supplierFabricCode: data.supplierFabricCode ?? null,
        sampleStatus: data.sampleStatus ?? null,
        qualityDifferences: data.qualityDifferences ?? null,
        isPreferred: becomesPreferred,
        remarks: data.remarks ?? null,
      },
    });

    if (data.initialQuote) {
      await tx.fabricSupplierQuote.create({
        data: {
          tenantId,
          fabricSupplierId: source.id,
          supplierUnitId: source.supplierUnitId,
          purchasePriceExclTax: data.initialQuote.purchasePriceExclTax,
          purchasePriceInclTax: data.initialQuote.purchasePriceInclTax,
          purchaseTaxRate: data.initialQuote.purchaseTaxRate,
          currency: data.initialQuote.currency ?? "CNY",
          pricingUnit: fabric.pricingUnit,
          minimumOrderQty: data.initialQuote.minimumOrderQty ?? null,
          leadTime: data.initialQuote.leadTime ?? null,
          contactName: data.initialQuote.contactName ?? null,
          quoteDate: data.initialQuote.quoteDate ?? new Date(),
          qualityDifferences: data.initialQuote.qualityDifferences ?? null,
          remarks: data.initialQuote.remarks ?? null,
        },
      });
    }

    await recalcFabricCompleteness(tx, tenantId, fabric.id);

    await tx.operationLog.create({
      data: {
        tenantId,
        module: "fabric_library",
        action: "create_source",
        targetType: "FabricSupplier",
        targetId: source.id,
        detail: {
          fabricId: fabric.id,
          fabricCode: fabric.code,
          supplierId: data.supplierId,
          supplierUnitId: source.supplierUnitId,
          isPreferred: source.isPreferred,
          hasInitialQuote: data.initialQuote != null,
        },
      },
    });
  });

  return getFabricDetail(fabricId);
}

export async function addFabricSourceQuote(
  fabricId: string,
  sourceId: string,
  input: unknown,
  options: { client?: DbClient } = {},
) {
  const client = options.client ?? prisma;
  const parsed = addFabricSourceQuoteSchema.safeParse(input);

  if (!parsed.success) {
    throw new AppError(400, "Invalid fabric quote payload.", z.treeifyError(parsed.error));
  }

  const data = parsed.data;
  const tenant = await getServerTenant(client);
  const tenantId = tenant.id;

  await client.$transaction(async (tx) => {
    const fabric = await loadFabricCore(tx, tenantId, fabricId);

    const source = await tx.fabricSupplier.findFirst({
      where: { id: sourceId, tenantId, fabricId: fabric.id },
      select: { id: true, supplierId: true, supplierUnitId: true },
    });

    if (!source) {
      throw new AppError(404, "Fabric source not found.");
    }

    const effectiveUnitId = data.supplierUnitId ?? source.supplierUnitId;

    if (data.supplierUnitId) {
      await assertSupplierUnitBelongsToSupplier(tx, tenantId, source.supplierId, data.supplierUnitId);
    }

    const quote = await tx.fabricSupplierQuote.create({
      data: {
        tenantId,
        fabricSupplierId: source.id,
        supplierUnitId: effectiveUnitId,
        purchasePriceExclTax: data.purchasePriceExclTax,
        purchasePriceInclTax: data.purchasePriceInclTax,
        purchaseTaxRate: data.purchaseTaxRate,
        currency: data.currency ?? "CNY",
        pricingUnit: fabric.pricingUnit,
        minimumOrderQty: data.minimumOrderQty ?? null,
        leadTime: data.leadTime ?? null,
        contactName: data.contactName ?? null,
        quoteDate: data.quoteDate ?? new Date(),
        qualityDifferences: data.qualityDifferences ?? null,
        remarks: data.remarks ?? null,
      },
    });

    await recalcFabricCompleteness(tx, tenantId, fabric.id);

    await tx.operationLog.create({
      data: {
        tenantId,
        module: "fabric_library",
        action: "create_quote",
        targetType: "FabricSupplierQuote",
        targetId: quote.id,
        detail: {
          fabricId: fabric.id,
          fabricCode: fabric.code,
          fabricSupplierId: source.id,
          supplierId: source.supplierId,
          supplierUnitId: effectiveUnitId,
          purchasePriceExclTax: data.purchasePriceExclTax,
          purchasePriceInclTax: data.purchasePriceInclTax,
          purchaseTaxRate: data.purchaseTaxRate,
          pricingUnit: fabric.pricingUnit,
        },
      },
    });
  });

  return getFabricDetail(fabricId);
}

export async function updateFabricSource(
  fabricId: string,
  sourceId: string,
  input: unknown,
  options: { client?: DbClient } = {},
) {
  const client = options.client ?? prisma;
  const parsed = updateFabricSourceSchema.safeParse(input);

  if (!parsed.success) {
    throw new AppError(400, "Invalid fabric source update payload.", z.treeifyError(parsed.error));
  }

  const data = parsed.data;
  const tenant = await getServerTenant(client);
  const tenantId = tenant.id;

  await client.$transaction(async (tx) => {
    const fabric = await loadFabricCore(tx, tenantId, fabricId);

    const source = await tx.fabricSupplier.findFirst({
      where: { id: sourceId, tenantId, fabricId: fabric.id },
      select: { id: true, supplierId: true, isPreferred: true },
    });

    if (!source) {
      throw new AppError(404, "Fabric source not found.");
    }

    if (data.supplierUnitId !== undefined && data.supplierUnitId !== null) {
      await assertSupplierUnitBelongsToSupplier(tx, tenantId, source.supplierId, data.supplierUnitId);
    }

    if (data.sampleStatus) {
      await assertSampleStatusConfig(tx, tenantId, data.sampleStatus);
    }

    if (data.isPreferred === true) {
      await tx.fabricSupplier.updateMany({
        where: { tenantId, fabricId: fabric.id, isPreferred: true, id: { not: source.id } },
        data: { isPreferred: false },
      });
    }

    // Historical quotes keep their own supplierUnitId snapshot;
    // changing the source's current unit must not rewrite them.
    await tx.fabricSupplier.update({
      where: { id: source.id },
      data: {
        ...(data.supplierUnitId !== undefined ? { supplierUnitId: data.supplierUnitId } : {}),
        ...(data.supplierFabricCode !== undefined ? { supplierFabricCode: data.supplierFabricCode } : {}),
        ...(data.sampleStatus !== undefined ? { sampleStatus: data.sampleStatus } : {}),
        ...(data.qualityDifferences !== undefined ? { qualityDifferences: data.qualityDifferences } : {}),
        ...(data.remarks !== undefined ? { remarks: data.remarks } : {}),
        ...(data.isPreferred !== undefined ? { isPreferred: data.isPreferred } : {}),
      },
    });

    // A fabric keeps exactly one preferred source whenever sources exist.
    await ensurePreferredConsistency(tx, tenantId, fabric.id);

    await recalcFabricCompleteness(tx, tenantId, fabric.id);

    await tx.operationLog.create({
      data: {
        tenantId,
        module: "fabric_library",
        action: "update_source",
        targetType: "FabricSupplier",
        targetId: source.id,
        detail: {
          fabricId: fabric.id,
          fabricCode: fabric.code,
          supplierId: source.supplierId,
          updatedFields: Object.keys(data),
          ...(data.isPreferred !== undefined ? { isPreferred: data.isPreferred } : {}),
        },
      },
    });
  });

  return getFabricDetail(fabricId);
}

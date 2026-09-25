import { z } from "zod";
import type { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { assertEnabledConfigKeys, configGroups, type ConfigGroup } from "../config-options";
import { AppError } from "../errors";
import { getServerTenant } from "../tenant";
import { getFabricDetail } from "./read-fabrics";
import { recalcFabricCompleteness } from "./source-quotes";

type DbClient = typeof prisma;
type Transaction = Prisma.TransactionClient;

const emptyStringToNull = (value: unknown) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
};

// Fabric.status is NOT NULL in the database, so an empty value must be dropped
// from the update payload instead of being coerced to null.
const emptyStringToUndefined = (value: unknown) => {
  if (typeof value !== "string") {
    return value;
  }

  return value.trim().length === 0 ? undefined : value;
};

const optionalText = z.preprocess(emptyStringToNull, z.string().nullable().optional());
const optionalNonEmptyText = z.preprocess(emptyStringToUndefined, z.string().trim().min(1).optional());
const requiredText = z.string().trim().min(1);
const nonNegativeMoney = z.coerce.number().nonnegative();
const optionalMoney = z.preprocess(emptyStringToNull, nonNegativeMoney.nullable().optional());

// Tax rates travel as fractions: 0.13 means 13%, matching CustomerQuote.taxRate.
const optionalTaxRate = z.preprocess(
  emptyStringToNull,
  z.coerce.number().min(0).max(1).nullable().optional(),
);
const optionalDate = z.preprocess(emptyStringToNull, z.coerce.date().nullable().optional());
const optionKeys = z.array(z.string().trim().min(1));
const processStatus = z.enum(["none", "pending", "available"]);

const greigeInputSchema = z.object({
  supplierId: optionalText,
  code: optionalText,
  name: optionalText,
  composition: optionalText,
  weight: optionalText,
  width: optionalText,
  yarnOrDensity: optionalText,
  unitPriceExclTax: optionalMoney,
  unitPriceInclTax: optionalMoney,
  taxRate: optionalTaxRate,
  lossRate: optionalText,
  remarks: optionalText,
});

const dyeingInputSchema = z.object({
  processType: optionalText,
  factoryId: optionalText,
  unitPriceExclTax: optionalMoney,
  unitPriceInclTax: optionalMoney,
  taxRate: optionalTaxRate,
  lossRate: optionalText,
  leadTime: optionalText,
  cautions: optionalText,
});

const postProcessInputSchema = z.object({
  processType: optionalText,
  factoryId: optionalText,
  effectDescription: optionalText,
  unitPriceExclTax: optionalMoney,
  unitPriceInclTax: optionalMoney,
  taxRate: optionalTaxRate,
  lossRate: optionalText,
  minimumOrderQty: optionalText,
  leadTime: optionalText,
  riskNotes: optionalText,
  remarks: optionalText,
});

// Every editable field lives here: the main record, the three process status
// switches and the three process detail collections. Process collections are
// replaced wholesale when present, and left untouched when absent.
export const updateFabricSchema = z
  .object({
    code: requiredText.regex(/^SDD-.+/).max(64).optional(),
    fabricType: z.enum(["knitted", "woven"]).optional(),
    englishName: optionalText,
    name: requiredText.optional(),
    developmentSource: requiredText.optional(),
    status: optionalNonEmptyText,
    composition: requiredText.optional(),
    weight: requiredText.optional(),
    width: requiredText.optional(),
    yarnCount: optionalText,
    warpWeftDensity: optionalText,
    category: optionalText,
    structure: optionalText,
    tags: optionKeys.optional(),
    usageOptionKeys: optionKeys.optional(),
    seasonOptionKeys: optionKeys.optional(),
    certificationOptionKeys: optionKeys.optional(),
    elasticity: optionalText,
    sourceContact: optionalText,
    sourceDate: optionalDate,
    finishedReferencePriceExclTax: optionalMoney,
    finishedReferencePriceInclTax: optionalMoney,
    finishedReferenceTaxRate: optionalTaxRate,
    repurchaseStatus: optionalText,
    tubeWeight: optionalText,
    tolerance: optionalText,
    greigeStatus: processStatus.optional(),
    dyeingStatus: processStatus.optional(),
    postProcessStatus: processStatus.optional(),
    colorFastness: optionalText,
    pilling: optionalText,
    inspectionConclusion: optionalText,
    handFeel: optionalText,
    remarks: optionalText,
    greigeFabrics: z.array(greigeInputSchema).optional(),
    dyeingFinishings: z.array(dyeingInputSchema).optional(),
    postProcesses: z.array(postProcessInputSchema).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, { message: "At least one field is required." });

export type UpdateFabricInput = z.infer<typeof updateFabricSchema>;

type ProcessBlock = "greige" | "dyeing" | "postProcess";

function compact<T>(values: Array<T | null | undefined>): T[] {
  return values.filter((value): value is T => value !== null && value !== undefined);
}

function collectConfigChecks(
  fabricType: "knitted" | "woven",
  data: UpdateFabricInput,
): Array<{ group: ConfigGroup; keys: string[]; label: string }> {
  return [
    { group: configGroups.developmentSource, keys: data.developmentSource ? [data.developmentSource] : [], label: "developmentSource" },
    { group: configGroups.fabricStatus, keys: data.status ? [data.status] : [], label: "status" },
    {
      group: fabricType === "knitted" ? configGroups.knittedCategory : configGroups.wovenCategory,
      keys: data.category ? [data.category] : [],
      label: "category",
    },
    { group: configGroups.fabricStructure, keys: data.structure ? [data.structure] : [], label: "structure" },
    { group: configGroups.elasticityLevel, keys: data.elasticity ? [data.elasticity] : [], label: "elasticity" },
    { group: configGroups.repurchaseStatus, keys: data.repurchaseStatus ? [data.repurchaseStatus] : [], label: "repurchaseStatus" },
    {
      group: configGroups.dyeingProcessType,
      keys: (data.dyeingFinishings ?? []).flatMap((dyeing) => compact([dyeing.processType])),
      label: "dyeingFinishings.processType",
    },
    {
      group: configGroups.postProcessType,
      keys: (data.postProcesses ?? []).flatMap((process) => compact([process.processType])),
      label: "postProcesses.processType",
    },
    { group: configGroups.inspectionConclusion, keys: data.inspectionConclusion ? [data.inspectionConclusion] : [], label: "inspectionConclusion" },
    { group: configGroups.fabricUsage, keys: data.usageOptionKeys ?? [], label: "usageOptionKeys" },
    { group: configGroups.fabricSeason, keys: data.seasonOptionKeys ?? [], label: "seasonOptionKeys" },
    { group: configGroups.fabricCertification, keys: data.certificationOptionKeys ?? [], label: "certificationOptionKeys" },
  ].filter((item) => item.keys.length > 0);
}

const processLabels: Record<ProcessBlock, string> = {
  greige: "坯布信息",
  dyeing: "染整信息",
  postProcess: "后工艺信息",
};

function assertProcessConsistency(status: string, count: number, block: ProcessBlock) {
  if (status === "none" && count > 0) {
    throw new AppError(400, `${processLabels[block]}状态为「无」时不能提交明细。`);
  }

  if (status === "available" && count === 0) {
    throw new AppError(400, `${processLabels[block]}状态为「有」时至少需要一条明细。`);
  }
}

export async function updateFabric(fabricId: string, input: unknown, options: { client?: DbClient } = {}) {
  const client = options.client ?? prisma;
  const parsed = updateFabricSchema.safeParse(input);

  if (!parsed.success) {
    throw new AppError(400, "Invalid fabric update payload.", z.treeifyError(parsed.error));
  }

  const data = parsed.data;
  const tenant = await getServerTenant(client);
  const tenantId = tenant.id;

  await client.$transaction(async (tx: Transaction) => {
    const fabric = await tx.fabric.findFirst({
      where: { id: fabricId, tenantId },
      select: {
        id: true,
        code: true,
        name: true,
        fabricType: true,
        greigeStatus: true,
        dyeingStatus: true,
        postProcessStatus: true,
        _count: { select: { greigeFabrics: true, dyeingFinishings: true, postProcesses: true } },
      },
    });

    if (!fabric) {
      throw new AppError(404, "Fabric not found.");
    }

    const effectiveFabricType = data.fabricType ?? fabric.fabricType;

    const supplierIds = [
      ...new Set(
        compact([
          ...(data.greigeFabrics ?? []).map((greige) => greige.supplierId),
          ...(data.dyeingFinishings ?? []).map((dyeing) => dyeing.factoryId),
          ...(data.postProcesses ?? []).map((process) => process.factoryId),
        ]),
      ),
    ];

    if (supplierIds.length > 0) {
      const validSuppliers = await tx.supplier.findMany({
        where: { tenantId, id: { in: supplierIds }, status: "active" },
        select: { id: true },
      });
      const validSupplierIds = new Set(validSuppliers.map((supplier) => supplier.id));
      const invalidSupplierIds = supplierIds.filter((supplierId) => !validSupplierIds.has(supplierId));

      if (invalidSupplierIds.length > 0) {
        throw new AppError(400, "Supplier does not belong to current tenant.", {
          supplierIds: invalidSupplierIds,
        });
      }
    }

    const configChecks = collectConfigChecks(effectiveFabricType, data);
    if (configChecks.length > 0) {
      await assertEnabledConfigKeys(tx, tenantId, configChecks);
    }

    if (data.code && data.code !== fabric.code) {
      const duplicate = await tx.fabric.findUnique({
        where: { tenantId_code: { tenantId, code: data.code } },
        select: { id: true },
      });

      if (duplicate) {
        throw new AppError(409, "Fabric code already exists in current tenant.");
      }
    }

    // fabricType derives pricingUnit. Existing purchase quotes already snapshot
    // a pricing unit, so switching the type after a quote exists would make old
    // quotes contradict the fabric. Allow it only while there is no quote yet.
    if (data.fabricType && data.fabricType !== fabric.fabricType) {
      const quoteCount = await tx.fabricSupplierQuote.count({
        where: { tenantId, fabricSupplier: { is: { tenantId, fabricId: fabric.id } } },
      });

      if (quoteCount > 0) {
        throw new AppError(
          409,
          "面料已存在采购报价，不能再修改面料类型（会改变计价单位）。请先清除报价历史。",
        );
      }
    }

    assertProcessConsistency(
      data.greigeStatus ?? fabric.greigeStatus,
      data.greigeFabrics ? data.greigeFabrics.length : fabric._count.greigeFabrics,
      "greige",
    );
    assertProcessConsistency(
      data.dyeingStatus ?? fabric.dyeingStatus,
      data.dyeingFinishings ? data.dyeingFinishings.length : fabric._count.dyeingFinishings,
      "dyeing",
    );
    assertProcessConsistency(
      data.postProcessStatus ?? fabric.postProcessStatus,
      data.postProcesses ? data.postProcesses.length : fabric._count.postProcesses,
      "postProcess",
    );

    await tx.fabric.update({
      where: { id: fabric.id },
      data: {
        code: data.code,
        fabricType: data.fabricType,
        pricingUnit: data.fabricType ? (data.fabricType === "knitted" ? "kg" : "meter") : undefined,
        englishName: data.englishName,
        name: data.name,
        developmentSource: data.developmentSource,
        status: data.status,
        composition: data.composition,
        weight: data.weight,
        width: data.width,
        yarnCount: data.yarnCount,
        warpWeftDensity: data.warpWeftDensity,
        category: data.category,
        structure: data.structure,
        tags: data.tags,
        usageOptionKeys: data.usageOptionKeys,
        seasonOptionKeys: data.seasonOptionKeys,
        certificationOptionKeys: data.certificationOptionKeys,
        elasticity: data.elasticity,
        sourceContact: data.sourceContact,
        sourceDate: data.sourceDate,
        finishedReferencePriceExclTax: data.finishedReferencePriceExclTax,
        finishedReferencePriceInclTax: data.finishedReferencePriceInclTax,
        finishedReferenceTaxRate: data.finishedReferenceTaxRate,
        repurchaseStatus: data.repurchaseStatus,
        tubeWeight: data.tubeWeight,
        tolerance: data.tolerance,
        greigeStatus: data.greigeStatus,
        dyeingStatus: data.dyeingStatus,
        postProcessStatus: data.postProcessStatus,
        colorFastness: data.colorFastness,
        pilling: data.pilling,
        inspectionConclusion: data.inspectionConclusion,
        handFeel: data.handFeel,
        remarks: data.remarks,
      },
    });

    if (data.greigeFabrics) {
      await tx.greigeFabric.deleteMany({ where: { fabricId: fabric.id } });

      for (const greige of data.greigeFabrics) {
        await tx.greigeFabric.create({
          data: {
            fabricId: fabric.id,
            supplierId: greige.supplierId,
            code: greige.code,
            name: greige.name,
            composition: greige.composition,
            weight: greige.weight,
            width: greige.width,
            yarnOrDensity: greige.yarnOrDensity,
            unitPriceExclTax: greige.unitPriceExclTax,
            unitPriceInclTax: greige.unitPriceInclTax,
            taxRate: greige.taxRate,
            lossRate: greige.lossRate,
            remarks: greige.remarks,
          },
        });
      }
    }

    if (data.dyeingFinishings) {
      await tx.dyeingFinishing.deleteMany({ where: { fabricId: fabric.id } });

      for (const dyeing of data.dyeingFinishings) {
        await tx.dyeingFinishing.create({
          data: {
            fabricId: fabric.id,
            processType: dyeing.processType,
            factoryId: dyeing.factoryId,
            unitPriceExclTax: dyeing.unitPriceExclTax,
            unitPriceInclTax: dyeing.unitPriceInclTax,
            taxRate: dyeing.taxRate,
            lossRate: dyeing.lossRate,
            leadTime: dyeing.leadTime,
            cautions: dyeing.cautions,
          },
        });
      }
    }

    if (data.postProcesses) {
      await tx.postProcess.deleteMany({ where: { fabricId: fabric.id } });

      for (const process of data.postProcesses) {
        await tx.postProcess.create({
          data: {
            fabricId: fabric.id,
            processType: process.processType,
            factoryId: process.factoryId,
            effectDescription: process.effectDescription,
            unitPriceExclTax: process.unitPriceExclTax,
            unitPriceInclTax: process.unitPriceInclTax,
            taxRate: process.taxRate,
            lossRate: process.lossRate,
            minimumOrderQty: process.minimumOrderQty,
            leadTime: process.leadTime,
            riskNotes: process.riskNotes,
            remarks: process.remarks,
          },
        });
      }
    }

    const completeness = await recalcFabricCompleteness(tx, tenantId, fabric.id);

    await tx.operationLog.create({
      data: {
        tenantId,
        module: "fabric_library",
        action: "update",
        targetType: "Fabric",
        targetId: fabric.id,
        detail: {
          code: data.code ?? fabric.code,
          previousCode: data.code && data.code !== fabric.code ? fabric.code : null,
          name: data.name ?? fabric.name,
          previousFabricType: data.fabricType && data.fabricType !== fabric.fabricType ? fabric.fabricType : null,
          fabricType: effectiveFabricType,
          updatedFields: Object.keys(data),
          greigeCount: data.greigeFabrics ? data.greigeFabrics.length : fabric._count.greigeFabrics,
          dyeingCount: data.dyeingFinishings ? data.dyeingFinishings.length : fabric._count.dyeingFinishings,
          postProcessCount: data.postProcesses ? data.postProcesses.length : fabric._count.postProcesses,
          completenessPercent: completeness.completenessPercent,
        },
      },
    });
  });

  return getFabricDetail(fabricId);
}

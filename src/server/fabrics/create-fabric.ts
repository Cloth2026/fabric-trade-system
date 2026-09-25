import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { assertEnabledConfigKeys, configGroups } from "../config-options";
import { AppError } from "../errors";
import { getServerTenant } from "../tenant";
import { calculateFabricCompleteness } from "./completeness";
import { createFabricInputSchema } from "./schema";

type DbClient = typeof prisma;

type CreateFabricOptions = {
  client?: DbClient;
};

function compact<T>(values: Array<T | null | undefined>): T[] {
  return values.filter((value): value is T => value !== null && value !== undefined);
}

function unique(values: string[]) {
  return [...new Set(values)];
}

function collectSupplierIds(data: Awaited<ReturnType<typeof createFabricInputSchema.parse>>) {
  return unique(
    compact([
      ...data.greigeFabrics.map((greige) => greige.supplierId),
      ...data.dyeingFinishings.map((dyeing) => dyeing.factoryId),
      ...data.postProcesses.map((process) => process.factoryId),
      ...data.suppliers.map((supplier) => supplier.supplierId),
    ]),
  );
}

function collectConfigChecks(data: Awaited<ReturnType<typeof createFabricInputSchema.parse>>) {
  return [
    { group: configGroups.developmentSource, keys: [data.developmentSource], label: "developmentSource" },
    { group: configGroups.fabricStatus, keys: compact([data.status]), label: "status" },
    {
      group: data.fabricType === "knitted" ? configGroups.knittedCategory : configGroups.wovenCategory,
      keys: compact([data.category]),
      label: "category",
    },
    { group: configGroups.fabricStructure, keys: compact([data.structure]), label: "structure" },
    { group: configGroups.elasticityLevel, keys: compact([data.elasticity]), label: "elasticity" },
    { group: configGroups.repurchaseStatus, keys: compact([data.repurchaseStatus]), label: "repurchaseStatus" },
    {
      group: configGroups.dyeingProcessType,
      keys: data.dyeingFinishings.flatMap((dyeing) => compact([dyeing.processType])),
      label: "dyeingFinishings.processType",
    },
    {
      group: configGroups.postProcessType,
      keys: data.postProcesses.flatMap((process) => compact([process.processType])),
      label: "postProcesses.processType",
    },
    {
      group: configGroups.inspectionConclusion,
      keys: compact([data.inspectionConclusion]),
      label: "inspectionConclusion",
    },
    { group: configGroups.fabricUsage, keys: data.usageOptionKeys, label: "usageOptionKeys" },
    { group: configGroups.fabricSeason, keys: data.seasonOptionKeys, label: "seasonOptionKeys" },
    {
      group: configGroups.fabricCertification,
      keys: data.certificationOptionKeys,
      label: "certificationOptionKeys",
    },
    {
      group: configGroups.sampleStatus,
      keys: data.suppliers.flatMap((supplier) => compact([supplier.sampleStatus])),
      label: "suppliers.sampleStatus",
    },
  ].filter((item) => item.keys.length > 0);
}

export async function createFabric(input: unknown, options: CreateFabricOptions = {}) {
  const client = options.client ?? prisma;
  const parsed = createFabricInputSchema.safeParse(input);

  if (!parsed.success) {
    throw new AppError(400, "Invalid fabric payload.", z.treeifyError(parsed.error));
  }

  const data = parsed.data;
  const tenant = await getServerTenant(client);
  const tenantId = tenant.id;

  return client.$transaction(async (tx) => {
    await assertEnabledConfigKeys(tx, tenantId, collectConfigChecks(data));

    const existingFabric = await tx.fabric.findUnique({
      where: { tenantId_code: { tenantId, code: data.code } },
      select: { id: true },
    });

    if (existingFabric) {
      throw new AppError(409, "Fabric code already exists in current tenant.");
    }

    const supplierIds = collectSupplierIds(data);

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

    const preferredSupplier = data.suppliers.find((supplier) => supplier.isPreferred) ?? data.suppliers[0];
    const completeness = calculateFabricCompleteness({
      code: data.code,
      name: data.name,
      fabricType: data.fabricType,
      developmentSource: data.developmentSource,
      composition: data.composition,
      weight: data.weight,
      width: data.width,
      warpWeftDensity: data.warpWeftDensity,
      greigeStatus: data.greigeStatus,
      dyeingStatus: data.dyeingStatus,
      postProcessStatus: data.postProcessStatus,
      supplierCount: data.suppliers.length,
      preferredSupplierHasQuote: preferredSupplier?.initialQuote != null,
    });

    const fabric = await tx.fabric.create({
      data: {
        tenantId,
        code: data.code,
        englishName: data.englishName,
        name: data.name,
        fabricType: data.fabricType,
        pricingUnit: data.pricingUnit,
        developmentSource: data.developmentSource,
        status: data.status ?? "incomplete",
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
        finishedReferencePrice: data.finishedReferencePrice,
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
        completenessPercent: completeness.completenessPercent,
        missingInfoFlags: completeness.missingInfoFlags,
      },
    });

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
          unitPrice: greige.unitPrice,
          lossRate: greige.lossRate,
          remarks: greige.remarks,
        },
      });
    }

    for (const dyeing of data.dyeingFinishings) {
      await tx.dyeingFinishing.create({
        data: {
          fabricId: fabric.id,
          processType: dyeing.processType,
          factoryId: dyeing.factoryId,
          unitPrice: dyeing.unitPrice,
          lossRate: dyeing.lossRate,
          leadTime: dyeing.leadTime,
          cautions: dyeing.cautions,
        },
      });
    }

    for (const postProcess of data.postProcesses) {
      await tx.postProcess.create({
        data: {
          fabricId: fabric.id,
          processType: postProcess.processType,
          factoryId: postProcess.factoryId,
          effectDescription: postProcess.effectDescription,
          unitPrice: postProcess.unitPrice,
          lossRate: postProcess.lossRate,
          minimumOrderQty: postProcess.minimumOrderQty,
          leadTime: postProcess.leadTime,
          riskNotes: postProcess.riskNotes,
          remarks: postProcess.remarks,
        },
      });
    }

    for (const supplier of data.suppliers) {
      const fabricSupplier = await tx.fabricSupplier.create({
        data: {
          tenantId,
          fabricId: fabric.id,
          supplierId: supplier.supplierId,
          supplierFabricCode: supplier.supplierFabricCode,
          sampleStatus: supplier.sampleStatus,
          qualityDifferences: supplier.qualityDifferences,
          isPreferred: supplier.isPreferred,
          remarks: supplier.remarks,
        },
      });

      if (supplier.initialQuote) {
        const currentFabricSupplier = await tx.fabricSupplier.findFirst({
          where: { id: fabricSupplier.id, tenantId, fabricId: fabric.id, supplierId: supplier.supplierId },
          select: { id: true },
        });

        if (!currentFabricSupplier) {
          throw new AppError(400, "Fabric supplier relation is not valid for current tenant.");
        }

        await tx.fabricSupplierQuote.create({
          data: {
            tenantId,
            fabricSupplierId: currentFabricSupplier.id,
            purchasePrice: supplier.initialQuote.purchasePrice,
            currency: supplier.initialQuote.currency ?? "CNY",
            pricingUnit: data.pricingUnit,
            minimumOrderQty: supplier.initialQuote.minimumOrderQty,
            leadTime: supplier.initialQuote.leadTime,
            contactName: supplier.initialQuote.contactName,
            quoteDate: supplier.initialQuote.quoteDate ?? new Date(),
            qualityDifferences: supplier.initialQuote.qualityDifferences,
            remarks: supplier.initialQuote.remarks,
          },
        });
      }
    }

    await tx.operationLog.create({
      data: {
        tenantId,
        module: "fabric_library",
        action: "create",
        targetType: "Fabric",
        targetId: fabric.id,
        detail: {
          code: fabric.code,
          name: fabric.name,
          supplierCount: data.suppliers.length,
          completenessPercent: completeness.completenessPercent,
        },
      },
    });

    return tx.fabric.findUniqueOrThrow({
      where: { id: fabric.id },
      include: {
        supplierSources: { include: { quotes: true, supplier: true } },
        greigeFabrics: true,
        dyeingFinishings: true,
        postProcesses: true,
      },
    });
  });
}

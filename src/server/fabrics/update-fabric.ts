import { z } from "zod";
import type { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { assertEnabledConfigKeys, configGroups } from "../config-options";
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

const optionalText = z.preprocess(emptyStringToNull, z.string().nullable().optional());
const requiredText = z.string().trim().min(1);
const nonNegativeMoney = z.coerce.number().nonnegative();
const optionalMoney = z.preprocess(emptyStringToNull, nonNegativeMoney.nullable().optional());
const optionalDate = z.preprocess(emptyStringToNull, z.coerce.date().nullable().optional());

const optionKeys = z.array(z.string().trim().min(1));

// Main-record editable fields only. code, fabricType and pricingUnit are
// immutable: changing fabricType would silently change pricingUnit semantics
// of existing quotes. Process details (greige/dyeing/postProcesses) and
// supplier sources have their own maintenance flows.
export const updateFabricSchema = z
  .object({
    englishName: optionalText,
    name: requiredText,
    developmentSource: requiredText,
    status: optionalText,
    composition: requiredText,
    weight: requiredText,
    width: requiredText,
    yarnCount: optionalText,
    warpWeftDensity: optionalText,
    category: optionalText,
    structure: optionalText,
    tags: optionKeys,
    usageOptionKeys: optionKeys,
    seasonOptionKeys: optionKeys,
    certificationOptionKeys: optionKeys,
    elasticity: optionalText,
    sourceContact: optionalText,
    sourceDate: optionalDate,
    finishedReferencePrice: optionalMoney,
    repurchaseStatus: optionalText,
    tubeWeight: optionalText,
    tolerance: optionalText,
    colorFastness: optionalText,
    pilling: optionalText,
    inspectionConclusion: optionalText,
    handFeel: optionalText,
    remarks: optionalText,
  })
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, { message: "At least one field is required." });

export type UpdateFabricInput = z.infer<typeof updateFabricSchema>;

function collectConfigChecks(
  fabricType: "knitted" | "woven",
  data: UpdateFabricInput,
): Array<{ group: string; keys: string[]; label: string }> {
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
    { group: configGroups.inspectionConclusion, keys: data.inspectionConclusion ? [data.inspectionConclusion] : [], label: "inspectionConclusion" },
    { group: configGroups.fabricUsage, keys: data.usageOptionKeys ?? [], label: "usageOptionKeys" },
    { group: configGroups.fabricSeason, keys: data.seasonOptionKeys ?? [], label: "seasonOptionKeys" },
    { group: configGroups.fabricCertification, keys: data.certificationOptionKeys ?? [], label: "certificationOptionKeys" },
  ].filter((item) => item.keys.length > 0);
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
      select: { id: true, code: true, name: true, fabricType: true },
    });

    if (!fabric) {
      throw new AppError(404, "Fabric not found.");
    }

    const configChecks = collectConfigChecks(fabric.fabricType, data);
    if (configChecks.length > 0) {
      await assertEnabledConfigKeys(tx, tenantId, configChecks);
    }

    await tx.fabric.update({
      where: { id: fabric.id },
      data,
    });

    const completeness = await recalcFabricCompleteness(tx, tenantId, fabric.id);

    await tx.operationLog.create({
      data: {
        tenantId,
        module: "fabric_library",
        action: "update",
        targetType: "Fabric",
        targetId: fabric.id,
        detail: {
          code: fabric.code,
          name: data.name ?? fabric.name,
          updatedFields: Object.keys(data),
          completenessPercent: completeness.completenessPercent,
        },
      },
    });
  });

  return getFabricDetail(fabricId);
}

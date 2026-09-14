import { z } from "zod";

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
const requiredMoney = z.preprocess((value) => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length === 0 ? undefined : trimmed;
  }

  return value === null ? undefined : value;
}, nonNegativeMoney);
const processStatus = z.enum(["none", "pending", "available"]);

const optionalDate = z.preprocess(emptyStringToNull, z.coerce.date().nullable().optional());
const optionalMoney = z.preprocess(emptyStringToNull, nonNegativeMoney.nullable().optional());

function derivePricingUnit(fabricType: "knitted" | "woven"): "kg" | "meter" {
  return fabricType === "knitted" ? "kg" : "meter";
}

function requireDetail(
  condition: boolean,
  context: z.RefinementCtx,
  path: Array<string | number>,
  message: string,
) {
  if (condition) {
    context.addIssue({ code: "custom", path, message });
  }
}

export const supplierQuoteInputSchema = z.object({
  purchasePrice: requiredMoney,
  currency: z
    .preprocess(emptyStringToNull, z.string().regex(/^[A-Z]{3}$/).default("CNY"))
    .optional(),
  minimumOrderQty: optionalText,
  leadTime: optionalText,
  contactName: optionalText,
  quoteDate: optionalDate,
  qualityDifferences: optionalText,
  remarks: optionalText,
});

export const fabricSupplierInputSchema = z.object({
  supplierId: requiredText,
  supplierFabricCode: optionalText,
  sampleStatus: optionalText,
  qualityDifferences: optionalText,
  isPreferred: z.boolean().optional().default(false),
  remarks: optionalText,
  initialQuote: supplierQuoteInputSchema.nullable().optional(),
});

export const createFabricInputSchema = z
  .object({
    code: requiredText.regex(/^SDD-.+/).max(64),
    englishName: optionalText,
    name: requiredText,
    fabricType: z.enum(["knitted", "woven"]),
    pricingUnit: z.enum(["kg", "meter"]).optional(),
    developmentSource: requiredText,
    status: optionalText,
    composition: requiredText,
    weight: requiredText,
    width: requiredText,
    yarnCount: optionalText,
    warpWeftDensity: optionalText,
    category: optionalText,
    structure: optionalText,
    tags: z.array(z.string().trim().min(1)).optional().default([]),
    usageOptionKeys: z.array(z.string().trim().min(1)).optional().default([]),
    seasonOptionKeys: z.array(z.string().trim().min(1)).optional().default([]),
    certificationOptionKeys: z.array(z.string().trim().min(1)).optional().default([]),
    elasticity: optionalText,
    sourceContact: optionalText,
    sourceDate: optionalDate,
    finishedReferencePrice: optionalMoney,
    repurchaseStatus: optionalText,
    tubeWeight: optionalText,
    tolerance: optionalText,
    greigeStatus: processStatus.optional().default("pending"),
    dyeingStatus: processStatus.optional().default("pending"),
    postProcessStatus: processStatus.optional().default("pending"),
    colorFastness: optionalText,
    pilling: optionalText,
    inspectionConclusion: optionalText,
    handFeel: optionalText,
    remarks: optionalText,
    greige: z
      .object({
        supplierId: optionalText,
        code: optionalText,
        name: optionalText,
        composition: optionalText,
        weight: optionalText,
        width: optionalText,
        yarnOrDensity: optionalText,
        unitPrice: optionalMoney,
        lossRate: optionalText,
        remarks: optionalText,
      })
      .nullable()
      .optional(),
    dyeingFinishing: z
      .object({
        processType: optionalText,
        factoryId: optionalText,
        unitPrice: optionalMoney,
        lossRate: optionalText,
        leadTime: optionalText,
        cautions: optionalText,
      })
      .nullable()
      .optional(),
    postProcesses: z
      .array(
        z.object({
          processType: optionalText,
          factoryId: optionalText,
          effectDescription: optionalText,
          unitPrice: optionalMoney,
          lossRate: optionalText,
          minimumOrderQty: optionalText,
          leadTime: optionalText,
          riskNotes: optionalText,
          remarks: optionalText,
        }),
      )
      .optional()
      .default([]),
    suppliers: z.array(fabricSupplierInputSchema).optional().default([]),
  })
  .superRefine((value, context) => {
    const derivedPricingUnit = value.fabricType === "knitted" ? "kg" : "meter";

    if (value.pricingUnit && value.pricingUnit !== derivedPricingUnit) {
      context.addIssue({
        code: "custom",
        path: ["pricingUnit"],
        message: `pricingUnit must be ${derivedPricingUnit} for ${value.fabricType} fabrics.`,
      });
    }

    requireDetail(value.greigeStatus === "none" && value.greige != null, context, ["greige"], "greige must be empty when greigeStatus is none.");
    requireDetail(value.greigeStatus === "available" && value.greige == null, context, ["greige"], "greige is required when greigeStatus is available.");
    requireDetail(
      value.dyeingStatus === "none" && value.dyeingFinishing != null,
      context,
      ["dyeingFinishing"],
      "dyeingFinishing must be empty when dyeingStatus is none.",
    );
    requireDetail(
      value.dyeingStatus === "available" && value.dyeingFinishing == null,
      context,
      ["dyeingFinishing"],
      "dyeingFinishing is required when dyeingStatus is available.",
    );
    requireDetail(
      value.postProcessStatus === "none" && value.postProcesses.length > 0,
      context,
      ["postProcesses"],
      "postProcesses must be empty when postProcessStatus is none.",
    );
    requireDetail(
      value.postProcessStatus === "available" && value.postProcesses.length === 0,
      context,
      ["postProcesses"],
      "postProcesses is required when postProcessStatus is available.",
    );

    const supplierIds = value.suppliers.map((supplier) => supplier.supplierId);
    const duplicateSupplierIds = supplierIds.filter((supplierId, index) => supplierIds.indexOf(supplierId) !== index);
    if (duplicateSupplierIds.length > 0) {
      context.addIssue({
        code: "custom",
        path: ["suppliers"],
        message: "supplierId cannot be duplicated in one fabric creation request.",
      });
    }

    if (value.suppliers.filter((supplier) => supplier.isPreferred).length > 1) {
      context.addIssue({
        code: "custom",
        path: ["suppliers"],
        message: "Only one supplier can be preferred.",
      });
    }
  })
  .transform((value) => ({
    ...value,
    pricingUnit: derivePricingUnit(value.fabricType),
    suppliers:
      value.suppliers.length > 0 && !value.suppliers.some((supplier) => supplier.isPreferred)
        ? value.suppliers.map((supplier, index) => ({ ...supplier, isPreferred: index === 0 }))
        : value.suppliers,
  }));

export type CreateFabricInput = z.input<typeof createFabricInputSchema>;
export type CreateFabricData = z.output<typeof createFabricInputSchema>;

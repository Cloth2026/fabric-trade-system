import type { ProcessInfoStatus } from "../../generated/prisma/enums";

export type FabricCompletenessInput = {
  code?: string | null;
  name?: string | null;
  fabricType?: "knitted" | "woven" | null;
  developmentSource?: string | null;
  composition?: string | null;
  weight?: string | null;
  width?: string | null;
  warpWeftDensity?: string | null;
  greigeStatus?: ProcessInfoStatus | null;
  dyeingStatus?: ProcessInfoStatus | null;
  postProcessStatus?: ProcessInfoStatus | null;
  supplierCount?: number;
  preferredSupplierHasQuote?: boolean;
};

export type FabricCompletenessResult = {
  completenessPercent: number;
  missingInfoFlags: string[];
};

function hasValue(value: string | null | undefined) {
  return typeof value === "string" && value.trim().length > 0;
}

export function calculateFabricCompleteness(
  input: FabricCompletenessInput,
): FabricCompletenessResult {
  const checks: Array<{ passed: boolean; flag: string }> = [
    { passed: hasValue(input.code), flag: "missing_code" },
    { passed: hasValue(input.name), flag: "missing_name" },
    { passed: input.fabricType === "knitted" || input.fabricType === "woven", flag: "missing_fabric_type" },
    { passed: hasValue(input.developmentSource), flag: "missing_development_source" },
    { passed: hasValue(input.composition), flag: "missing_composition" },
    { passed: hasValue(input.weight), flag: "missing_weight" },
    { passed: hasValue(input.width), flag: "missing_width" },
    { passed: (input.supplierCount ?? 0) > 0, flag: "missing_supplier" },
    { passed: input.preferredSupplierHasQuote === true, flag: "missing_preferred_supplier_quote" },
    { passed: input.greigeStatus !== "pending", flag: "greige_pending" },
    { passed: input.dyeingStatus !== "pending", flag: "dyeing_pending" },
    { passed: input.postProcessStatus !== "pending", flag: "post_process_pending" },
  ];

  if (input.fabricType === "woven") {
    checks.push({ passed: hasValue(input.warpWeftDensity), flag: "missing_warp_weft_density" });
  }

  const missingInfoFlags = checks.filter((check) => !check.passed).map((check) => check.flag);
  const passedCount = checks.length - missingInfoFlags.length;

  return {
    completenessPercent: Math.round((passedCount / checks.length) * 100),
    missingInfoFlags,
  };
}

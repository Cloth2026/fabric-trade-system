import { AppError } from "./errors";

const SYSTEM_OWNER_KEY = "system";

type ConfigClient = {
  configOption: {
    findMany: (args: {
      where: {
        enabled: true;
        group: { in: string[] };
        OR: Array<{ ownerKey: string } | { tenantId: string }>;
      };
      select: { group: true; key: true };
    }) => Promise<Array<{ group: string; key: string }>>;
  };
};

export const configGroups = {
  developmentSource: "development_source",
  fabricStatus: "fabric_status",
  knittedCategory: "knitted_category",
  wovenCategory: "woven_category",
  fabricStructure: "fabric_structure",
  elasticityLevel: "elasticity_level",
  repurchaseStatus: "repurchase_status",
  dyeingProcessType: "dyeing_process_type",
  postProcessType: "post_process_type",
  inspectionConclusion: "inspection_conclusion",
  fabricUsage: "fabric_usage",
  fabricSeason: "fabric_season",
  fabricCertification: "fabric_certification",
  sampleStatus: "sample_status",
} as const;

export type ConfigGroup = (typeof configGroups)[keyof typeof configGroups];

export async function assertEnabledConfigKeys(
  client: ConfigClient,
  tenantId: string,
  required: Array<{ group: ConfigGroup; keys: string[]; label: string }>,
) {
  const groups = [...new Set(required.map((item) => item.group))];
  const options = await client.configOption.findMany({
    where: {
      enabled: true,
      group: { in: groups },
      OR: [{ ownerKey: SYSTEM_OWNER_KEY }, { tenantId }],
    },
    select: { group: true, key: true },
  });

  const enabledKeys = new Set(options.map((option) => `${option.group}:${option.key}`));
  const invalid: Array<{ label: string; group: string; key: string }> = [];

  for (const item of required) {
    for (const key of item.keys) {
      if (!enabledKeys.has(`${item.group}:${key}`)) {
        invalid.push({ label: item.label, group: item.group, key });
      }
    }
  }

  if (invalid.length > 0) {
    throw new AppError(400, "Invalid or disabled config option key.", invalid);
  }
}

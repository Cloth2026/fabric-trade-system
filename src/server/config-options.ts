import { AppError } from "./errors";
import { prisma } from "../lib/prisma";
import { getServerTenant } from "./tenant";

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
  // Sample requests sent to customers. Deliberately distinct from
  // sampleStatus, which describes samples received from suppliers.
  sampleRequestStatus: "sample_request_status",
  sampleFeedbackResult: "sample_feedback_result",
} as const;

export type ConfigGroup = (typeof configGroups)[keyof typeof configGroups];

export const readableConfigGroups = new Set<ConfigGroup>(Object.values(configGroups));

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

export async function listEnabledConfigOptions(groups: string[]) {
  const requestedGroups = [...new Set(groups.map((group) => group.trim()).filter(Boolean))];

  if (requestedGroups.length === 0) {
    throw new AppError(400, "At least one config group is required.");
  }

  const forbiddenGroups = requestedGroups.filter((group) => !readableConfigGroups.has(group as ConfigGroup));
  if (forbiddenGroups.length > 0) {
    throw new AppError(400, "Config group is not allowed.", { groups: forbiddenGroups });
  }

  const tenant = await getServerTenant();

  const options = await prisma.configOption.findMany({
    where: {
      enabled: true,
      group: { in: requestedGroups },
      OR: [{ ownerKey: SYSTEM_OWNER_KEY }, { tenantId: tenant.id }],
    },
    select: {
      tenantId: true,
      group: true,
      key: true,
      label: true,
      sortOrder: true,
    },
    orderBy: [{ group: "asc" }, { sortOrder: "asc" }, { label: "asc" }],
  });

  const dedupedOptions = new Map<string, (typeof options)[number]>();

  for (const option of options) {
    const optionKey = `${option.group}:${option.key}`;
    const existingOption = dedupedOptions.get(optionKey);

    if (!existingOption || (existingOption.tenantId == null && option.tenantId === tenant.id)) {
      dedupedOptions.set(optionKey, option);
    }
  }

  return [...dedupedOptions.values()]
    .map(({ group, key, label, sortOrder }) => ({ group, key, label, sortOrder }))
    .sort((left, right) => left.group.localeCompare(right.group) || left.sortOrder - right.sortOrder || left.label.localeCompare(right.label));
}

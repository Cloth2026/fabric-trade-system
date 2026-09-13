import { prisma } from "../lib/prisma";

const DEV_TENANT_CODE = process.env.DEV_TENANT_CODE?.trim() || "default";
const DEV_TENANT_NAME = process.env.DEV_TENANT_NAME?.trim() || "Default Tenant";

type TenantClient = Pick<typeof prisma, "tenant">;

export async function getServerTenant(client: TenantClient = prisma) {
  return client.tenant.upsert({
    where: { code: DEV_TENANT_CODE },
    update: { status: "active" },
    create: {
      code: DEV_TENANT_CODE,
      name: DEV_TENANT_NAME,
      status: "active",
    },
  });
}

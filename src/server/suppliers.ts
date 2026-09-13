import { prisma } from "../lib/prisma";
import { getServerTenant } from "./tenant";

type SupplierSearchOptions = {
  q?: string | null;
  limit?: number | null;
};

function clampLimit(limit: number | null | undefined) {
  if (!Number.isFinite(limit ?? Number.NaN)) {
    return 20;
  }

  return Math.min(Math.max(Math.trunc(limit as number), 1), 50);
}

export async function searchSuppliers(options: SupplierSearchOptions = {}) {
  const tenant = await getServerTenant();
  const query = options.q?.trim();

  return prisma.supplier.findMany({
    where: {
      tenantId: tenant.id,
      status: "active",
      ...(query
        ? {
            name: {
              contains: query,
              mode: "insensitive",
            },
          }
        : {}),
    },
    select: {
      id: true,
      name: true,
      type: true,
      contactName: true,
      phone: true,
    },
    orderBy: [{ name: "asc" }],
    take: clampLimit(options.limit),
  });
}

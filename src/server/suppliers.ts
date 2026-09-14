import { prisma } from "../lib/prisma";
import { getServerTenant } from "./tenant";

type SupplierSearchOptions = {
  q?: string | null;
  limit?: number | string | null;
};

export function normalizeSupplierLimit(limit: number | string | null | undefined) {
  if (limit === null || limit === undefined || limit === "") {
    return 20;
  }

  const numericLimit = typeof limit === "number" ? limit : Number(limit);

  if (!Number.isFinite(numericLimit)) {
    return 20;
  }

  return Math.min(Math.max(Math.trunc(numericLimit), 1), 50);
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
    take: normalizeSupplierLimit(options.limit),
  });
}

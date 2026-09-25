import type { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { assertEnabledConfigKeys, configGroups } from "../config-options";
import { AppError } from "../errors";
import { getServerTenant } from "../tenant";
import { parseFabricListQuery, type FabricListQuery } from "./read-schema";

const quoteSelect = {
  id: true,
  purchasePrice: true,
  currency: true,
  pricingUnit: true,
  minimumOrderQty: true,
  leadTime: true,
  contactName: true,
  quoteDate: true,
  qualityDifferences: true,
  remarks: true,
  createdAt: true,
} as const;

const supplierUnitSummarySelect = {
  id: true,
  name: true,
  unitForm: true,
  status: true,
} as const;

const detailQuoteSelect = {
  ...quoteSelect,
  supplierUnitId: true,
  supplierUnit: { select: supplierUnitSummarySelect },
} as const;

const supplierSummarySelect = {
  id: true,
  name: true,
  status: true,
} as const;

function serializeDecimal(value: { toString(): string } | null) {
  return value?.toString() ?? null;
}

function serializeDate(value: Date | null) {
  return value?.toISOString() ?? null;
}

function serializeQuote<T extends {
  purchasePrice: { toString(): string };
  quoteDate: Date;
  createdAt: Date;
}>(quote: T) {
  return {
    ...quote,
    purchasePrice: quote.purchasePrice.toString(),
    quoteDate: quote.quoteDate.toISOString(),
    createdAt: quote.createdAt.toISOString(),
  };
}

async function validateConfigFilters(tenantId: string, query: FabricListQuery) {
  const checks = [
    ...(query.status === "all"
      ? []
      : [{ group: configGroups.fabricStatus, keys: [query.status], label: "status" }]),
    ...(query.developmentSource === "all"
      ? []
      : [
          {
            group: configGroups.developmentSource,
            keys: [query.developmentSource],
            label: "developmentSource",
          },
        ]),
  ];

  if (checks.length > 0) {
    await assertEnabledConfigKeys(prisma, tenantId, checks);
  }
}

function buildFabricWhere(tenantId: string, query: FabricListQuery): Prisma.FabricWhereInput {
  const filters: Prisma.FabricWhereInput[] = [];

  if (query.q) {
    filters.push({
      OR: [
        { code: { contains: query.q, mode: "insensitive" } },
        { name: { contains: query.q, mode: "insensitive" } },
        { englishName: { contains: query.q, mode: "insensitive" } },
        { composition: { contains: query.q, mode: "insensitive" } },
        {
          supplierSources: {
            some: {
              tenantId,
              supplierFabricCode: { contains: query.q, mode: "insensitive" },
            },
          },
        },
        {
          supplierSources: {
            some: {
              tenantId,
              supplier: { is: { tenantId, name: { contains: query.q, mode: "insensitive" } } },
            },
          },
        },
      ],
    });
  }

  if (query.fabricType !== "all") filters.push({ fabricType: query.fabricType });
  if (query.status !== "all") filters.push({ status: query.status });
  if (query.developmentSource !== "all") {
    filters.push({ developmentSource: query.developmentSource });
  }
  if (query.completeness === "complete") filters.push({ completenessPercent: { gte: 85 } });
  if (query.completeness === "needs_attention") filters.push({ completenessPercent: { lt: 85 } });

  return { tenantId, ...(filters.length > 0 ? { AND: filters } : {}) };
}

export async function listFabrics(input: unknown) {
  const query = parseFabricListQuery(input);
  const tenant = await getServerTenant();
  await validateConfigFilters(tenant.id, query);

  const where = buildFabricWhere(tenant.id, query);
  const [total, fabrics] = await prisma.$transaction([
    prisma.fabric.count({ where }),
    prisma.fabric.findMany({
      where,
      select: {
        id: true,
        code: true,
        name: true,
        englishName: true,
        fabricType: true,
        pricingUnit: true,
        composition: true,
        weight: true,
        width: true,
        yarnCount: true,
        warpWeftDensity: true,
        developmentSource: true,
        status: true,
        completenessPercent: true,
        missingInfoFlags: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            supplierSources: {
              where: {
                tenantId: tenant.id,
                supplier: { is: { tenantId: tenant.id } },
              },
            },
          },
        },
        supplierSources: {
          where: {
            tenantId: tenant.id,
            supplier: { is: { tenantId: tenant.id } },
          },
          orderBy: [{ isPreferred: "desc" }, { createdAt: "asc" }, { id: "asc" }],
          take: 1,
          select: {
            id: true,
            supplierId: true,
            supplierFabricCode: true,
            supplierUnitId: true,
            sampleStatus: true,
            supplier: { select: { name: true } },
            supplierUnit: { select: { name: true } },
            quotes: {
              where: { tenantId: tenant.id },
              orderBy: [{ quoteDate: "desc" }, { createdAt: "desc" }, { id: "desc" }],
              take: 1,
              select: quoteSelect,
            },
          },
        },
      },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  return {
    data: fabrics.map(({ _count, supplierSources, createdAt, updatedAt, ...fabric }) => {
      const source = supplierSources[0];
      return {
        ...fabric,
        createdAt: createdAt.toISOString(),
        updatedAt: updatedAt.toISOString(),
        supplierSourceCount: _count.supplierSources,
        preferredSupplierSource: source
          ? {
              id: source.id,
              supplierId: source.supplierId,
              supplierName: source.supplier.name,
              supplierUnitId: source.supplierUnitId,
              supplierUnitName: source.supplierUnit?.name ?? null,
              supplierFabricCode: source.supplierFabricCode,
              sampleStatus: source.sampleStatus,
              latestQuote: source.quotes[0] ? serializeQuote(source.quotes[0]) : null,
            }
          : null,
      };
    }),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    },
  };
}

export async function getFabricDetail(id: string) {
  const tenant = await getServerTenant();
  const fabric = await prisma.fabric.findFirst({
    where: { id, tenantId: tenant.id },
    select: {
      id: true,
      code: true,
      name: true,
      englishName: true,
      fabricType: true,
      pricingUnit: true,
      developmentSource: true,
      status: true,
      composition: true,
      weight: true,
      width: true,
      yarnCount: true,
      warpWeftDensity: true,
      category: true,
      structure: true,
      elasticity: true,
      usageOptionKeys: true,
      seasonOptionKeys: true,
      certificationOptionKeys: true,
      tags: true,
      sourceContact: true,
      sourceDate: true,
      finishedReferencePrice: true,
      repurchaseStatus: true,
      tubeWeight: true,
      tolerance: true,
      greigeStatus: true,
      dyeingStatus: true,
      postProcessStatus: true,
      colorFastness: true,
      pilling: true,
      inspectionConclusion: true,
      handFeel: true,
      remarks: true,
      completenessPercent: true,
      missingInfoFlags: true,
      createdAt: true,
      updatedAt: true,
      supplierSources: {
        where: {
          tenantId: tenant.id,
          supplier: { is: { tenantId: tenant.id } },
        },
        orderBy: [{ isPreferred: "desc" }, { createdAt: "asc" }, { id: "asc" }],
        select: {
          id: true,
          supplierId: true,
          supplierUnitId: true,
          supplierFabricCode: true,
          sampleStatus: true,
          qualityDifferences: true,
          isPreferred: true,
          remarks: true,
          createdAt: true,
          updatedAt: true,
          supplier: { select: supplierSummarySelect },
          supplierUnit: {
            select: supplierUnitSummarySelect,
          },
          quotes: {
            where: { tenantId: tenant.id },
            orderBy: [{ quoteDate: "desc" }, { createdAt: "desc" }, { id: "desc" }],
            select: detailQuoteSelect,
          },
        },
      },
      greigeFabrics: {
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: {
          id: true,
          supplierId: true,
          supplier: { select: supplierSummarySelect },
          code: true,
          name: true,
          composition: true,
          weight: true,
          width: true,
          yarnOrDensity: true,
          unitPrice: true,
          lossRate: true,
          remarks: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      dyeingFinishings: {
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: {
          id: true,
          processType: true,
          factoryId: true,
          factory: { select: supplierSummarySelect },
          unitPrice: true,
          lossRate: true,
          leadTime: true,
          cautions: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      postProcesses: {
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: {
          id: true,
          processType: true,
          factoryId: true,
          factory: { select: supplierSummarySelect },
          effectDescription: true,
          unitPrice: true,
          lossRate: true,
          minimumOrderQty: true,
          leadTime: true,
          riskNotes: true,
          remarks: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!fabric) throw new AppError(404, "Fabric not found.");

  return {
    ...fabric,
    sourceDate: serializeDate(fabric.sourceDate),
    finishedReferencePrice: serializeDecimal(fabric.finishedReferencePrice),
    createdAt: fabric.createdAt.toISOString(),
    updatedAt: fabric.updatedAt.toISOString(),
    supplierSources: fabric.supplierSources.map((source) => ({
      ...source,
      createdAt: source.createdAt.toISOString(),
      updatedAt: source.updatedAt.toISOString(),
      quotes: source.quotes.map(serializeQuote),
    })),
    greigeFabrics: fabric.greigeFabrics.map((greige) => ({
      ...greige,
      unitPrice: serializeDecimal(greige.unitPrice),
      createdAt: greige.createdAt.toISOString(),
      updatedAt: greige.updatedAt.toISOString(),
    })),
    dyeingFinishings: fabric.dyeingFinishings.map((dyeing) => ({
      ...dyeing,
      unitPrice: serializeDecimal(dyeing.unitPrice),
      createdAt: dyeing.createdAt.toISOString(),
      updatedAt: dyeing.updatedAt.toISOString(),
    })),
    postProcesses: fabric.postProcesses.map((process) => ({
      ...process,
      unitPrice: serializeDecimal(process.unitPrice),
      createdAt: process.createdAt.toISOString(),
      updatedAt: process.updatedAt.toISOString(),
    })),
  };
}

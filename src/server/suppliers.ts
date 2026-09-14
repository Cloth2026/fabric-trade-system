import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AppError } from "./errors";
import { getServerTenant } from "./tenant";
import { supplierRoles, supplierStatuses, supplierUnitBusinessTypes, supplierUnitForms, supplierUnitStatuses } from "./suppliers/constants";
import {
  createSupplierSchema,
  createSupplierUnitSchema,
  updateSupplierSchema,
  updateSupplierUnitSchema,
} from "./suppliers/schemas";

type SupplierSearchOptions = {
  q?: string | null;
  role?: string | null;
  status?: string | null;
  limit?: number | string | null;
};

type SupplierUnitSearchOptions = {
  q?: string | null;
  unitForm?: string | null;
  businessType?: string | null;
  status?: string | null;
  limit?: number | string | null;
};

const supplierListSelect = {
  id: true,
  name: true,
  type: true,
  roles: true,
  contactName: true,
  phone: true,
  address: true,
  country: true,
  city: true,
  email: true,
  socialContact: true,
  specialties: true,
  defaultLeadTime: true,
  defaultMoq: true,
  paymentTerms: true,
  cooperationComment: true,
  riskNote: true,
  remarks: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { productionUnits: true } },
} as const;

const supplierUnitSelect = {
  id: true,
  supplierId: true,
  name: true,
  unitForm: true,
  businessTypes: true,
  status: true,
  primaryBusiness: true,
  primaryProducts: true,
  materialScope: true,
  processCapabilities: true,
  restrictions: true,
  defaultMoq: true,
  regularLeadTime: true,
  peakLeadTime: true,
  supportsSampling: true,
  managerName: true,
  phone: true,
  socialContact: true,
  qualityFeatures: true,
  riskNote: true,
  remarks: true,
  createdAt: true,
  updatedAt: true,
  supplier: { select: { id: true, name: true, status: true } },
} as const;

function parsePayload<T>(schema: z.ZodType<T>, input: unknown, message: string) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    throw new AppError(400, message, z.treeifyError(parsed.error));
  }
  return parsed.data;
}

function actionForStatusChange(
  previousStatus: string,
  nextStatus: string | undefined,
  inactiveAction: "deactivate" | "pause",
) {
  if (!nextStatus || nextStatus === previousStatus) return "update";
  return nextStatus === "active" ? "activate" : inactiveAction;
}

export function normalizeSupplierLimit(limit: number | string | null | undefined) {
  if (limit === null || limit === undefined || limit === "") return 20;
  const numericLimit = typeof limit === "number" ? limit : Number(limit);
  if (!Number.isFinite(numericLimit)) return 20;
  return Math.min(Math.max(Math.trunc(numericLimit), 1), 50);
}

export async function searchSuppliers(options: SupplierSearchOptions = {}) {
  const tenant = await getServerTenant();
  const query = options.q?.trim();
  const role = options.role
    ? parsePayload(z.enum(supplierRoles), options.role, "Invalid supplier role.")
    : undefined;
  const status =
    options.status === "all"
      ? undefined
      : options.status
        ? parsePayload(z.enum(supplierStatuses), options.status, "Invalid supplier status.")
        : "active";

  return prisma.supplier.findMany({
    where: {
      tenantId: tenant.id,
      ...(status ? { status } : {}),
      ...(role ? { roles: { has: role } } : {}),
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" as const } },
              { contactName: { contains: query, mode: "insensitive" as const } },
              { phone: { contains: query, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    select: supplierListSelect,
    orderBy: [{ name: "asc" }],
    take: normalizeSupplierLimit(options.limit),
  });
}

export async function createSupplier(input: unknown) {
  const data = parsePayload(createSupplierSchema, input, "Invalid supplier payload.");
  const tenant = await getServerTenant();

  return prisma.$transaction(async (tx) => {
    const supplier = await tx.supplier.create({
      data: { tenantId: tenant.id, ...data },
      select: supplierListSelect,
    });

    await tx.operationLog.create({
      data: {
        tenantId: tenant.id,
        module: "supplier_management",
        action: "create",
        targetType: "Supplier",
        targetId: supplier.id,
        detail: { name: supplier.name, roles: supplier.roles, status: supplier.status },
      },
    });

    return supplier;
  });
}

export async function getSupplier(id: string) {
  const tenant = await getServerTenant();
  const supplier = await prisma.supplier.findFirst({
    where: { id, tenantId: tenant.id },
    select: supplierListSelect,
  });

  if (!supplier) throw new AppError(404, "Supplier not found.");
  return supplier;
}

export async function updateSupplier(id: string, input: unknown) {
  const data = parsePayload(updateSupplierSchema, input, "Invalid supplier payload.");
  const tenant = await getServerTenant();

  return prisma.$transaction(async (tx) => {
    const existing = await tx.supplier.findFirst({
      where: { id, tenantId: tenant.id },
      select: { id: true, status: true },
    });
    if (!existing) throw new AppError(404, "Supplier not found.");

    const supplier = await tx.supplier.update({
      where: { id: existing.id },
      data,
      select: supplierListSelect,
    });
    const action = actionForStatusChange(existing.status, data.status, "deactivate");

    await tx.operationLog.create({
      data: {
        tenantId: tenant.id,
        module: "supplier_management",
        action,
        targetType: "Supplier",
        targetId: supplier.id,
        detail: { changedFields: Object.keys(data), status: supplier.status },
      },
    });

    return supplier;
  });
}

export async function listSupplierUnits(supplierId: string, options: SupplierUnitSearchOptions = {}) {
  const tenant = await getServerTenant();
  const supplier = await prisma.supplier.findFirst({
    where: { id: supplierId, tenantId: tenant.id },
    select: { id: true },
  });
  if (!supplier) throw new AppError(404, "Supplier not found.");

  const query = options.q?.trim();
  const unitForm = options.unitForm
    ? parsePayload(z.enum(supplierUnitForms), options.unitForm, "Invalid supplier unit form.")
    : undefined;
  const businessType = options.businessType
    ? parsePayload(z.enum(supplierUnitBusinessTypes), options.businessType, "Invalid supplier unit business type.")
    : undefined;
  const status = options.status
    ? parsePayload(z.enum(supplierUnitStatuses), options.status, "Invalid supplier unit status.")
    : undefined;

  return prisma.supplierUnit.findMany({
    where: {
      tenantId: tenant.id,
      supplierId: supplier.id,
      ...(unitForm ? { unitForm } : {}),
      ...(businessType ? { businessTypes: { has: businessType } } : {}),
      ...(status ? { status } : {}),
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" as const } },
              { primaryBusiness: { contains: query, mode: "insensitive" as const } },
              { primaryProducts: { contains: query, mode: "insensitive" as const } },
              { processCapabilities: { contains: query, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    select: supplierUnitSelect,
    orderBy: [{ name: "asc" }],
    take: normalizeSupplierLimit(options.limit),
  });
}

export async function createSupplierUnit(supplierId: string, input: unknown) {
  const data = parsePayload(createSupplierUnitSchema, input, "Invalid supplier unit payload.");
  const tenant = await getServerTenant();

  return prisma.$transaction(async (tx) => {
    const supplier = await tx.supplier.findFirst({
      where: { id: supplierId, tenantId: tenant.id },
      select: { id: true, status: true },
    });
    if (!supplier) throw new AppError(404, "Supplier not found.");
    if (supplier.status !== "active") {
      throw new AppError(409, "Inactive suppliers cannot create production units.");
    }

    const duplicate = await tx.supplierUnit.findUnique({
      where: { tenantId_supplierId_name: { tenantId: tenant.id, supplierId: supplier.id, name: data.name } },
      select: { id: true },
    });
    if (duplicate) throw new AppError(409, "Supplier unit name already exists for this supplier.");

    const unit = await tx.supplierUnit.create({
      data: { tenantId: tenant.id, supplierId: supplier.id, ...data },
      select: supplierUnitSelect,
    });

    await tx.operationLog.create({
      data: {
        tenantId: tenant.id,
        module: "supplier_management",
        action: "create",
        targetType: "SupplierUnit",
        targetId: unit.id,
        detail: {
          supplierId: supplier.id,
          name: unit.name,
          unitForm: unit.unitForm,
          businessTypes: unit.businessTypes,
          status: unit.status,
        },
      },
    });

    return unit;
  });
}

export async function getSupplierUnit(id: string) {
  const tenant = await getServerTenant();
  const unit = await prisma.supplierUnit.findFirst({
    where: { id, tenantId: tenant.id },
    select: supplierUnitSelect,
  });

  if (!unit) throw new AppError(404, "Supplier unit not found.");
  return unit;
}

export async function updateSupplierUnit(id: string, input: unknown) {
  const data = parsePayload(updateSupplierUnitSchema, input, "Invalid supplier unit payload.");
  const tenant = await getServerTenant();

  return prisma.$transaction(async (tx) => {
    const existing = await tx.supplierUnit.findFirst({
      where: { id, tenantId: tenant.id },
      select: { id: true, supplierId: true, status: true },
    });
    if (!existing) throw new AppError(404, "Supplier unit not found.");

    if (data.name) {
      const duplicate = await tx.supplierUnit.findFirst({
        where: {
          tenantId: tenant.id,
          supplierId: existing.supplierId,
          name: data.name,
          NOT: { id: existing.id },
        },
        select: { id: true },
      });
      if (duplicate) throw new AppError(409, "Supplier unit name already exists for this supplier.");
    }

    const unit = await tx.supplierUnit.update({
      where: { id: existing.id },
      data,
      select: supplierUnitSelect,
    });
    const action = actionForStatusChange(existing.status, data.status, "pause");

    await tx.operationLog.create({
      data: {
        tenantId: tenant.id,
        module: "supplier_management",
        action,
        targetType: "SupplierUnit",
        targetId: unit.id,
        detail: { supplierId: existing.supplierId, changedFields: Object.keys(data), status: unit.status },
      },
    });

    return unit;
  });
}

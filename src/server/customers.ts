import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AppError } from "./errors";
import { getServerTenant } from "./tenant";
import { customerContactStatuses, customerLevels, customerStatuses, customerTypes } from "./customers/constants";
import {
  createCustomerContactSchema,
  createCustomerSchema,
  updateCustomerContactSchema,
  updateCustomerSchema,
} from "./customers/schemas";

type CustomerSearchOptions = {
  q?: string | null;
  type?: string | null;
  level?: string | null;
  status?: string | null;
  limit?: number | string | null;
};

type CustomerContactSearchOptions = {
  q?: string | null;
  status?: string | null;
  limit?: number | string | null;
};

const customerListSelect = {
  id: true,
  name: true,
  type: true,
  level: true,
  status: true,
  country: true,
  city: true,
  address: true,
  contactName: true,
  phone: true,
  email: true,
  socialContact: true,
  mainProducts: true,
  cooperationBrands: true,
  paymentTerms: true,
  defaultCurrency: true,
  remarks: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { contacts: true } },
} as const;

const customerContactSelect = {
  id: true,
  customerId: true,
  name: true,
  title: true,
  department: true,
  phone: true,
  email: true,
  socialContact: true,
  isPrimary: true,
  status: true,
  remarks: true,
  createdAt: true,
  updatedAt: true,
  customer: { select: { id: true, name: true, status: true } },
} as const;

const customerContactOrderBy = [{ isPrimary: "desc" }, { name: "asc" }] as Array<
  Record<string, "desc" | "asc">
>;

const customerDetailSelect = {
  ...customerListSelect,
  contacts: { select: customerContactSelect, orderBy: customerContactOrderBy },
};

function parsePayload<T>(schema: z.ZodType<T>, input: unknown, message: string) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    throw new AppError(400, message, z.treeifyError(parsed.error));
  }
  return parsed.data;
}

function actionForStatusChange(previousStatus: string, nextStatus: string | undefined) {
  if (!nextStatus || nextStatus === previousStatus) return "update";
  return nextStatus === "active" ? "activate" : "deactivate";
}

export function normalizeCustomerLimit(limit: number | string | null | undefined) {
  if (limit === null || limit === undefined || limit === "") return 20;
  const numericLimit = typeof limit === "number" ? limit : Number(limit);
  if (!Number.isFinite(numericLimit)) return 20;
  return Math.min(Math.max(Math.trunc(numericLimit), 1), 50);
}

export async function searchCustomers(options: CustomerSearchOptions = {}) {
  const tenant = await getServerTenant();
  const query = options.q?.trim();
  const type = options.type
    ? parsePayload(z.enum(customerTypes), options.type, "Invalid customer type.")
    : undefined;
  const level = options.level
    ? parsePayload(z.enum(customerLevels), options.level, "Invalid customer level.")
    : undefined;
  const status =
    options.status === "all"
      ? undefined
      : options.status
        ? parsePayload(z.enum(customerStatuses), options.status, "Invalid customer status.")
        : "active";

  return prisma.customer.findMany({
    where: {
      tenantId: tenant.id,
      ...(status ? { status } : {}),
      ...(type ? { type } : {}),
      ...(level ? { level } : {}),
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" as const } },
              { contactName: { contains: query, mode: "insensitive" as const } },
              { phone: { contains: query, mode: "insensitive" as const } },
              { city: { contains: query, mode: "insensitive" as const } },
              { mainProducts: { contains: query, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    select: customerListSelect,
    orderBy: [{ name: "asc" }],
    take: normalizeCustomerLimit(options.limit),
  });
}

export async function createCustomer(input: unknown) {
  const data = parsePayload(createCustomerSchema, input, "Invalid customer payload.");
  const tenant = await getServerTenant();

  return prisma.$transaction(async (tx) => {
    const duplicate = await tx.customer.findFirst({
      where: { tenantId: tenant.id, name: data.name },
      select: { id: true },
    });
    if (duplicate) throw new AppError(409, "Customer name already exists.");

    const customer = await tx.customer.create({
      data: { tenantId: tenant.id, ...data },
      select: customerListSelect,
    });

    await tx.operationLog.create({
      data: {
        tenantId: tenant.id,
        module: "customer_management",
        action: "create",
        targetType: "Customer",
        targetId: customer.id,
        detail: { name: customer.name, type: customer.type, level: customer.level, status: customer.status },
      },
    });

    return customer;
  });
}

export async function getCustomer(id: string) {
  const tenant = await getServerTenant();
  const customer = await prisma.customer.findFirst({
    where: { id, tenantId: tenant.id },
    select: customerDetailSelect,
  });

  if (!customer) throw new AppError(404, "Customer not found.");
  return customer;
}

export async function updateCustomer(id: string, input: unknown) {
  const data = parsePayload(updateCustomerSchema, input, "Invalid customer payload.");
  const tenant = await getServerTenant();

  return prisma.$transaction(async (tx) => {
    const existing = await tx.customer.findFirst({
      where: { id, tenantId: tenant.id },
      select: { id: true, status: true },
    });
    if (!existing) throw new AppError(404, "Customer not found.");

    if (data.name) {
      const duplicate = await tx.customer.findFirst({
        where: { tenantId: tenant.id, name: data.name, NOT: { id: existing.id } },
        select: { id: true },
      });
      if (duplicate) throw new AppError(409, "Customer name already exists.");
    }

    const customer = await tx.customer.update({
      where: { id: existing.id },
      data,
      select: customerDetailSelect,
    });
    const action = actionForStatusChange(existing.status, data.status);

    await tx.operationLog.create({
      data: {
        tenantId: tenant.id,
        module: "customer_management",
        action,
        targetType: "Customer",
        targetId: customer.id,
        detail: { changedFields: Object.keys(data), status: customer.status },
      },
    });

    return customer;
  });
}

export async function listCustomerContacts(customerId: string, options: CustomerContactSearchOptions = {}) {
  const tenant = await getServerTenant();
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, tenantId: tenant.id },
    select: { id: true },
  });
  if (!customer) throw new AppError(404, "Customer not found.");

  const query = options.q?.trim();
  const status = options.status
    ? parsePayload(z.enum(customerContactStatuses), options.status, "Invalid customer contact status.")
    : undefined;

  return prisma.customerContact.findMany({
    where: {
      tenantId: tenant.id,
      customerId: customer.id,
      ...(status ? { status } : {}),
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" as const } },
              { title: { contains: query, mode: "insensitive" as const } },
              { department: { contains: query, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    select: customerContactSelect,
    orderBy: [{ isPrimary: "desc" as const }, { name: "asc" as const }],
    take: normalizeCustomerLimit(options.limit),
  });
}

export async function createCustomerContact(customerId: string, input: unknown) {
  const data = parsePayload(createCustomerContactSchema, input, "Invalid customer contact payload.");
  const tenant = await getServerTenant();

  return prisma.$transaction(async (tx) => {
    const customer = await tx.customer.findFirst({
      where: { id: customerId, tenantId: tenant.id },
      select: { id: true, status: true },
    });
    if (!customer) throw new AppError(404, "Customer not found.");
    if (customer.status !== "active") {
      throw new AppError(409, "Inactive customers cannot create contacts.");
    }

    const duplicate = await tx.customerContact.findUnique({
      where: { tenantId_customerId_name: { tenantId: tenant.id, customerId: customer.id, name: data.name } },
      select: { id: true },
    });
    if (duplicate) throw new AppError(409, "Contact name already exists for this customer.");

    if (data.isPrimary) {
      await tx.customerContact.updateMany({
        where: { tenantId: tenant.id, customerId: customer.id, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const contact = await tx.customerContact.create({
      data: { tenantId: tenant.id, customerId: customer.id, ...data },
      select: customerContactSelect,
    });

    await tx.operationLog.create({
      data: {
        tenantId: tenant.id,
        module: "customer_management",
        action: "create",
        targetType: "CustomerContact",
        targetId: contact.id,
        detail: {
          customerId: customer.id,
          name: contact.name,
          isPrimary: contact.isPrimary,
          status: contact.status,
        },
      },
    });

    return contact;
  });
}

export async function getCustomerContact(id: string) {
  const tenant = await getServerTenant();
  const contact = await prisma.customerContact.findFirst({
    where: { id, tenantId: tenant.id },
    select: customerContactSelect,
  });

  if (!contact) throw new AppError(404, "Customer contact not found.");
  return contact;
}

export async function updateCustomerContact(id: string, input: unknown) {
  const data = parsePayload(updateCustomerContactSchema, input, "Invalid customer contact payload.");
  const tenant = await getServerTenant();

  return prisma.$transaction(async (tx) => {
    const existing = await tx.customerContact.findFirst({
      where: { id, tenantId: tenant.id },
      select: { id: true, customerId: true, name: true, status: true },
    });
    if (!existing) throw new AppError(404, "Customer contact not found.");

    if (data.name && data.name !== existing.name) {
      const duplicate = await tx.customerContact.findFirst({
        where: {
          tenantId: tenant.id,
          customerId: existing.customerId,
          name: data.name,
          NOT: { id: existing.id },
        },
        select: { id: true },
      });
      if (duplicate) throw new AppError(409, "Contact name already exists for this customer.");
    }

    if (data.isPrimary) {
      await tx.customerContact.updateMany({
        where: { tenantId: tenant.id, customerId: existing.customerId, isPrimary: true, NOT: { id: existing.id } },
        data: { isPrimary: false },
      });
    }

    const contact = await tx.customerContact.update({
      where: { id: existing.id },
      data,
      select: customerContactSelect,
    });
    const action = actionForStatusChange(existing.status, data.status);

    await tx.operationLog.create({
      data: {
        tenantId: tenant.id,
        module: "customer_management",
        action,
        targetType: "CustomerContact",
        targetId: contact.id,
        detail: { customerId: existing.customerId, changedFields: Object.keys(data), status: contact.status },
      },
    });

    return contact;
  });
}

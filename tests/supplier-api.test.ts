import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { GET as getSupplierUnitRoute, PATCH as patchSupplierUnitRoute } from "../src/app/api/supplier-units/[id]/route";
import { GET as getSupplierRoute, PATCH as patchSupplierRoute } from "../src/app/api/suppliers/[id]/route";
import {
  GET as getSupplierUnitsRoute,
  POST as postSupplierUnitRoute,
} from "../src/app/api/suppliers/[id]/units/route";
import { GET as getSuppliersRoute, POST as postSupplierRoute } from "../src/app/api/suppliers/route";
import { apiErrorResponse } from "../src/server/api";
import { prisma } from "../src/lib/prisma";
import { getServerTenant } from "../src/server/tenant";

const runId = Date.now().toString();
const supplierPrefix = `API Supplier ${runId}`;
const otherTenantCode = `supplier-api-other-${runId}`;

let tenantId = "";
let baseSupplierId = "";
let inactiveSupplierId = "";
let otherTenantId = "";
let otherSupplierId = "";
let otherUnitId = "";

function routeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

function jsonRequest(url: string, method: "POST" | "PATCH", body: unknown) {
  return new Request(url, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function cleanup() {
  const suppliers = await prisma.supplier.findMany({
    where: {
      OR: [
        ...(tenantId ? [{ tenantId, name: { startsWith: supplierPrefix } }] : []),
        ...(otherTenantId ? [{ tenantId: otherTenantId }] : []),
      ],
    },
    select: { id: true, productionUnits: { select: { id: true } } },
  });
  const supplierIds = suppliers.map((supplier) => supplier.id);
  const unitIds = suppliers.flatMap((supplier) => supplier.productionUnits.map((unit) => unit.id));

  if (supplierIds.length > 0 || unitIds.length > 0) {
    await prisma.operationLog.deleteMany({
      where: { targetId: { in: [...supplierIds, ...unitIds] } },
    });
  }
  if (supplierIds.length > 0) {
    await prisma.supplier.deleteMany({ where: { id: { in: supplierIds } } });
  }
  if (otherTenantId) {
    await prisma.operationLog.deleteMany({ where: { tenantId: otherTenantId } });
    await prisma.tenant.deleteMany({ where: { id: otherTenantId } });
  }
}

before(async () => {
  const tenant = await getServerTenant();
  tenantId = tenant.id;
  await cleanup();

  const [baseSupplier, inactiveSupplier, otherTenant] = await Promise.all([
    prisma.supplier.create({
      data: {
        tenantId,
        name: `${supplierPrefix} Base`,
        roles: ["dyeing_factory", "printing_factory"],
        contactName: "Wang Manager",
        phone: "13800001111",
        status: "active",
      },
    }),
    prisma.supplier.create({
      data: {
        tenantId,
        name: `${supplierPrefix} Inactive`,
        roles: ["finishing_factory"],
        status: "inactive",
      },
    }),
    prisma.tenant.create({ data: { code: otherTenantCode, name: "Supplier API Other Tenant" } }),
  ]);

  baseSupplierId = baseSupplier.id;
  inactiveSupplierId = inactiveSupplier.id;
  otherTenantId = otherTenant.id;

  const otherSupplier = await prisma.supplier.create({
    data: {
      tenantId: otherTenantId,
      name: `${supplierPrefix} Other Tenant`,
      roles: ["dyeing_factory"],
    },
  });
  otherSupplierId = otherSupplier.id;

  const otherUnit = await prisma.supplierUnit.create({
    data: {
      tenantId: otherTenantId,
      supplierId: otherSupplierId,
      name: "Other Tenant Workshop",
      unitForm: "workshop",
      businessTypes: ["dyeing"],
    },
  });
  otherUnitId = otherUnit.id;
});

after(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe("supplier API", () => {
  test("creates, reads, searches, and filters suppliers with stable keys", async () => {
    const createResponse = await postSupplierRoute(
      jsonRequest("http://localhost/api/suppliers", "POST", {
        name: `  ${supplierPrefix} Created  `,
        roles: ["fabric_supplier", "trading_company", "fabric_supplier"],
        contactName: "  Chen Manager  ",
        phone: "13900002222",
        city: "Shaoxing",
      }),
    );
    const createdBody = await createResponse.json();

    assert.equal(createResponse.status, 201);
    assert.equal(createdBody.supplier.name, `${supplierPrefix} Created`);
    assert.deepEqual(createdBody.supplier.roles, ["fabric_supplier", "trading_company"]);
    assert.equal("tenantId" in createdBody.supplier, false);

    const detailResponse = await getSupplierRoute(
      new Request(`http://localhost/api/suppliers/${createdBody.supplier.id}`),
      routeContext(createdBody.supplier.id),
    );
    assert.equal(detailResponse.status, 200);
    assert.equal((await detailResponse.json()).supplier.contactName, "Chen Manager");

    for (const query of [
      `q=${encodeURIComponent(`${supplierPrefix} Created`)}&role=trading_company&status=active`,
      "q=Chen%20Manager&role=trading_company&status=active",
      "q=13900002222&role=trading_company&status=active&limit=20",
    ]) {
      const searchResponse = await getSuppliersRoute(new Request(`http://localhost/api/suppliers?${query}`));
      const searchBody = await searchResponse.json();
      assert.equal(searchResponse.status, 200);
      assert.equal(
        searchBody.suppliers.some((supplier: { id: string }) => supplier.id === createdBody.supplier.id),
        true,
      );
    }

    const log = await prisma.operationLog.findFirst({
      where: { tenantId, targetType: "Supplier", targetId: createdBody.supplier.id, action: "create" },
    });
    assert.ok(log);
  });

  test("updates and changes supplier status with operation logs", async () => {
    const response = await patchSupplierRoute(
      jsonRequest(`http://localhost/api/suppliers/${baseSupplierId}`, "PATCH", {
        specialties: "Polyester dyeing",
        status: "inactive",
      }),
      routeContext(baseSupplierId),
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.supplier.status, "inactive");
    assert.equal(body.supplier.specialties, "Polyester dyeing");
    assert.ok(
      await prisma.operationLog.findFirst({
        where: { tenantId, targetId: baseSupplierId, action: "deactivate" },
      }),
    );

    const reactivateResponse = await patchSupplierRoute(
      jsonRequest(`http://localhost/api/suppliers/${baseSupplierId}`, "PATCH", { status: "active" }),
      routeContext(baseSupplierId),
    );
    assert.equal(reactivateResponse.status, 200);
    assert.equal((await reactivateResponse.json()).supplier.status, "active");
  });

  test("rejects invalid supplier roles, status, protected tenantId, and malformed JSON", async () => {
    for (const payload of [
      { name: `${supplierPrefix} Invalid Role`, roles: ["unknown"] },
      { name: `${supplierPrefix} Invalid Status`, roles: ["fabric_supplier"], status: "paused" },
      { name: `${supplierPrefix} Forged Tenant`, roles: ["fabric_supplier"], tenantId: otherTenantId },
    ]) {
      const response = await postSupplierRoute(jsonRequest("http://localhost/api/suppliers", "POST", payload));
      assert.equal(response.status, 400);
    }

    const malformed = await postSupplierRoute(
      new Request("http://localhost/api/suppliers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{bad",
      }),
    );
    assert.equal(malformed.status, 400);
    assert.equal(
      await prisma.supplier.count({ where: { tenantId: otherTenantId, name: `${supplierPrefix} Forged Tenant` } }),
      0,
    );
  });

  test("isolates supplier reads and writes across tenants", async () => {
    const getResponse = await getSupplierRoute(
      new Request(`http://localhost/api/suppliers/${otherSupplierId}`),
      routeContext(otherSupplierId),
    );
    const patchResponse = await patchSupplierRoute(
      jsonRequest(`http://localhost/api/suppliers/${otherSupplierId}`, "PATCH", { name: "Leaked update" }),
      routeContext(otherSupplierId),
    );

    assert.equal(getResponse.status, 404);
    assert.equal(patchResponse.status, 404);
    assert.equal((await prisma.supplier.findUniqueOrThrow({ where: { id: otherSupplierId } })).name, `${supplierPrefix} Other Tenant`);
  });
});

describe("supplier production unit API", () => {
  let createdUnitId = "";

  test("creates a unit, deduplicates business types, and writes an operation log", async () => {
    const response = await postSupplierUnitRoute(
      jsonRequest(`http://localhost/api/suppliers/${baseSupplierId}/units`, "POST", {
        name: "  Dyeing Workshop One  ",
        unitForm: "workshop",
        businessTypes: ["dyeing", "finishing", "dyeing"],
        primaryBusiness: "Polyester woven dyeing",
        primaryProducts: "Pongee",
        processCapabilities: "High-temperature dyeing",
      }),
      routeContext(baseSupplierId),
    );
    const body = await response.json();

    assert.equal(response.status, 201);
    assert.equal(body.unit.name, "Dyeing Workshop One");
    assert.deepEqual(body.unit.businessTypes, ["dyeing", "finishing"]);
    assert.equal(body.unit.supplierId, baseSupplierId);
    assert.equal("tenantId" in body.unit, false);
    createdUnitId = body.unit.id;

    assert.ok(
      await prisma.operationLog.findFirst({
        where: { tenantId, targetType: "SupplierUnit", targetId: createdUnitId, action: "create" },
      }),
    );
  });

  test("reads, searches, and filters production units", async () => {
    const detailResponse = await getSupplierUnitRoute(
      new Request(`http://localhost/api/supplier-units/${createdUnitId}`),
      routeContext(createdUnitId),
    );
    assert.equal(detailResponse.status, 200);
    assert.equal((await detailResponse.json()).unit.supplier.id, baseSupplierId);

    for (const query of [
      "q=Dyeing%20Workshop",
      "q=Polyester%20woven",
      "q=High-temperature",
      "q=Pongee",
      "unitForm=workshop&businessType=finishing&status=active",
    ]) {
      const response = await getSupplierUnitsRoute(
        new Request(`http://localhost/api/suppliers/${baseSupplierId}/units?${query}`),
        routeContext(baseSupplierId),
      );
      const body = await response.json();
      assert.equal(response.status, 200);
      assert.equal(body.units.some((unit: { id: string }) => unit.id === createdUnitId), true);
    }
  });

  test("updates and pauses a unit without allowing ownership changes", async () => {
    const response = await patchSupplierUnitRoute(
      jsonRequest(`http://localhost/api/supplier-units/${createdUnitId}`, "PATCH", {
        managerName: "Li Manager",
        status: "paused",
      }),
      routeContext(createdUnitId),
    );
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.unit.status, "paused");
    assert.equal(body.unit.managerName, "Li Manager");
    assert.ok(
      await prisma.operationLog.findFirst({
        where: { tenantId, targetId: createdUnitId, action: "pause" },
      }),
    );

    for (const protectedPayload of [{ supplierId: inactiveSupplierId }, { tenantId: otherTenantId }]) {
      const protectedResponse = await patchSupplierUnitRoute(
        jsonRequest(`http://localhost/api/supplier-units/${createdUnitId}`, "PATCH", protectedPayload),
        routeContext(createdUnitId),
      );
      assert.equal(protectedResponse.status, 400);
    }

    const storedUnit = await prisma.supplierUnit.findUniqueOrThrow({ where: { id: createdUnitId } });
    assert.equal(storedUnit.tenantId, tenantId);
    assert.equal(storedUnit.supplierId, baseSupplierId);

    const reactivateResponse = await patchSupplierUnitRoute(
      jsonRequest(`http://localhost/api/supplier-units/${createdUnitId}`, "PATCH", { status: "active" }),
      routeContext(createdUnitId),
    );
    assert.equal(reactivateResponse.status, 200);
    assert.equal((await reactivateResponse.json()).unit.status, "active");
  });

  test("rejects invalid keys and an empty business type list", async () => {
    const payloads = [
      { name: "Bad Form", unitForm: "factory", businessTypes: ["dyeing"] },
      { name: "Bad Business", unitForm: "workshop", businessTypes: ["washing"] },
      { name: "Bad Status", unitForm: "workshop", businessTypes: ["dyeing"], status: "inactive" },
      { name: "No Business", unitForm: "workshop", businessTypes: [] },
    ];

    for (const payload of payloads) {
      const response = await postSupplierUnitRoute(
        jsonRequest(`http://localhost/api/suppliers/${baseSupplierId}/units`, "POST", payload),
        routeContext(baseSupplierId),
      );
      assert.equal(response.status, 400);
    }
  });

  test("maps duplicate unit names to 409", async () => {
    const response = await postSupplierUnitRoute(
      jsonRequest(`http://localhost/api/suppliers/${baseSupplierId}/units`, "POST", {
        name: "Dyeing Workshop One",
        unitForm: "department",
        businessTypes: ["dyeing"],
      }),
      routeContext(baseSupplierId),
    );
    assert.equal(response.status, 409);
  });

  test("does not create units under inactive suppliers", async () => {
    const response = await postSupplierUnitRoute(
      jsonRequest(`http://localhost/api/suppliers/${inactiveSupplierId}/units`, "POST", {
        name: "Blocked Unit",
        unitForm: "workshop",
        businessTypes: ["finishing"],
      }),
      routeContext(inactiveSupplierId),
    );
    assert.equal(response.status, 409);
  });

  test("isolates production unit reads, writes, and parent lists across tenants", async () => {
    const getResponse = await getSupplierUnitRoute(
      new Request(`http://localhost/api/supplier-units/${otherUnitId}`),
      routeContext(otherUnitId),
    );
    const patchResponse = await patchSupplierUnitRoute(
      jsonRequest(`http://localhost/api/supplier-units/${otherUnitId}`, "PATCH", { status: "paused" }),
      routeContext(otherUnitId),
    );
    const listResponse = await getSupplierUnitsRoute(
      new Request(`http://localhost/api/suppliers/${otherSupplierId}/units`),
      routeContext(otherSupplierId),
    );
    const createResponse = await postSupplierUnitRoute(
      jsonRequest(`http://localhost/api/suppliers/${otherSupplierId}/units`, "POST", {
        name: "Cross-tenant create",
        unitForm: "workshop",
        businessTypes: ["dyeing"],
      }),
      routeContext(otherSupplierId),
    );

    assert.equal(getResponse.status, 404);
    assert.equal(patchResponse.status, 404);
    assert.equal(listResponse.status, 404);
    assert.equal(createResponse.status, 404);
    assert.equal((await prisma.supplierUnit.findUniqueOrThrow({ where: { id: otherUnitId } })).status, "active");
  });
});

describe("supplier API error mapping", () => {
  test("maps unique conflicts and hides unexpected database details", async () => {
    const conflict = apiErrorResponse({ code: "P2002", meta: { target: ["tenantId", "supplierId", "name"] } });
    assert.equal(conflict.status, 409);
    assert.equal("meta" in (await conflict.json()), false);

    const originalConsoleError = console.error;
    console.error = () => undefined;
    try {
      const internal = apiErrorResponse(new Error("database password leaked"));
      assert.equal(internal.status, 500);
      assert.deepEqual(await internal.json(), { error: "Internal Server Error" });
    } finally {
      console.error = originalConsoleError;
    }
  });
});

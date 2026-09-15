import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  createSupplier,
  createSupplierUnit,
  fetchSuppliers,
  patchSupplier,
  patchSupplierUnit,
} from "../src/lib/api/supplier-client";
import type { SupplierRecord, SupplierUnitRecord } from "../src/lib/api/supplier-client";
import {
  createEmptySupplierForm,
  supplierFormToPayload,
  supplierRoleLabels,
  supplierStatusLabels,
  supplierToForm,
} from "../src/components/suppliers/supplier-prototype-data";
import {
  createEmptySupplierUnitForm,
  supplierUnitBusinessTypeLabels,
  supplierUnitFormLabels,
  supplierUnitFormToPayload,
  supplierUnitStatusLabels,
  supplierUnitToForm,
} from "../src/components/suppliers/supplier-unit-prototype-data";
import {
  canSubmitSupplierUnitForm,
  clearSupplierUnitFormError,
  validateSupplierUnitForm,
} from "../src/components/suppliers/supplier-unit-form-drawer";
import {
  canCreateSupplierUnit,
  createSupplierSelectionState,
  isCurrentSupplierRequest,
  isSupplierSelectionKey,
} from "../src/components/suppliers/supplier-management-state";

const supplier: SupplierRecord = {
  id: "supplier-real-1",
  name: "测试供应商",
  type: null,
  roles: ["fabric_supplier", "trading_company"],
  status: "active",
  country: "中国",
  city: "绍兴",
  address: null,
  contactName: "陈经理",
  phone: "13800000000",
  email: "chen@example.com",
  socialContact: null,
  specialties: "针织面料",
  defaultLeadTime: "7天",
  defaultMoq: "300kg",
  paymentTerms: null,
  cooperationComment: null,
  riskNote: null,
  remarks: null,
  createdAt: "2026-09-14T12:00:00.000Z",
  updatedAt: "2026-09-14T12:00:00.000Z",
  _count: { productionUnits: 1 },
};

const unit: SupplierUnitRecord = {
  id: "unit-real-1",
  supplierId: supplier.id,
  name: "染色一车间",
  unitForm: "workshop",
  businessTypes: ["dyeing", "finishing"],
  status: "active",
  primaryBusiness: "涤纶染色",
  primaryProducts: "春亚纺",
  materialScope: "涤纶",
  processCapabilities: "染色、定型",
  restrictions: null,
  defaultMoq: "500kg/色",
  regularLeadTime: "12天",
  peakLeadTime: "18天",
  supportsSampling: true,
  managerName: "王经理",
  phone: null,
  socialContact: null,
  qualityFeatures: null,
  riskNote: null,
  remarks: null,
  createdAt: "2026-09-14T12:00:00.000Z",
  updatedAt: "2026-09-14T12:00:00.000Z",
  supplier: { id: supplier.id, name: supplier.name, status: supplier.status },
};

describe("supplier UI API mapping", () => {
  test("resets supplier-scoped state before loading another supplier", () => {
    const secondSupplier = { ...supplier, id: "supplier-real-2", name: "第二家供应商" };
    const firstSelection = createSupplierSelectionState(supplier);
    const secondSelection = createSupplierSelectionState(secondSupplier);

    assert.equal(firstSelection.selectedId, supplier.id);
    assert.equal(secondSelection.selectedId, secondSupplier.id);
    assert.deepEqual(secondSelection.supplierUnits, []);
    assert.equal(secondSelection.selectedUnitId, null);
    assert.equal(secondSelection.detailUnit, null);
    assert.equal(secondSelection.detailError, "");
    assert.equal(secondSelection.unitsError, "");
    assert.equal(secondSelection.detailLoading, true);
    assert.equal(secondSelection.unitsLoading, true);
  });

  test("uses the same selection path for Enter and Space and ignores stale requests", () => {
    assert.equal(isSupplierSelectionKey("Enter"), true);
    assert.equal(isSupplierSelectionKey(" "), true);
    assert.equal(isSupplierSelectionKey("Escape"), false);
    assert.equal(isCurrentSupplierRequest(2, 2), true);
    assert.equal(isCurrentSupplierRequest(1, 2), false);
  });

  test("prevents creating production units for inactive suppliers", () => {
    assert.equal(canCreateSupplierUnit(supplier), true);
    assert.equal(canCreateSupplierUnit({ ...supplier, status: "inactive" }), false);
  });

  test("shows Chinese labels while retaining stable backend keys", () => {
    assert.equal(supplierRoleLabels.fabric_supplier, "面料供应商");
    assert.equal(supplierStatusLabels.active, "启用");
    assert.equal(supplierUnitFormLabels.workshop, "车间");
    assert.equal(supplierUnitBusinessTypeLabels.dyeing, "染色");
    assert.equal(supplierUnitStatusLabels.paused, "暂停合作");
  });

  test("maps controlled supplier form data to backend field names and keys", () => {
    const form = supplierToForm(supplier);
    form.roles.push("dyeing_factory");
    const payload = supplierFormToPayload(form);

    assert.deepEqual(payload.roles, ["fabric_supplier", "trading_company", "dyeing_factory"]);
    assert.equal(payload.status, "active");
    assert.equal(payload.defaultLeadTime, "7天");
    assert.equal(payload.defaultMoq, "300kg");
    assert.equal("tenantId" in payload, false);
    assert.deepEqual(supplier.roles, ["fabric_supplier", "trading_company"]);
  });

  test("maps controlled production-unit form data to backend field names and keys", () => {
    const form = supplierUnitToForm(unit);
    form.status = "paused";
    form.businessTypes.push("inspection");
    const payload = supplierUnitFormToPayload(form);

    assert.equal(payload.unitForm, "workshop");
    assert.deepEqual(payload.businessTypes, ["dyeing", "finishing", "inspection"]);
    assert.equal(payload.status, "paused");
    assert.equal(payload.regularLeadTime, "12天");
    assert.equal(payload.supportsSampling, true);
    assert.equal("supplierId" in payload, false);
  });

  test("keeps create defaults and production-unit validation", () => {
    const supplierForm = createEmptySupplierForm();
    const unitForm = createEmptySupplierUnitForm();
    unitForm.name = "测试单元";

    assert.equal(supplierForm.status, "active");
    assert.equal(unitForm.status, "active");
    assert.equal(unitForm.unitForm, "other");
    const errors = validateSupplierUnitForm(unitForm);
    assert.equal(errors.businessTypes, "请至少选择一个业务类型");
    assert.equal(canSubmitSupplierUnitForm(errors), false);
    unitForm.businessTypes = ["dyeing"];
    assert.equal(clearSupplierUnitFormError(errors, "businessTypes").businessTypes, undefined);
    assert.equal(canSubmitSupplierUnitForm(validateSupplierUnitForm(unitForm)), true);
  });

  test("sends status=all and real create/update requests", async () => {
    const originalFetch = globalThis.fetch;
    const requests: Array<{ url: string; method: string; body?: unknown }> = [];
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      requests.push({
        url,
        method: init?.method ?? "GET",
        body: typeof init?.body === "string" ? JSON.parse(init.body) : undefined,
      });
      const responseBody = url.includes("supplier-units") || url.includes("/units")
        ? { unit }
        : url.includes("/api/suppliers?")
          ? { suppliers: [supplier] }
          : { supplier };
      return Response.json(responseBody);
    }) as typeof fetch;

    try {
      await fetchSuppliers({ status: "all", role: "fabric_supplier", q: "测试", limit: 50 });
      await createSupplier(supplierFormToPayload(supplierToForm(supplier)));
      await patchSupplier(supplier.id, { status: "inactive" });
      await createSupplierUnit(supplier.id, supplierUnitFormToPayload(supplierUnitToForm(unit)));
      await patchSupplierUnit(unit.id, { status: "paused" });
    } finally {
      globalThis.fetch = originalFetch;
    }

    assert.match(requests[0].url, /status=all/);
    assert.match(requests[0].url, /role=fabric_supplier/);
    assert.equal(requests[1].method, "POST");
    assert.deepEqual((requests[1].body as { roles: string[] }).roles, ["fabric_supplier", "trading_company"]);
    assert.equal(requests[2].method, "PATCH");
    assert.deepEqual(requests[2].body, { status: "inactive" });
    assert.equal(requests[3].method, "POST");
    assert.equal((requests[3].body as { unitForm: string }).unitForm, "workshop");
    assert.equal(requests[4].method, "PATCH");
  });
});

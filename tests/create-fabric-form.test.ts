import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  addSupplierToDraft,
  buildCreateFabricPayload,
  changeProcessStatus,
  createInitialFabricFormState,
  getPricingUnit,
  getPricingUnitLabel,
  removeSupplierFromDraft,
  setPreferredSupplier,
  validateCreateFabricDraft,
} from "../src/components/fabrics/create-fabric-state";
import type { FabricFormState } from "../src/components/fabrics/create-fabric-state";
import { ApiClientError, createSingleFlightSubmitter, getCreateFabricErrorMessage } from "../src/lib/api/fabric-client";

function validDraft(): FabricFormState {
  return {
    ...createInitialFabricFormState(),
    codeSuffix: "UI-001",
    name: "精梳棉氨纶汗布",
    developmentSource: "market_purchase",
    status: "incomplete",
    composition: "95%棉 5%氨纶",
    weight: "180g",
    width: "165cm",
    greigeStatus: "none",
    dyeingStatus: "none",
    postProcessStatus: "none",
  };
}

describe("create fabric form state", () => {
  test("configuration labels remain display-only while payload submits keys", () => {
    const option = { key: "market_purchase", label: "市场采购" };
    const state = { ...validDraft(), developmentSource: option.key };
    const payload = buildCreateFabricPayload(state);

    assert.equal(option.label, "市场采购");
    assert.equal(payload.developmentSource, "market_purchase");
  });

  test("knitted displays kilograms and woven displays meters without sending pricingUnit", () => {
    assert.equal(getPricingUnit("knitted"), "kg");
    assert.equal(getPricingUnitLabel("knitted"), "公斤");
    assert.equal(getPricingUnit("woven"), "meter");
    assert.equal(getPricingUnitLabel("woven"), "米");
    assert.equal("pricingUnit" in buildCreateFabricPayload(validDraft()), false);
  });

  test("required field errors are mapped to their fields", () => {
    const errors = validateCreateFabricDraft(createInitialFabricFormState());
    assert.deepEqual(Object.keys(errors).sort(), ["codeSuffix", "composition", "developmentSource", "name", "weight", "width"]);
  });

  test("empty purchase price is not converted to zero", () => {
    let state = validDraft();
    state = addSupplierToDraft(state, { id: "supplier-a", name: "供应商A" }, "draft-a").state;
    state.suppliers[0].initialQuote.contactName = "张三";

    const errors = validateCreateFabricDraft(state);
    const payload = buildCreateFabricPayload(state);
    assert.equal(errors["suppliers.0.initialQuote.purchasePrice"], "填写首次报价时，采购价不能为空");
    assert.equal(payload.suppliers[0].initialQuote?.purchasePrice, undefined);
  });

  test("multiple suppliers can be added and removed", () => {
    let state = validDraft();
    state = addSupplierToDraft(state, { id: "supplier-a", name: "供应商A" }, "draft-a").state;
    state = addSupplierToDraft(state, { id: "supplier-b", name: "供应商B" }, "draft-b").state;
    assert.equal(state.suppliers.length, 2);

    state = removeSupplierFromDraft(state, "draft-a");
    assert.equal(state.suppliers.length, 1);
    assert.equal(state.suppliers[0].supplierId, "supplier-b");
    assert.equal(state.suppliers[0].isPreferred, true);
  });

  test("duplicate suppliers are blocked", () => {
    const state = addSupplierToDraft(validDraft(), { id: "supplier-a", name: "供应商A" }, "draft-a").state;
    const duplicate = addSupplierToDraft(state, { id: "supplier-a", name: "供应商A" }, "draft-b");
    assert.equal(duplicate.error, "同一家供应商不能重复添加");
    assert.equal(duplicate.state.suppliers.length, 1);
  });

  test("setting a preferred supplier keeps the choice unique", () => {
    let state = addSupplierToDraft(validDraft(), { id: "supplier-a", name: "供应商A" }, "draft-a").state;
    state = addSupplierToDraft(state, { id: "supplier-b", name: "供应商B" }, "draft-b").state;
    state = setPreferredSupplier(state, "draft-b");
    assert.deepEqual(state.suppliers.map((supplier) => supplier.isPreferred), [false, true]);
  });

  test("switching a process to none clears its hidden details", () => {
    let state = validDraft();
    state.greigeStatus = "available";
    state.greige.name = "测试坯布";
    state = changeProcessStatus(state, "greige", "none");
    assert.equal(state.greige.name, "");
    assert.equal(buildCreateFabricPayload(state).greige, undefined);

    state.postProcessStatus = "available";
    state.postProcesses = [{
      id: "post-a", processType: "foil_stamping", factoryId: "", factoryName: "", effectDescription: "", unitPrice: "",
      lossRate: "", minimumOrderQty: "", leadTime: "", riskNotes: "", remarks: "",
    }];
    state = changeProcessStatus(state, "postProcess", "none");
    assert.equal(state.postProcesses.length, 0);
  });

  test("single-flight submission sends one request for simultaneous saves", async () => {
    let requestCount = 0;
    let resolveRequest!: (value: { ok: boolean }) => void;
    const request = createSingleFlightSubmitter(async () => {
      requestCount += 1;
      return new Promise<{ ok: boolean }>((resolve) => { resolveRequest = resolve; });
    });

    const first = request({ code: "SDD-A" });
    const second = request({ code: "SDD-A" });
    assert.equal(requestCount, 1);
    assert.equal(first, second);
    resolveRequest({ ok: true });
    await first;
  });

  test("409 and 400 errors use safe user-facing messages", () => {
    assert.equal(getCreateFabricErrorMessage(new ApiClientError(409, "Resource already exists.")), "该面料编号已存在");
    assert.equal(getCreateFabricErrorMessage(new ApiClientError(400, "Invalid payload.")), "请检查新增面料信息，修正标记字段后再保存");
  });

  test("tenantId is never included in the create payload", () => {
    const payload = buildCreateFabricPayload(validDraft());
    assert.equal("tenantId" in payload, false);
    assert.equal(JSON.stringify(payload).includes("tenantId"), false);
  });
});

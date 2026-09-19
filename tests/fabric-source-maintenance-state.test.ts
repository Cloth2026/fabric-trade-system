import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  buildQuotePayload,
  buildSourcePayload,
  buildSourceUpdatePayload,
  createEmptyQuoteDraft,
  createEmptySourceDraft,
  createSourceDraftFromSource,
  validateQuoteDraft,
  validateSourceDraft,
  type QuoteDraft,
  type SourceDraft,
} from "../src/components/fabrics/fabric-source-maintenance-state";
import type { FabricSupplierSource } from "../src/lib/api/fabric-client";

function sourceFixture(overrides: Partial<FabricSupplierSource> = {}): FabricSupplierSource {
  return {
    id: "source-1",
    supplierId: "supplier-1",
    supplierUnitId: null,
    supplierFabricCode: "SUP-001",
    sampleStatus: "pending_sample",
    qualityDifferences: null,
    isPreferred: true,
    remarks: null,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    supplier: { id: "supplier-1", name: "供应商一", status: "active" },
    supplierUnit: null,
    quotes: [],
    ...overrides,
  };
}

function sourceDraftFixture(overrides: Partial<SourceDraft> = {}): SourceDraft {
  return {
    supplierId: "supplier-1",
    supplierName: "供应商一",
    supplierUnit: null,
    supplierFabricCode: "SUP-001",
    sampleStatus: "pending_sample",
    qualityDifferences: "",
    remarks: "",
    isPreferred: false,
    ...overrides,
  };
}

function quoteDraftFixture(overrides: Partial<QuoteDraft> = {}): QuoteDraft {
  return {
    purchasePrice: "18.50",
    currency: "CNY",
    minimumOrderQty: "",
    leadTime: "",
    contactName: "",
    quoteDate: "2026-09-19",
    supplierUnit: null,
    qualityDifferences: "",
    remarks: "",
    ...overrides,
  };
}

describe("validateSourceDraft", () => {
  test("missing supplier is rejected", () => {
    const errors = validateSourceDraft(sourceDraftFixture({ supplierId: "", supplierName: "" }), []);
    assert.match(errors.supplier, /请先搜索并选择供应商/);
  });

  test("duplicate supplier is rejected", () => {
    const errors = validateSourceDraft(sourceDraftFixture(), [sourceFixture()]);
    assert.match(errors.supplier, /只能保留一条长期货源关系/);
  });

  test("new supplier passes", () => {
    const errors = validateSourceDraft(sourceDraftFixture({ supplierId: "supplier-2" }), [sourceFixture()]);
    assert.equal(Object.keys(errors).length, 0);
  });
});

describe("source drafts", () => {
  test("createSourceDraftFromSource maps persisted source", () => {
    const unit = { id: "unit-1", name: "染色一车间", unitForm: "workshop", status: "active" };
    const draft = createSourceDraftFromSource(
      sourceFixture({ supplierUnitId: unit.id, supplierUnit: unit, supplierFabricCode: "YJ-01" }),
    );
    assert.equal(draft.supplierId, "supplier-1");
    assert.equal(draft.supplierUnit?.id, "unit-1");
    assert.equal(draft.supplierFabricCode, "YJ-01");
    assert.equal(draft.isPreferred, true);
  });

  test("empty draft has no selection", () => {
    const draft = createEmptySourceDraft();
    assert.equal(draft.supplierId, "");
    assert.equal(draft.supplierUnit, null);
    assert.equal(draft.isPreferred, false);
  });
});

describe("source payloads", () => {
  test("buildSourcePayload trims and nulls empty strings", () => {
    const payload = buildSourcePayload(
      sourceDraftFixture({ supplierFabricCode: "  ", qualityDifferences: " 手感偏硬 ", remarks: "" }),
    );
    assert.equal(payload.supplierFabricCode, null);
    assert.equal(payload.qualityDifferences, "手感偏硬");
    assert.equal(payload.remarks, null);
    assert.equal(payload.isPreferred, false);
  });

  test("buildSourceUpdatePayload carries unit id or null", () => {
    const unit = { id: "unit-1", name: "染色一车间", unitForm: "workshop", status: "active" };
    const withUnit = buildSourceUpdatePayload(sourceDraftFixture({ supplierUnit: unit }));
    const withoutUnit = buildSourceUpdatePayload(sourceDraftFixture());
    assert.equal(withUnit.supplierUnitId, "unit-1");
    assert.equal(withoutUnit.supplierUnitId, null);
  });
});

describe("quote drafts and payloads", () => {
  test("empty price is rejected", () => {
    const errors = validateQuoteDraft(quoteDraftFixture({ purchasePrice: "" }));
    assert.match(errors.purchasePrice, /不能为空/);
  });

  test("negative price is rejected", () => {
    const errors = validateQuoteDraft(quoteDraftFixture({ purchasePrice: "-1" }));
    assert.match(errors.purchasePrice, /非负数/);
  });

  test("invalid currency is rejected", () => {
    const errors = validateQuoteDraft(quoteDraftFixture({ currency: "人民币" }));
    assert.match(errors.currency, /3位大写代码/);
  });

  test("buildQuotePayload defaults currency to CNY and nulls blanks", () => {
    const payload = buildQuotePayload(quoteDraftFixture({ currency: "", minimumOrderQty: " 300kg ", remarks: "" }));
    assert.equal(payload.currency, "CNY");
    assert.equal(payload.minimumOrderQty, "300kg");
    assert.equal(payload.remarks, null);
    assert.equal(payload.supplierUnitId, null);
  });

  test("buildQuotePayload keeps explicit unit as snapshot", () => {
    const unit = { id: "unit-1", name: "染色一车间", unitForm: "workshop", status: "active" };
    const payload = buildQuotePayload(quoteDraftFixture({ supplierUnit: unit }));
    assert.equal(payload.supplierUnitId, "unit-1");
  });

  test("empty quote draft defaults to today with CNY", () => {
    const draft = createEmptyQuoteDraft(new Date("2026-09-19T08:00:00.000Z"));
    assert.equal(draft.currency, "CNY");
    assert.equal(draft.quoteDate, "2026-09-19");
  });
});

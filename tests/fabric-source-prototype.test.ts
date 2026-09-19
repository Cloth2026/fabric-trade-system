import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { FabricQuote, FabricSupplierSource } from "../src/lib/api/fabric-client";
import {
  addPrototypeQuoteToSource,
  addPrototypeSource,
  createEmptySourceDraft,
  hasPrototypeEntries,
  isPrototypeEntry,
  setPrototypePreferredSource,
  sortQuotesDesc,
  updatePrototypeSource,
  validateQuoteDraft,
  validateSourceDraft,
  type QuoteDraft,
  type SourceDraft,
} from "../src/components/fabrics/fabric-source-prototype-state";

function sourceFixture(overrides: Partial<FabricSupplierSource> = {}): FabricSupplierSource {
  return {
    id: "source-1",
    supplierId: "supplier-1",
    supplierUnitId: null,
    supplierFabricCode: "G-1001",
    sampleStatus: "pending",
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

function quoteFixture(overrides: Partial<FabricQuote> = {}): FabricQuote {
  return {
    id: "quote-1",
    supplierUnitId: null,
    supplierUnit: null,
    purchasePrice: "12.50",
    currency: "CNY",
    pricingUnit: "kg",
    minimumOrderQty: null,
    leadTime: null,
    contactName: null,
    quoteDate: "2026-09-01",
    qualityDifferences: null,
    remarks: null,
    createdAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

function sourceDraftFixture(overrides: Partial<SourceDraft> = {}): SourceDraft {
  return {
    supplierId: "supplier-2",
    supplierName: "供应商二",
    supplierUnit: null,
    supplierFabricCode: "G-2002",
    sampleStatus: "",
    qualityDifferences: "",
    remarks: "",
    isPreferred: false,
    ...overrides,
  };
}

function quoteDraftFixture(overrides: Partial<QuoteDraft> = {}): QuoteDraft {
  return {
    purchasePrice: "15.80",
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
  test("rejects missing supplier", () => {
    const errors = validateSourceDraft(createEmptySourceDraft(), []);
    assert.equal(errors.supplier, "请先搜索并选择供应商");
  });

  test("rejects duplicate supplier relationship", () => {
    const errors = validateSourceDraft(sourceDraftFixture({ supplierId: "supplier-1" }), [sourceFixture()]);
    assert.match(errors.supplier ?? "", /只能保留一条长期货源关系/);
  });

  test("accepts a new supplier", () => {
    const errors = validateSourceDraft(sourceDraftFixture(), [sourceFixture()]);
    assert.equal(Object.keys(errors).length, 0);
  });
});

describe("addPrototypeSource", () => {
  test("first source automatically becomes preferred", () => {
    const { sources, error } = addPrototypeSource([], sourceDraftFixture());
    assert.equal(error, undefined);
    assert.equal(sources.length, 1);
    assert.equal(sources[0].isPreferred, true);
    assert.equal(isPrototypeEntry(sources[0].id), true);
    assert.equal(sources[0].supplier.name, "供应商二");
  });

  test("second source is not preferred unless requested", () => {
    const { sources } = addPrototypeSource([sourceFixture()], sourceDraftFixture());
    assert.equal(sources.length, 2);
    assert.equal(sources[0].isPreferred, true);
    assert.equal(sources[1].isPreferred, false);
  });

  test("marking a new source preferred demotes the old preferred", () => {
    const { sources } = addPrototypeSource([sourceFixture()], sourceDraftFixture({ isPreferred: true }));
    assert.equal(sources.find((source) => source.id === "source-1")?.isPreferred, false);
    assert.equal(sources.find((source) => isPrototypeEntry(source.id))?.isPreferred, true);
  });

  test("duplicate supplier is rejected without mutating state", () => {
    const { sources, error } = addPrototypeSource([sourceFixture()], sourceDraftFixture({ supplierId: "supplier-1" }));
    assert.match(error ?? "", /一条长期货源关系/);
    assert.equal(sources.length, 1);
  });
});

describe("updatePrototypeSource and preferred handling", () => {
  test("updates maintenance fields and keeps id stable", () => {
    const updated = updatePrototypeSource(
      [sourceFixture()],
      "source-1",
      sourceDraftFixture({ supplierId: "supplier-1", supplierName: "供应商一", supplierFabricCode: "G-9999", sampleStatus: "approved" }),
    );
    assert.equal(updated[0].id, "source-1");
    assert.equal(updated[0].supplierFabricCode, "G-9999");
    assert.equal(updated[0].sampleStatus, "approved");
  });

  test("setPrototypePreferredSource keeps exactly one preferred source", () => {
    const sources = [sourceFixture(), sourceFixture({ id: "source-2", supplierId: "supplier-2", supplier: { id: "supplier-2", name: "供应商二", status: "active" }, isPreferred: false })];
    const updated = setPrototypePreferredSource(sources, "source-2");
    assert.equal(updated.find((source) => source.id === "source-1")?.isPreferred, false);
    assert.equal(updated.find((source) => source.id === "source-2")?.isPreferred, true);
  });
});

describe("validateQuoteDraft", () => {
  test("requires purchase price", () => {
    const errors = validateQuoteDraft(quoteDraftFixture({ purchasePrice: " " }));
    assert.equal(errors.purchasePrice, "采购价不能为空");
  });

  test("rejects negative or non-numeric price", () => {
    assert.match(validateQuoteDraft(quoteDraftFixture({ purchasePrice: "-1" })).purchasePrice ?? "", /非负数/);
    assert.match(validateQuoteDraft(quoteDraftFixture({ purchasePrice: "abc" })).purchasePrice ?? "", /非负数/);
  });

  test("rejects invalid currency code", () => {
    const errors = validateQuoteDraft(quoteDraftFixture({ currency: "RMB1" }));
    assert.match(errors.currency ?? "", /3位大写代码/);
  });

  test("accepts a valid quote", () => {
    assert.equal(Object.keys(validateQuoteDraft(quoteDraftFixture())).length, 0);
  });
});

describe("addPrototypeQuoteToSource", () => {
  test("newer quote becomes latest and history keeps order", () => {
    const existing = quoteFixture({ quoteDate: "2026-08-01" });
    const older = quoteFixture({ id: "quote-0", quoteDate: "2026-07-01" });
    const withHistory = [sourceFixture({ quotes: sortQuotesDesc([existing, older]) })];
    const { sources, error } = addPrototypeQuoteToSource(withHistory, "source-1", quoteDraftFixture({ quoteDate: "2026-09-19" }), "kg");
    assert.equal(error, undefined);

    const quotes = sources[0].quotes;
    assert.equal(quotes.length, 3);
    assert.equal(isPrototypeEntry(quotes[0].id), true);
    assert.equal(quotes[1].id, "quote-1");
    assert.equal(quotes[2].id, "quote-0");
  });

  test("older quote is inserted after newer history", () => {
    const withHistory = [sourceFixture({ quotes: [quoteFixture({ quoteDate: "2026-09-01" })] })];
    const { sources } = addPrototypeQuoteToSource(withHistory, "source-1", quoteDraftFixture({ quoteDate: "2026-08-15" }), "meter");
    assert.equal(sources[0].quotes[0].id, "quote-1");
    assert.equal(isPrototypeEntry(sources[0].quotes[1].id), true);
    assert.equal(sources[0].quotes[1].pricingUnit, "meter");
  });

  test("invalid quote is rejected without mutation", () => {
    const withHistory = [sourceFixture({ quotes: [quoteFixture()] })];
    const { sources, error } = addPrototypeQuoteToSource(withHistory, "source-1", quoteDraftFixture({ purchasePrice: "" }), "kg");
    assert.match(error ?? "", /采购价/);
    assert.equal(sources[0].quotes.length, 1);
  });

  test("quote keeps its own supplier unit snapshot", () => {
    const unit = { id: "unit-1", name: "染色一车间", unitForm: "workshop", status: "active" };
    const { sources } = addPrototypeQuoteToSource([sourceFixture()], "source-1", quoteDraftFixture({ supplierUnit: unit }), "kg");
    const quote = sources[0].quotes[0];
    assert.equal(quote.supplierUnitId, "unit-1");
    assert.equal(quote.supplierUnit?.name, "染色一车间");
  });

  test("quote without unit inherits source current unit", () => {
    const unit = { id: "unit-1", name: "染色一车间", unitForm: "workshop", status: "active" };
    const { sources } = addPrototypeQuoteToSource([sourceFixture({ supplierUnit: unit })], "source-1", quoteDraftFixture(), "kg");
    const quote = sources[0].quotes[0];
    assert.equal(quote.supplierUnitId, "unit-1");
    assert.equal(quote.supplierUnit?.name, "染色一车间");
  });

  test("quote without unit stays empty when source has no unit", () => {
    const { sources } = addPrototypeQuoteToSource([sourceFixture({ supplierUnit: null })], "source-1", quoteDraftFixture(), "kg");
    assert.equal(sources[0].quotes[0].supplierUnitId, null);
  });

  test("unknown source id is rejected without mutation", () => {
    const persisted = [sourceFixture()];
    const { sources, error } = addPrototypeQuoteToSource(persisted, "missing-source", quoteDraftFixture(), "kg");
    assert.match(error ?? "", /未找到对应货源/);
    assert.equal(sources[0].quotes.length, 0);
  });
});

describe("hasPrototypeEntries", () => {
  test("false for persisted data only", () => {
    assert.equal(hasPrototypeEntries([sourceFixture({ quotes: [quoteFixture()] })]), false);
  });

  test("true for prototype sources or quotes", () => {
    const prototypeSource = addPrototypeSource([], sourceDraftFixture()).sources[0];
    assert.equal(hasPrototypeEntries([sourceFixture(), prototypeSource]), true);

    const withPrototypeQuote = addPrototypeQuoteToSource([sourceFixture()], "source-1", quoteDraftFixture(), "kg").sources;
    assert.equal(hasPrototypeEntries(withPrototypeQuote), true);
  });
});

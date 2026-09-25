import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  buildFabricListRequest,
  createConfigLabelMap,
  defaultFabricLibraryView,
  formatPrice,
  getConfigLabel,
  getFabricLibraryMetrics,
  getQuoteSupplierUnitLabel,
  initialFabricLibraryFilters,
  nextFabricRefreshToken,
  toFabricListDisplayData,
} from "../src/components/fabrics/fabric-library-prototype-data";
import {
  createInitialFabricDetailDrawerState,
  getFabricDetailDrawerKey,
  startFabricDetailDrawerClose,
} from "../src/components/fabrics/fabric-detail-drawer";
import {
  buildFabricListQuery,
  createLatestRequestGuard,
  type FabricListItem,
  type FabricQuote,
} from "../src/lib/api/fabric-client";

function listItem(overrides: Partial<FabricListItem> = {}): FabricListItem {
  return {
    id: "fabric-a",
    code: "SDD-API-001",
    name: "真实面料",
    englishName: null,
    fabricType: "knitted",
    pricingUnit: "kg",
    composition: "95%棉 5%氨纶",
    weight: "180g/m²",
    width: "165cm",
    yarnCount: "32S",
    warpWeftDensity: null,
    developmentSource: "market_purchase",
    status: "sellable",
    completenessPercent: 92,
    missingInfoFlags: [],
    createdAt: "2026-09-15T08:00:00.000Z",
    updatedAt: "2026-09-15T09:00:00.000Z",
    supplierSourceCount: 0,
    preferredSupplierSource: null,
    ...overrides,
  };
}

function quote(overrides: Partial<FabricQuote> = {}): FabricQuote {
  return {
    id: "quote-a",
    supplierUnitId: "unit-history",
    supplierUnit: { id: "unit-history", name: "历史染色二车间", unitForm: "workshop", status: "paused" },
    purchasePriceExclTax: "24.80",
    purchasePriceInclTax: "28.02",
    purchaseTaxRate: "0.13",
    currency: "CNY",
    pricingUnit: "kg",
    minimumOrderQty: "500kg/色",
    leadTime: "12天",
    contactName: "李经理",
    quoteDate: "2026-09-10T00:00:00.000Z",
    qualityDifferences: null,
    remarks: null,
    createdAt: "2026-09-10T01:00:00.000Z",
    ...overrides,
  };
}

describe("fabric library API presentation", () => {
  test("converts API list data into safe display values without changing Decimal strings", () => {
    const labels = createConfigLabelMap([{ group: "fabric_status", key: "sellable", label: "可销售", sortOrder: 1 }]);
    const item = listItem({
      supplierSourceCount: 1,
      preferredSupplierSource: {
        id: "source-a",
        supplierId: "supplier-a",
        supplierName: "绍兴真实供应商",
        supplierUnitId: null,
        supplierUnitName: null,
        supplierFabricCode: null,
        sampleStatus: null,
        latestQuote: {
          id: "quote-a",
          purchasePriceExclTax: "24.80",
          purchasePriceInclTax: "28.02",
          purchaseTaxRate: "0.13",
          currency: "CNY",
          pricingUnit: "kg",
          minimumOrderQty: null,
          leadTime: null,
          contactName: null,
          quoteDate: "2026-09-10T00:00:00.000Z",
          qualityDifferences: null,
          remarks: null,
          createdAt: "2026-09-10T01:00:00.000Z",
        },
      },
    });

    const display = toFabricListDisplayData(item, labels);
    assert.equal(display.typeLabel, "针织");
    assert.equal(display.statusLabel, "可销售");
    assert.equal(display.latestPrice, "¥24.80/公斤");
    assert.equal(display.supplierName, "绍兴真实供应商");
    assert.equal(display.supplierUnitName, "未指定生产单元");
  });

  test("maps stable English keys to Chinese config labels", () => {
    const labels = createConfigLabelMap([
      { group: "development_source", key: "customer_sample", label: "客户来样", sortOrder: 1 },
      { group: "sample_status", key: "tested", label: "已测试", sortOrder: 1 },
    ]);
    assert.equal(getConfigLabel(labels, "development_source", "customer_sample"), "客户来样");
    assert.equal(getConfigLabel(labels, "sample_status", "tested"), "已测试");
  });

  test("uses explicit empty states for missing sources, quotes, and fields", () => {
    const display = toFabricListDisplayData(listItem(), createConfigLabelMap([]));
    assert.equal(display.supplierName, "暂无货源");
    assert.equal(display.supplierUnitName, "未指定生产单元");
    assert.equal(display.latestPrice, "待报价");
    assert.equal(formatPrice(null, null, null), "待报价");
    assert.equal(getConfigLabel({}, "sample_status", null), "待补充");
  });

  test("builds API search, filter, and pagination query parameters", () => {
    const request = buildFabricListRequest({
      query: "  四面弹  ",
      type: "woven",
      status: "sellable",
      developmentSource: "market_purchase",
      completeness: "complete",
    }, "四面弹", 3);
    const params = buildFabricListQuery(request);

    assert.deepEqual(Object.fromEntries(params), {
      q: "四面弹",
      fabricType: "woven",
      status: "sellable",
      developmentSource: "market_purchase",
      completeness: "complete",
      page: "3",
      pageSize: "20",
    });
  });

  test("prevents stale list and detail requests from becoming current", () => {
    for (const resource of ["list", "detail"]) {
      const guard = createLatestRequestGuard();
      const oldRequest = guard.begin();
      const currentRequest = guard.begin();
      assert.equal(guard.isLatest(oldRequest), false, resource);
      assert.equal(guard.isLatest(currentRequest), true, resource);
      guard.invalidate();
      assert.equal(guard.isLatest(currentRequest), false, `${resource} unmount`);
    }
  });

  test("uses each historical quote production unit instead of the source current unit", () => {
    const historicalQuote = quote();
    const noUnitQuote = quote({ id: "quote-no-unit", supplierUnitId: null, supplierUnit: null });

    assert.equal(getQuoteSupplierUnitLabel(historicalQuote), "历史染色二车间 · 车间");
    assert.equal(getQuoteSupplierUnitLabel(noUnitQuote), "未关联生产单元");
    assert.notEqual(historicalQuote.supplierUnitId, "unit-current");
  });

  test("supports multiple real supplier sources in detail data", () => {
    const sources = [
      { id: "source-a", quotes: [quote()] },
      { id: "source-b", quotes: [] },
    ];
    assert.equal(sources.length, 2);
    assert.equal(sources[0].quotes[0].supplierUnit?.id, "unit-history");
    assert.equal(sources[1].quotes.length, 0);
  });

  test("refreshes the list token after a successful create callback", () => {
    assert.equal(nextFabricRefreshToken(4), 5);
  });

  test("keeps table default and reports metrics from real current-page data", () => {
    assert.equal(defaultFabricLibraryView, "table");
    assert.equal("selectedFabric" in initialFabricLibraryFilters, false);
    assert.deepEqual(
      getFabricLibraryMetrics([listItem(), listItem({ id: "fabric-b", status: "incomplete", completenessPercent: 60 })], 8, new Date("2026-09-15T00:00:00.000Z")),
      { total: 8, sellable: 1, incomplete: 1, addedThisMonth: 2 },
    );
  });
});

describe("fabric detail drawer lifecycle", () => {
  test("resets closing state, active tab, and notice before reopening", () => {
    const openState = { ...createInitialFabricDetailDrawerState(), activeTab: "suppliers" as const, notice: "后续开放" };
    assert.equal(startFabricDetailDrawerClose(openState).isClosing, true);
    assert.deepEqual(createInitialFabricDetailDrawerState(), { activeTab: "basic", isClosing: false, notice: "", noticeTone: "success" });
  });

  test("uses a fresh drawer key for close and different selected IDs", () => {
    assert.equal(getFabricDetailDrawerKey("fabric-a"), "fabric-a");
    assert.equal(getFabricDetailDrawerKey(null), "closed");
    assert.equal(getFabricDetailDrawerKey("fabric-b"), "fabric-b");
  });
});

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  defaultFabricLibraryView,
  fabricLibraryPrototypes,
  filterFabricLibrary,
  getFabricLibraryMetrics,
  getPreferredFabricSource,
  initialFabricLibraryFilters,
} from "../src/components/fabrics/fabric-library-prototype-data";

describe("fabric library static redesign prototype", () => {
  test("defaults to the professional table without an initial selected fabric", () => {
    assert.equal(defaultFabricLibraryView, "table");
    assert.equal("selectedFabric" in initialFabricLibraryFilters, false);
  });

  test("searches codes, names, composition, supplier names, and supplier fabric codes", () => {
    const search = (query: string) => filterFabricLibrary(fabricLibraryPrototypes, { ...initialFabricLibraryFilters, query });

    assert.equal(search("SDD-WV-2608-033")[0]?.name, "烫金植绒斜纹布");
    assert.equal(search("Polyester Sports Mesh")[0]?.code, "SDD-KN-2608-018");
    assert.equal(search("65%涤纶")[0]?.code, "SDD-WV-2609-014");
    assert.equal(search("海宁恒丰")[0]?.code, "SDD-WV-2608-033");
    assert.equal(search("HT-32S-SP")[0]?.code, "SDD-KN-2609-001");
  });

  test("combines type, status, source, and completeness filters", () => {
    const filtered = filterFabricLibrary(fabricLibraryPrototypes, {
      ...initialFabricLibraryFilters,
      type: "woven",
      status: "incomplete",
      developmentSource: "market_purchase",
      completeness: "needs_attention",
    });

    assert.deepEqual(filtered.map((fabric) => fabric.code), ["SDD-WV-2609-014"]);
  });

  test("reports the four approved metrics without combining inventory units", () => {
    const metrics = getFabricLibraryMetrics(fabricLibraryPrototypes);

    assert.deepEqual(metrics, { total: 4, sellable: 3, incomplete: 1, addedThisMonth: 2 });
    assert.equal("inventory" in metrics, false);
  });

  test("keeps multiple supplier sources with company, production unit, and quote history", () => {
    const fabric = fabricLibraryPrototypes.find((item) => item.code === "SDD-WV-2608-033");
    assert.ok(fabric);
    assert.equal(fabric.supplierSources.length, 3);
    assert.equal(getPreferredFabricSource(fabric)?.supplierUnitName, "特种工艺车间");
    assert.equal(fabric.supplierSources.every((source) => source.quoteHistoryCount > 0), true);
  });

  test("does not include color in the V1 static list or detail data", () => {
    assert.equal(fabricLibraryPrototypes.some((fabric) => "color" in fabric), false);
  });
});

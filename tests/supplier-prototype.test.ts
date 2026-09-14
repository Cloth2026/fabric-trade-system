import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  createEmptySupplierForm,
  filterSupplierPrototypes,
  initialSupplierPrototypes,
  supplierToForm,
} from "../src/components/suppliers/supplier-prototype-data";

describe("supplier management static prototype", () => {
  test("includes six suppliers with multi-role examples", () => {
    assert.equal(initialSupplierPrototypes.length, 6);
    assert.deepEqual(initialSupplierPrototypes[0].roles, ["面料供应商", "贸易商"]);
  });

  test("searches by supplier name, contact, and phone", () => {
    const filters = { role: "全部角色" as const, status: "全部状态" as const };

    assert.equal(filterSupplierPrototypes(initialSupplierPrototypes, { ...filters, query: "宏达" })[0].name, "盛泽宏达织造厂");
    assert.equal(filterSupplierPrototypes(initialSupplierPrototypes, { ...filters, query: "何敏" })[0].name, "广州中大市场A12档");
    assert.equal(filterSupplierPrototypes(initialSupplierPrototypes, { ...filters, query: "7166" })[0].name, "吴江新彩染整有限公司");
  });

  test("filters by role and cooperation status", () => {
    const dyeingSuppliers = filterSupplierPrototypes(initialSupplierPrototypes, {
      query: "",
      role: "染厂",
      status: "全部状态",
    });
    const inactiveSuppliers = filterSupplierPrototypes(initialSupplierPrototypes, {
      query: "",
      role: "全部角色",
      status: "停用",
    });

    assert.deepEqual(dyeingSuppliers.map((supplier) => supplier.name), ["吴江新彩染整有限公司"]);
    assert.deepEqual(inactiveSuppliers.map((supplier) => supplier.name), ["海宁恒丰后整理厂"]);
  });

  test("create defaults and edit conversion keep controlled form data isolated", () => {
    const emptyForm = createEmptySupplierForm();
    const editForm = supplierToForm(initialSupplierPrototypes[0]);

    assert.equal(emptyForm.status, "启用");
    assert.deepEqual(emptyForm.roles, []);
    assert.equal(editForm.name, "绍兴柯桥针织面料有限公司");
    editForm.roles.push("染厂");
    assert.deepEqual(initialSupplierPrototypes[0].roles, ["面料供应商", "贸易商"]);
  });
});

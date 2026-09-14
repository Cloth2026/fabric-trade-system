export const supplierRoles = [
  "fabric_supplier",
  "greige_supplier",
  "weaving_factory",
  "dyeing_factory",
  "printing_factory",
  "finishing_factory",
  "market_stall",
  "trading_company",
] as const;

export const supplierStatuses = ["active", "inactive"] as const;

export const supplierUnitForms = [
  "branch",
  "business_unit",
  "workshop",
  "department",
  "production_line",
  "outsourced_site",
  "other",
] as const;

export const supplierUnitBusinessTypes = [
  "greige",
  "weaving",
  "dyeing",
  "printing",
  "finishing",
  "coating",
  "laminating",
  "inspection",
  "other",
] as const;

export const supplierUnitStatuses = ["active", "paused"] as const;

export type SupplierRole = (typeof supplierRoles)[number];
export type SupplierStatus = (typeof supplierStatuses)[number];
export type SupplierUnitForm = (typeof supplierUnitForms)[number];
export type SupplierUnitBusinessType = (typeof supplierUnitBusinessTypes)[number];
export type SupplierUnitStatus = (typeof supplierUnitStatuses)[number];

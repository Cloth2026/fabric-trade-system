export const customerTypes = [
  "brand",
  "garment_factory",
  "trading_company",
  "wholesaler",
  "agent",
  "designer_studio",
  "other",
] as const;

export const customerLevels = ["strategic", "a", "b", "c"] as const;

export const customerStatuses = ["active", "inactive"] as const;

export const customerContactStatuses = ["active", "inactive"] as const;

export type CustomerType = (typeof customerTypes)[number];
export type CustomerLevel = (typeof customerLevels)[number];
export type CustomerStatus = (typeof customerStatuses)[number];
export type CustomerContactStatus = (typeof customerContactStatuses)[number];

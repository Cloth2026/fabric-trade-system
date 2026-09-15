import type { SupplierRecord, SupplierUnitRecord } from "@/lib/api/supplier-client";

export const initialSupplierUnitFilters = {
  query: "",
  unitForm: "all",
  businessType: "all",
  status: "all",
} as const;

export function createSupplierSelectionState(supplier: SupplierRecord) {
  return {
    selectedId: supplier.id,
    detailSupplier: supplier,
    supplierUnits: [] as SupplierUnitRecord[],
    selectedUnitId: null,
    detailUnit: null,
    detailError: "",
    unitsError: "",
    detailLoading: true,
    unitsLoading: true,
  };
}

export function isSupplierSelectionKey(key: string) {
  return key === "Enter" || key === " ";
}

export function isCurrentSupplierRequest(requestId: number, currentRequestId: number) {
  return requestId === currentRequestId;
}

export function canCreateSupplierUnit(supplier: Pick<SupplierRecord, "status">) {
  return supplier.status === "active";
}

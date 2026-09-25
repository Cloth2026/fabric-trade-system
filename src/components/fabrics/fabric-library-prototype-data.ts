import type {
  ConfigOption,
  FabricCompletenessFilter,
  FabricListItem,
  FabricListQuery,
  FabricQuote,
  FabricType,
  PricingUnit,
} from "@/lib/api/fabric-client";

export type FabricLibraryFilters = {
  query: string;
  type: FabricType | "all";
  status: string;
  developmentSource: string;
  completeness: FabricCompletenessFilter;
};

export type ConfigLabelMap = Record<string, Record<string, string>>;

export const defaultFabricLibraryView = "table" as const;
export const fabricListPageSize = 20;

export const initialFabricLibraryFilters: FabricLibraryFilters = {
  query: "",
  type: "all",
  status: "all",
  developmentSource: "all",
  completeness: "all",
};

export const fabricTypeLabels: Record<FabricType, string> = { knitted: "针织", woven: "梭织" };
export const pricingUnitLabels: Record<PricingUnit, string> = { kg: "公斤", meter: "米" };
export const fabricStatusLabels: Record<string, string> = {
  sellable: "可销售",
  incomplete: "待完善",
  inactive: "停用",
  eliminated: "淘汰",
};
export const developmentSourceLabels: Record<string, string> = {
  self_developed: "自主研发",
  market_purchase: "市场采购",
  customer_sample: "客户来样",
  supplier_provided: "供应商提供",
  trade_show_collected: "展会采集",
};
export const processStatusLabels: Record<string, string> = {
  none: "无此工艺",
  pending: "待确认",
  available: "已有资料",
};
export const supplierUnitFormLabels: Record<string, string> = {
  branch: "分厂",
  business_unit: "事业部",
  workshop: "车间",
  department: "部门",
  production_line: "生产线",
  outsourced_site: "外协点",
  other: "其他",
};
export const missingInfoLabels: Record<string, string> = {
  missing_code: "面料编号",
  missing_name: "面料名称",
  missing_fabric_type: "面料类型",
  missing_development_source: "开发来源",
  missing_composition: "成分",
  missing_weight: "克重",
  missing_width: "门幅",
  missing_supplier: "供应商货源",
  missing_preferred_supplier_quote: "首选货源报价",
  greige_pending: "坯布信息待确认",
  dyeing_pending: "染整信息待确认",
  post_process_pending: "后工艺信息待确认",
  missing_warp_weft_density: "经纬密",
};

const fallbackConfigOptions: ConfigOption[] = [
  ...Object.entries(fabricStatusLabels).map(([key, label], sortOrder) => ({ group: "fabric_status", key, label, sortOrder })),
  ...Object.entries(developmentSourceLabels).map(([key, label], sortOrder) => ({ group: "development_source", key, label, sortOrder })),
];

export function createConfigLabelMap(options: ConfigOption[]): ConfigLabelMap {
  return [...fallbackConfigOptions, ...options].reduce<ConfigLabelMap>((groups, option) => {
    groups[option.group] = { ...(groups[option.group] ?? {}), [option.key]: option.label };
    return groups;
  }, {});
}

export function getConfigLabel(labels: ConfigLabelMap, group: string, key: string | null | undefined) {
  if (!key) return "待补充";
  return labels[group]?.[key] ?? key;
}

export function buildFabricListRequest(
  filters: FabricLibraryFilters,
  debouncedQuery: string,
  page: number,
): FabricListQuery {
  return {
    q: debouncedQuery,
    fabricType: filters.type,
    status: filters.status,
    developmentSource: filters.developmentSource,
    completeness: filters.completeness,
    page,
    pageSize: fabricListPageSize,
  };
}

export function getFabricSpecification(fabric: Pick<FabricListItem, "fabricType" | "weight" | "width" | "yarnCount" | "warpWeftDensity">) {
  const construction = fabric.fabricType === "woven" ? fabric.warpWeftDensity : fabric.yarnCount;
  return [fabric.weight, fabric.width, construction].filter(Boolean).join(" · ");
}

export function toFabricListDisplayData(fabric: FabricListItem, labels: ConfigLabelMap) {
  const source = fabric.preferredSupplierSource;
  const quote = source?.latestQuote;
  return {
    typeLabel: fabricTypeLabels[fabric.fabricType],
    pricingUnitLabel: pricingUnitLabels[fabric.pricingUnit],
    statusLabel: getConfigLabel(labels, "fabric_status", fabric.status),
    specification: getFabricSpecification(fabric) || "待补充",
    supplierName: source?.supplierName ?? "暂无货源",
    supplierUnitName: source?.supplierUnitName ?? "未指定生产单元",
    latestPrice: formatPrice(quote?.purchasePriceExclTax, quote?.currency, quote?.pricingUnit),
    latestQuoteDate: formatDate(quote?.quoteDate),
  };
}

export function formatPrice(price: string | null | undefined, currency: string | null | undefined, unit: PricingUnit | null | undefined) {
  if (!price) return "待报价";
  const currencyLabel = currency === "CNY" ? "¥" : currency ? `${currency} ` : "";
  const unitLabel = unit ? `/${pricingUnitLabels[unit]}` : "";
  return `${currencyLabel}${price}${unitLabel}`;
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "暂无日期";
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
}

export function getQuoteSupplierUnitLabel(quote: Pick<FabricQuote, "supplierUnit">) {
  if (!quote.supplierUnit) return "未关联生产单元";
  return `${quote.supplierUnit.name} · ${supplierUnitFormLabels[quote.supplierUnit.unitForm] ?? quote.supplierUnit.unitForm}`;
}

export function getFabricTexture(fabric: Pick<FabricListItem, "id" | "fabricType" | "status">) {
  const palettes = fabric.fabricType === "knitted"
    ? ["#dce9e4", "#8fa99f", "#536d65"]
    : ["#e5ddd0", "#b8a68c", "#75654f"];
  const shift = [...fabric.id].reduce((total, character) => total + character.charCodeAt(0), 0) % 12;
  return `linear-gradient(${128 + shift}deg, ${palettes[0]} 0%, ${palettes[1]} 52%, ${palettes[2]} 100%)`;
}

export function getFabricLibraryMetrics(items: FabricListItem[], total: number, now = new Date()) {
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return {
    total,
    sellable: items.filter((fabric) => fabric.status === "sellable").length,
    incomplete: items.filter((fabric) => fabric.status === "incomplete").length,
    addedThisMonth: items.filter((fabric) => fabric.createdAt.startsWith(monthPrefix)).length,
  };
}

export function nextFabricRefreshToken(current: number) {
  return current + 1;
}

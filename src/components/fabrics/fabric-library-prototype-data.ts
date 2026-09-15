export type FabricPrototypeType = "knitted" | "woven";
export type FabricPrototypeStatus = "sellable" | "incomplete" | "inactive";
export type FabricPrototypeSource = "self_developed" | "market_purchase" | "customer_sample" | "supplier_provided" | "trade_show_collected";
export type FabricCompletenessFilter = "all" | "complete" | "needs_attention";

export type FabricSupplierSourcePrototype = {
  id: string;
  supplierName: string;
  supplierUnitName: string | null;
  isPreferred: boolean;
  supplierFabricCode: string;
  latestPurchasePrice: string;
  minimumOrderQty: string;
  leadTime: string;
  contactName: string;
  quoteDate: string;
  sampleStatus: string;
  qualityDifferences: string;
  quoteHistoryCount: number;
};

export type FabricLibraryPrototype = {
  code: string;
  name: string;
  englishName: string;
  type: FabricPrototypeType;
  pricingUnit: "kg" | "meter";
  category: string;
  structure: string;
  composition: string;
  weight: string;
  width: string;
  yarnCount: string | null;
  density: string | null;
  developmentSource: FabricPrototypeSource;
  status: FabricPrototypeStatus;
  completeness: number;
  missingInfo: string[];
  createdAt: string;
  updatedAt: string;
  tags: string[];
  texture: string;
  repurchaseStatus: string;
  greigeStatus: string;
  greigeDetails: string;
  dyeingStatus: string;
  dyeingDetails: string;
  postProcessStatus: string;
  postProcessDetails: string;
  inspectionConclusion: string;
  qualityNotes: string;
  remarks: string;
  supplierSources: FabricSupplierSourcePrototype[];
};

export type FabricLibraryFilters = {
  query: string;
  type: "all" | FabricPrototypeType;
  status: "all" | FabricPrototypeStatus;
  developmentSource: "all" | FabricPrototypeSource;
  completeness: FabricCompletenessFilter;
};

export const defaultFabricLibraryView = "table" as const;

export const initialFabricLibraryFilters: FabricLibraryFilters = {
  query: "",
  type: "all",
  status: "all",
  developmentSource: "all",
  completeness: "all",
};

export const fabricTypeLabels = { knitted: "针织", woven: "梭织" } as const;
export const pricingUnitLabels = { kg: "公斤", meter: "米" } as const;
export const fabricStatusLabels = { sellable: "可销售", incomplete: "待完善", inactive: "停用" } as const;
export const developmentSourceLabels = {
  self_developed: "自主研发",
  market_purchase: "市场采购",
  customer_sample: "客户来样",
  supplier_provided: "供应商提供",
  trade_show_collected: "展会采集",
} as const;

export const fabricLibraryPrototypes: FabricLibraryPrototype[] = [
  {
    code: "SDD-KN-2609-001",
    name: "精梳棉氨纶汗布",
    englishName: "Combed Cotton Spandex Jersey",
    type: "knitted",
    pricingUnit: "kg",
    category: "单面针织",
    structure: "汗布",
    composition: "95%棉 5%氨纶",
    weight: "180g/m²",
    width: "165cm",
    yarnCount: "32S",
    density: null,
    developmentSource: "self_developed",
    status: "sellable",
    completeness: 92,
    missingInfo: ["后工艺说明"],
    createdAt: "2026-09-03T09:20:00.000Z",
    updatedAt: "2026-09-14T16:30:00.000Z",
    tags: ["女装", "内衣", "春夏"],
    texture: "linear-gradient(135deg, #f5f1e8 0%, #d9cfbd 48%, #a99d87 100%)",
    repurchaseStatus: "可复购",
    greigeStatus: "已有资料",
    greigeDetails: "32S 精梳棉氨纶坯布，圆机 28G，坯布克重约 165g/m²。",
    dyeingStatus: "已有资料",
    dyeingDetails: "活性染色、开幅定型、预缩；参考损耗 6%，常规交期 10-12 天。",
    postProcessStatus: "无后工艺",
    postProcessDetails: "当前标准品无额外后工艺。",
    inspectionConclusion: "合格",
    qualityNotes: "深色订单需确认色牢度；弹力回复率稳定。",
    remarks: "自主研发常备基础款。",
    supplierSources: [
      {
        id: "source-kn-001-a",
        supplierName: "绍兴云锦染整有限公司",
        supplierUnitName: "染色一车间",
        isPreferred: true,
        supplierFabricCode: "YJ-JR-180",
        latestPurchasePrice: "¥28.00/kg",
        minimumOrderQty: "500kg/色",
        leadTime: "12-15 天",
        contactName: "王经理",
        quoteDate: "2026-09-12",
        sampleStatus: "已测试",
        qualityDifferences: "深色稳定，浅色注意缸差",
        quoteHistoryCount: 4,
      },
      {
        id: "source-kn-001-b",
        supplierName: "柯桥恒泰针织有限公司",
        supplierUnitName: "纬编事业部",
        isPreferred: false,
        supplierFabricCode: "HT-32S-SP",
        latestPurchasePrice: "¥27.60/kg",
        minimumOrderQty: "800kg/色",
        leadTime: "10-14 天",
        contactName: "陈经理",
        quoteDate: "2026-09-08",
        sampleStatus: "已有样品",
        qualityDifferences: "手感偏挺，门幅稳定",
        quoteHistoryCount: 2,
      },
    ],
  },
  {
    code: "SDD-WV-2609-014",
    name: "涤棉平纹衬衫布",
    englishName: "Poly Cotton Plain Shirting",
    type: "woven",
    pricingUnit: "meter",
    category: "衬衫面料",
    structure: "平纹",
    composition: "65%涤纶 35%棉",
    weight: "118g/m²",
    width: "150cm",
    yarnCount: "45S × 45S",
    density: "110 × 76",
    developmentSource: "market_purchase",
    status: "incomplete",
    completeness: 58,
    missingInfo: ["坯布来源", "染整参数", "检验结论"],
    createdAt: "2026-09-11T11:00:00.000Z",
    updatedAt: "2026-09-13T10:12:00.000Z",
    tags: ["衬衫", "市场成品", "轻档案"],
    texture: "linear-gradient(135deg, #dfe9ee 0%, #b8c9cf 52%, #879ba2 100%)",
    repurchaseStatus: "待确认",
    greigeStatus: "待确认",
    greigeDetails: "市场成品入档，坯布供应商及织造参数待追溯。",
    dyeingStatus: "待确认",
    dyeingDetails: "仅掌握成品手感与参考规格，染整路线待供应商补充。",
    postProcessStatus: "待确认",
    postProcessDetails: "未发现明显后工艺，待大货前确认。",
    inspectionConclusion: "待检验",
    qualityNotes: "当前为市场小样数据，克重与经纬密需复核。",
    remarks: "适合快速报价，但大货前必须补齐关键工艺信息。",
    supplierSources: [
      {
        id: "source-wv-014-a",
        supplierName: "广州中大市场 A12 档",
        supplierUnitName: null,
        isPreferred: true,
        supplierFabricCode: "A12-TC-9088",
        latestPurchasePrice: "¥16.50/m",
        minimumOrderQty: "300m",
        leadTime: "现货 2-3 天",
        contactName: "梁小姐",
        quoteDate: "2026-09-11",
        sampleStatus: "已有样品",
        qualityDifferences: "批次手感可能有轻微差异",
        quoteHistoryCount: 1,
      },
    ],
  },
  {
    code: "SDD-WV-2608-033",
    name: "烫金植绒斜纹布",
    englishName: "Foil Flocked Stretch Twill",
    type: "woven",
    pricingUnit: "meter",
    category: "时装面料",
    structure: "弹力斜纹",
    composition: "70%棉 27%锦纶 3%氨纶",
    weight: "230g/m²",
    width: "145cm",
    yarnCount: "40S × 70D",
    density: "128 × 72",
    developmentSource: "customer_sample",
    status: "sellable",
    completeness: 86,
    missingInfo: ["批次色差标准"],
    createdAt: "2026-08-26T08:30:00.000Z",
    updatedAt: "2026-09-10T17:45:00.000Z",
    tags: ["外套", "烫金", "植绒"],
    texture: "linear-gradient(135deg, #1a1918 0%, #4b4130 48%, #bd913c 100%)",
    repurchaseStatus: "可复购",
    greigeStatus: "已有资料",
    greigeDetails: "锦棉弹力斜纹坯布，经纬密 128 × 72，坯布门幅 152cm。",
    dyeingStatus: "已有资料",
    dyeingDetails: "染黑、定型、磨毛；参考损耗 5%。",
    postProcessStatus: "已有资料",
    postProcessDetails: "先烫金后局部植绒；制版 5 天，大货需留意套位与牢度。",
    inspectionConclusion: "有条件合格",
    qualityNotes: "后工艺批次差异风险较高，每批需保留确认样。",
    remarks: "客户来样开发款，报价前需确认花型版权。",
    supplierSources: [
      {
        id: "source-wv-033-a",
        supplierName: "海宁恒丰后整理厂",
        supplierUnitName: "特种工艺车间",
        isPreferred: true,
        supplierFabricCode: "HF-FL-3318",
        latestPurchasePrice: "¥45.00/m",
        minimumOrderQty: "1,000m/花型",
        leadTime: "18-22 天",
        contactName: "周主管",
        quoteDate: "2026-09-09",
        sampleStatus: "已测试",
        qualityDifferences: "烫金亮度稳定，植绒边缘需抽检",
        quoteHistoryCount: 3,
      },
      {
        id: "source-wv-033-b",
        supplierName: "柯桥锦程数码印花厂",
        supplierUnitName: "后工艺外协点",
        isPreferred: false,
        supplierFabricCode: "JC-FOIL-27",
        latestPurchasePrice: "¥43.80/m",
        minimumOrderQty: "1,500m/花型",
        leadTime: "20-25 天",
        contactName: "沈经理",
        quoteDate: "2026-08-30",
        sampleStatus: "已有样品",
        qualityDifferences: "成本较低，套位稳定性待大货验证",
        quoteHistoryCount: 2,
      },
      {
        id: "source-wv-033-c",
        supplierName: "东莞嘉艺复合材料有限公司",
        supplierUnitName: "植绒生产线",
        isPreferred: false,
        supplierFabricCode: "JY-ZR-145",
        latestPurchasePrice: "¥46.20/m",
        minimumOrderQty: "800m/花型",
        leadTime: "16-20 天",
        contactName: "何经理",
        quoteDate: "2026-08-28",
        sampleStatus: "已申请",
        qualityDifferences: "小单灵活，金属膜色泽略暖",
        quoteHistoryCount: 1,
      },
    ],
  },
  {
    code: "SDD-KN-2608-018",
    name: "涤纶网眼运动布",
    englishName: "Polyester Sports Mesh",
    type: "knitted",
    pricingUnit: "kg",
    category: "运动针织",
    structure: "网眼",
    composition: "100%涤纶",
    weight: "120g/m²",
    width: "150cm",
    yarnCount: "75D/72F",
    density: null,
    developmentSource: "supplier_provided",
    status: "sellable",
    completeness: 78,
    missingInfo: ["后工艺确认", "认证报告"],
    createdAt: "2026-08-18T14:20:00.000Z",
    updatedAt: "2026-09-06T09:05:00.000Z",
    tags: ["运动服", "透气", "速干"],
    texture: "linear-gradient(135deg, #214f77 0%, #3f7fa8 52%, #9ac6d8 100%)",
    repurchaseStatus: "可复购",
    greigeStatus: "已有资料",
    greigeDetails: "75D/72F 涤纶网眼坯布，圆机 24G。",
    dyeingStatus: "已有资料",
    dyeingDetails: "分散染色、吸湿排汗整理、柔软定型。",
    postProcessStatus: "待确认",
    postProcessDetails: "供应商称含吸湿排汗整理，配方与耐洗次数待确认。",
    inspectionConclusion: "合格",
    qualityNotes: "透气性良好，深色需关注升华牢度。",
    remarks: "供应商推荐运动基础款。",
    supplierSources: [
      {
        id: "source-kn-018-a",
        supplierName: "泉州联盛针织科技有限公司",
        supplierUnitName: "运动面料事业部",
        isPreferred: true,
        supplierFabricCode: "LS-MESH-120",
        latestPurchasePrice: "¥18.00/kg",
        minimumOrderQty: "600kg/色",
        leadTime: "9-12 天",
        contactName: "林经理",
        quoteDate: "2026-09-05",
        sampleStatus: "已有样品",
        qualityDifferences: "网孔均匀，深色升华牢度需复测",
        quoteHistoryCount: 3,
      },
      {
        id: "source-kn-018-b",
        supplierName: "晋江锐动纺织有限公司",
        supplierUnitName: "经编车间",
        isPreferred: false,
        supplierFabricCode: "RD-SP-012",
        latestPurchasePrice: "¥18.60/kg",
        minimumOrderQty: "400kg/色",
        leadTime: "12-14 天",
        contactName: "蔡经理",
        quoteDate: "2026-09-01",
        sampleStatus: "已申请",
        qualityDifferences: "小单起订友好，手感略软",
        quoteHistoryCount: 1,
      },
    ],
  },
];

export function getPreferredFabricSource(fabric: FabricLibraryPrototype) {
  return fabric.supplierSources.find((source) => source.isPreferred) ?? fabric.supplierSources[0] ?? null;
}

export function getFabricSpecification(fabric: FabricLibraryPrototype) {
  const construction = fabric.type === "woven" ? fabric.density : fabric.yarnCount;
  return [fabric.weight, fabric.width, construction].filter(Boolean).join(" · ");
}

export function filterFabricLibrary(items: FabricLibraryPrototype[], filters: FabricLibraryFilters) {
  const keyword = filters.query.trim().toLowerCase();
  return items.filter((fabric) => {
    const searchable = [
      fabric.code,
      fabric.name,
      fabric.englishName,
      fabric.composition,
      ...fabric.supplierSources.flatMap((source) => [source.supplierName, source.supplierUnitName ?? "", source.supplierFabricCode]),
    ].join(" ").toLowerCase();
    const matchesCompleteness = filters.completeness === "all"
      || (filters.completeness === "complete" && fabric.completeness >= 85)
      || (filters.completeness === "needs_attention" && fabric.completeness < 85);
    return (!keyword || searchable.includes(keyword))
      && (filters.type === "all" || fabric.type === filters.type)
      && (filters.status === "all" || fabric.status === filters.status)
      && (filters.developmentSource === "all" || fabric.developmentSource === filters.developmentSource)
      && matchesCompleteness;
  });
}

export function getFabricLibraryMetrics(items: FabricLibraryPrototype[], monthPrefix = "2026-09") {
  return {
    total: items.length,
    sellable: items.filter((fabric) => fabric.status === "sellable").length,
    incomplete: items.filter((fabric) => fabric.status === "incomplete").length,
    addedThisMonth: items.filter((fabric) => fabric.createdAt.startsWith(monthPrefix)).length,
  };
}

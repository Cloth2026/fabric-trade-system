export const supplierUnitTypes = [
  "分厂",
  "事业部",
  "染色车间",
  "印花车间",
  "数码印花部",
  "平网印花车间",
  "圆网印花车间",
  "后整理车间",
  "涂层车间",
  "其他",
] as const;

export type SupplierUnitType = (typeof supplierUnitTypes)[number];
export type SupplierUnitStatus = "启用" | "暂停合作";
export type SamplingSupport = "支持" | "不支持";

export type SupplierUnitPrototype = {
  id: string;
  supplierId: string;
  name: string;
  type: SupplierUnitType;
  status: SupplierUnitStatus;
  primaryBusiness: string;
  primaryProducts: string;
  materialScope: string;
  processCapabilities: string;
  restrictions: string;
  moq: string;
  leadTime: string;
  peakLeadTime: string;
  samplingSupport: SamplingSupport;
  manager: string;
  phone: string;
  wechat: string;
  qualityFeatures: string;
  riskNote: string;
  remarks: string;
};

export type SupplierUnitFormState = Omit<SupplierUnitPrototype, "id" | "supplierId">;

export const initialSupplierUnitPrototypes: SupplierUnitPrototype[] = [
  {
    id: "unit-xincai-dyeing-1",
    supplierId: "supplier-wujiang-dyeing",
    name: "染色一车间",
    type: "染色车间",
    status: "启用",
    primaryBusiness: "涤纶梭织染色",
    primaryProducts: "75D四面弹、春亚纺、涤塔夫",
    materialScope: "涤纶、涤氨",
    processCapabilities: "分散染料染色、定型、柔软整理及防泼水前处理",
    restrictions: "暂不承接高含量尼龙及超薄亮面产品",
    moq: "500kg/色",
    leadTime: "12-15天",
    peakLeadTime: "18-22天",
    samplingSupport: "支持",
    manager: "王经理",
    phone: "138 6258 1036",
    wechat: "xincai-wang01",
    qualityFeatures: "深色稳定，浅色注意缸差",
    riskNote: "浅色补单需保留首缸色样并复核缸差",
    remarks: "适合常规涤纶梭织大货。",
  },
  {
    id: "unit-xincai-dyeing-2",
    supplierId: "supplier-wujiang-dyeing",
    name: "染色二车间",
    type: "染色车间",
    status: "启用",
    primaryBusiness: "尼龙及弹力面料染色",
    primaryProducts: "尼龙四面弹、锦氨面料",
    materialScope: "尼龙、锦氨",
    processCapabilities: "酸性染色、弹力定型、手感整理",
    restrictions: "不承接含金属纤维产品",
    moq: "800kg/色",
    leadTime: "10-12天",
    peakLeadTime: "15-18天",
    samplingSupport: "支持",
    manager: "李经理",
    phone: "137 7166 4210",
    wechat: "xincai-li02",
    qualityFeatures: "弹力布经验较好",
    riskNote: "高弹产品需在投产前确认成品门幅",
    remarks: "锦氨产品优先安排该车间。",
  },
  {
    id: "unit-jincheng-digital",
    supplierId: "supplier-keqiao-printing",
    name: "数码印花部",
    type: "数码印花部",
    status: "启用",
    primaryBusiness: "小批量数码印花",
    primaryProducts: "涤纶印花布",
    materialScope: "涤纶、涤氨",
    processCapabilities: "数码直喷、热转印、快速花型分色",
    restrictions: "不承接荧光色大货连续印花",
    moq: "100米/花型",
    leadTime: "5-7天",
    peakLeadTime: "8-12天",
    samplingSupport: "支持",
    manager: "周主管",
    phone: "136 7689 2088",
    wechat: "jincheng-digital",
    qualityFeatures: "打样速度快",
    riskNote: "大货前需确认底布批次与数码色样",
    remarks: "适合开发单和小批量快返。",
  },
  {
    id: "unit-jincheng-rotary",
    supplierId: "supplier-keqiao-printing",
    name: "圆网印花车间",
    type: "圆网印花车间",
    status: "暂停合作",
    primaryBusiness: "大货连续印花",
    primaryProducts: "涤纶梭织印花布",
    materialScope: "涤纶梭织",
    processCapabilities: "圆网制版、连续印花、蒸化水洗",
    restrictions: "不适合低于 1,500 米的短单",
    moq: "3,000米/花型",
    leadTime: "15-20天",
    peakLeadTime: "25-30天",
    samplingSupport: "不支持",
    manager: "陈经理",
    phone: "135 8856 3190",
    wechat: "jincheng-chen",
    qualityFeatures: "适合大货，制版周期较长",
    riskNote: "近期排期波动，恢复合作前需重新确认交期",
    remarks: "保留产能资料，当前暂停新项目。",
  },
];

export function createEmptySupplierUnitForm(): SupplierUnitFormState {
  return {
    name: "",
    type: "其他",
    status: "启用",
    primaryBusiness: "",
    primaryProducts: "",
    materialScope: "",
    processCapabilities: "",
    restrictions: "",
    moq: "",
    leadTime: "",
    peakLeadTime: "",
    samplingSupport: "支持",
    manager: "",
    phone: "",
    wechat: "",
    qualityFeatures: "",
    riskNote: "",
    remarks: "",
  };
}

export function supplierUnitToForm(unit: SupplierUnitPrototype): SupplierUnitFormState {
  return {
    name: unit.name,
    type: unit.type,
    status: unit.status,
    primaryBusiness: unit.primaryBusiness,
    primaryProducts: unit.primaryProducts,
    materialScope: unit.materialScope,
    processCapabilities: unit.processCapabilities,
    restrictions: unit.restrictions,
    moq: unit.moq,
    leadTime: unit.leadTime,
    peakLeadTime: unit.peakLeadTime,
    samplingSupport: unit.samplingSupport,
    manager: unit.manager,
    phone: unit.phone,
    wechat: unit.wechat,
    qualityFeatures: unit.qualityFeatures,
    riskNote: unit.riskNote,
    remarks: unit.remarks,
  };
}

export function filterSupplierUnitPrototypes(
  units: SupplierUnitPrototype[],
  filters: { query: string; type: "全部类型" | SupplierUnitType; status: "全部状态" | SupplierUnitStatus },
) {
  const keyword = filters.query.trim().toLowerCase();
  return units.filter((unit) => {
    const matchesKeyword = !keyword || [unit.name, unit.primaryBusiness, unit.primaryProducts].join(" ").toLowerCase().includes(keyword);
    const matchesType = filters.type === "全部类型" || unit.type === filters.type;
    const matchesStatus = filters.status === "全部状态" || unit.status === filters.status;
    return matchesKeyword && matchesType && matchesStatus;
  });
}

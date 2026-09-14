export const supplierRoles = [
  "面料供应商",
  "坯布供应商",
  "织厂",
  "染厂",
  "印花厂",
  "后整理厂",
  "市场档口",
  "贸易商",
] as const;

export type SupplierRole = (typeof supplierRoles)[number];
export type SupplierStatus = "启用" | "停用";

export type SupplierPrototype = {
  id: string;
  name: string;
  roles: SupplierRole[];
  status: SupplierStatus;
  country: string;
  city: string;
  address: string;
  contactName: string;
  phone: string;
  email: string;
  socialContact: string;
  specialties: string;
  leadTime: string;
  moq: string;
  paymentTerms: string;
  cooperationComment: string;
  riskNote: string;
  remarks: string;
  completeness: number;
  updatedAt: string;
  linkedFabricCount: number;
  latestQuoteDate: string;
  latestCooperation: string;
};

export type SupplierFormState = Pick<
  SupplierPrototype,
  | "name"
  | "roles"
  | "status"
  | "country"
  | "city"
  | "address"
  | "contactName"
  | "phone"
  | "email"
  | "socialContact"
  | "specialties"
  | "leadTime"
  | "moq"
  | "paymentTerms"
  | "cooperationComment"
  | "riskNote"
  | "remarks"
>;

export const initialSupplierPrototypes: SupplierPrototype[] = [
  {
    id: "supplier-kq-knit",
    name: "绍兴柯桥针织面料有限公司",
    roles: ["面料供应商", "贸易商"],
    status: "启用",
    country: "中国",
    city: "浙江省绍兴市",
    address: "柯桥区中国轻纺城东市场 3 楼",
    contactName: "陈静",
    phone: "138 5758 2036",
    email: "chenjing@example.com",
    socialContact: "微信同手机号",
    specialties: "棉氨纶针织、卫衣布、罗纹及小单快返",
    leadTime: "现货 2-3 天，定制 12-18 天",
    moq: "现货 1 匹起，定制色 300kg 起",
    paymentTerms: "现货款到发货；定制 30% 定金",
    cooperationComment: "沟通及时，常规品质稳定，适合快速开发",
    riskNote: "深色批次存在轻微色差，补单前需确认缸号",
    remarks: "春夏针织产品较齐全，可优先询价。",
    completeness: 96,
    updatedAt: "2026-09-12 16:20",
    linkedFabricCount: 18,
    latestQuoteDate: "2026-09-11",
    latestCooperation: "KN-2609-001 复购打样确认",
  },
  {
    id: "supplier-shengze-weaving",
    name: "盛泽宏达织造厂",
    roles: ["织厂", "坯布供应商"],
    status: "启用",
    country: "中国",
    city: "江苏省苏州市",
    address: "吴江区盛泽镇南环工业区",
    contactName: "周伟",
    phone: "139 6257 4182",
    email: "zhouwei@example.com",
    socialContact: "WeChat: hd-weaving",
    specialties: "涤纶梭织坯布、春亚纺、塔丝隆及小提花",
    leadTime: "常规 10-15 天",
    moq: "2,000 米起织",
    paymentTerms: "月结 30 天",
    cooperationComment: "排期稳定，坯布规格执行较好",
    riskNote: "旺季机台紧张，急单需提前锁定排期",
    remarks: "可提供坯布码单和验布记录。",
    completeness: 91,
    updatedAt: "2026-09-10 09:45",
    linkedFabricCount: 12,
    latestQuoteDate: "2026-09-08",
    latestCooperation: "WV-2608-026 坯布排期确认",
  },
  {
    id: "supplier-wujiang-dyeing",
    name: "吴江新彩染整有限公司",
    roles: ["染厂"],
    status: "启用",
    country: "中国",
    city: "江苏省苏州市",
    address: "吴江区平望镇染整产业园",
    contactName: "沈岚",
    phone: "137 7166 9028",
    email: "shenlan@example.com",
    socialContact: "微信: xincai-rz",
    specialties: "涤纶染色、定型、柔软整理及防泼水",
    leadTime: "7-12 天",
    moq: "单色 500kg 起",
    paymentTerms: "出货前结清",
    cooperationComment: "颜色跟进主动，工艺反馈较专业",
    riskNote: "特殊助剂需单独确认环保标准",
    remarks: "可配合第三方检测。",
    completeness: 88,
    updatedAt: "2026-09-09 14:10",
    linkedFabricCount: 9,
    latestQuoteDate: "2026-09-07",
    latestCooperation: "防泼水工艺测试完成",
  },
  {
    id: "supplier-keqiao-printing",
    name: "柯桥锦程数码印花厂",
    roles: ["印花厂"],
    status: "启用",
    country: "中国",
    city: "浙江省绍兴市",
    address: "柯桥区滨海工业区兴滨路 88 号",
    contactName: "陆嘉",
    phone: "136 7689 1150",
    email: "lujia@example.com",
    socialContact: "WhatsApp: +86 136 7689 1150",
    specialties: "数码直喷、热转印、花型分色及小批量打样",
    leadTime: "打样 3-5 天，大货 10-14 天",
    moq: "打样 20 米，大货 300 米",
    paymentTerms: "50% 定金，出货前结清",
    cooperationComment: "打样响应快，花型还原度较好",
    riskNote: "高饱和色在不同底布上需先确认色样",
    remarks: "支持客户花型保密协议。",
    completeness: 84,
    updatedAt: "2026-09-06 11:30",
    linkedFabricCount: 7,
    latestQuoteDate: "2026-09-05",
    latestCooperation: "客户花型第二版打样",
  },
  {
    id: "supplier-haining-finishing",
    name: "海宁恒丰后整理厂",
    roles: ["后整理厂"],
    status: "停用",
    country: "中国",
    city: "浙江省嘉兴市",
    address: "海宁市马桥街道经编产业园",
    contactName: "王海峰",
    phone: "135 8634 7719",
    email: "wanghf@example.com",
    socialContact: "微信同手机号",
    specialties: "烫金、压花、复合、植绒及涂层",
    leadTime: "10-20 天",
    moq: "500 米起",
    paymentTerms: "款到排产",
    cooperationComment: "复杂效果经验丰富，但旺季交期波动",
    riskNote: "近期两批烫金牢度不稳定，暂停新单评估",
    remarks: "保留历史资料，复用前需重新验厂。",
    completeness: 93,
    updatedAt: "2026-08-28 17:05",
    linkedFabricCount: 5,
    latestQuoteDate: "2026-08-20",
    latestCooperation: "烫金牢度问题复盘",
  },
  {
    id: "supplier-zhongda-a12",
    name: "广州中大市场A12档",
    roles: ["市场档口", "面料供应商"],
    status: "启用",
    country: "中国",
    city: "广东省广州市",
    address: "海珠区中大九洲轻纺广场 A12 档",
    contactName: "何敏",
    phone: "020-8902 6618",
    email: "",
    socialContact: "微信: zhongda-a12",
    specialties: "衬衫布、女装梭织现货及市场找样",
    leadTime: "现货当日或次日发出",
    moq: "1 匹起",
    paymentTerms: "现款现货",
    cooperationComment: "找样效率高，适合市场成品快速建档",
    riskNote: "工商及认证资料待补充，批次稳定性需逐单确认",
    remarks: "市场档口信息以联系人确认为准。",
    completeness: 62,
    updatedAt: "2026-09-12 10:08",
    linkedFabricCount: 4,
    latestQuoteDate: "2026-09-12",
    latestCooperation: "WV-2609-014 现货取样",
  },
];

export function createEmptySupplierForm(): SupplierFormState {
  return {
    name: "",
    roles: [],
    status: "启用",
    country: "中国",
    city: "",
    address: "",
    contactName: "",
    phone: "",
    email: "",
    socialContact: "",
    specialties: "",
    leadTime: "",
    moq: "",
    paymentTerms: "",
    cooperationComment: "",
    riskNote: "",
    remarks: "",
  };
}

export function supplierToForm(supplier: SupplierPrototype): SupplierFormState {
  const { name, roles, status, country, city, address, contactName, phone, email, socialContact, specialties, leadTime, moq, paymentTerms, cooperationComment, riskNote, remarks } = supplier;
  return { name, roles: [...roles], status, country, city, address, contactName, phone, email, socialContact, specialties, leadTime, moq, paymentTerms, cooperationComment, riskNote, remarks };
}

export function filterSupplierPrototypes(
  suppliers: SupplierPrototype[],
  filters: { query: string; role: "全部角色" | SupplierRole; status: "全部状态" | SupplierStatus },
) {
  const keyword = filters.query.trim().toLowerCase();
  return suppliers.filter((supplier) => {
    const matchesKeyword = !keyword || [supplier.name, supplier.contactName, supplier.phone].join(" ").toLowerCase().includes(keyword);
    const matchesRole = filters.role === "全部角色" || supplier.roles.includes(filters.role);
    const matchesStatus = filters.status === "全部状态" || supplier.status === filters.status;
    return matchesKeyword && matchesRole && matchesStatus;
  });
}

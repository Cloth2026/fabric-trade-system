export const SYSTEM_PROTOTYPE_NOTICE = "静态演示数据，未接入后端接口";
export const SYSTEM_WRITE_DEMO_MESSAGE = "演示动作：本轮为静态原型，未写入数据库";

export const REFERENCE_NOW = "2026-09-26T09:41:00.000Z";

/* ---------------------------------- 角色 ---------------------------------- */

export type UserRoleKey = "owner" | "admin" | "sales" | "purchasing" | "merchandiser" | "viewer";

export const userRoles: UserRoleKey[] = ["owner", "admin", "sales", "purchasing", "merchandiser", "viewer"];

export const userRoleLabels: Record<UserRoleKey, string> = {
  owner: "企业所有者",
  admin: "系统管理员",
  sales: "业务员",
  purchasing: "采购/面料开发",
  merchandiser: "跟单员",
  viewer: "只读用户",
};

export const userRoleSummaries: Record<UserRoleKey, string> = {
  owner: "企业最高权限角色，拥有全部模块的查看、写操作与维护权限。",
  admin: "日常系统与业务的管理者，但不能处置企业所有者身份与其账号状态。",
  sales: "负责客户、寄样、报价与订单业务，默认看不到真实采购价格。",
  purchasing: "负责面料货源、供应商与生产单元，掌管采购报价与采购价格。",
  merchandiser: "负责寄样执行与订单跟进，不能创建销售订单，也看不到采购价格。",
  viewer: "只读用户，可查看业务资料但不允许任何写操作。",
};

/** 企业所有者身份规则：V1 只作为静态说明展示，本轮不实现真实校验。 */
export const ownerRoleRules: string[] = [
  "owner 是企业最高权限角色。",
  "一个租户允许有多个 owner。",
  "系统必须始终保留至少一个启用状态的 owner。",
  "最后一个启用的 owner 不能被停用、移除 owner 角色或降级。",
  "admin 不能新增、停用、编辑或分配 owner 身份。",
];

/* ---------------------------------- 状态 ---------------------------------- */

export type UserStatusKey = "active" | "inactive";

export const userStatusLabels: Record<UserStatusKey, string> = {
  active: "启用",
  inactive: "停用",
};

export const userStatusOptions: Array<{ value: "all" | UserStatusKey; label: string }> = [
  { value: "all", label: "全部状态" },
  { value: "active", label: "启用" },
  { value: "inactive", label: "停用" },
];

/* ---------------------------------- 用户 ---------------------------------- */

export type PrototypeUser = {
  id: string;
  name: string;
  account: string;
  email: string;
  roles: UserRoleKey[];
  status: UserStatusKey;
  lastLoginAt: string;
  createdAt: string;
  updatedAt: string;
  forcePasswordChange: boolean;
  note: string;
};

export const prototypeUsers: PrototypeUser[] = [
  {
    id: "su-1001",
    name: "周志远",
    account: "zhou.zhiyuan",
    email: "zhou.zhiyuan@cloth2026.com",
    roles: ["owner"],
    status: "active",
    lastLoginAt: "2026-09-26T01:41:00.000Z",
    createdAt: "2026-06-18T02:10:00.000Z",
    updatedAt: "2026-09-20T07:35:00.000Z",
    forcePasswordChange: false,
    note: "企业负责人，参与面料定价与订单审核。",
  },
  {
    id: "su-1002",
    name: "林菲",
    account: "lin.fei",
    email: "lin.fei@cloth2026.com",
    roles: ["admin"],
    status: "active",
    lastLoginAt: "2026-09-26T00:57:00.000Z",
    createdAt: "2026-06-18T02:22:00.000Z",
    updatedAt: "2026-09-22T03:12:00.000Z",
    forcePasswordChange: false,
    note: "负责系统与基础资料维护，不参与报价核算。",
  },
  {
    id: "su-1003",
    name: "徐国栋",
    account: "xu.guodong",
    email: "xu.guodong@cloth2026.com",
    roles: ["purchasing"],
    status: "active",
    lastLoginAt: "2026-09-25T06:32:00.000Z",
    createdAt: "2026-06-25T01:05:00.000Z",
    updatedAt: "2026-09-24T09:02:00.000Z",
    forcePasswordChange: false,
    note: "面料开发与坯布采购，可维护采购价格与采购报价。",
  },
  {
    id: "su-1004",
    name: "何雅",
    account: "he.ya",
    email: "he.ya@cloth2026.com",
    roles: ["purchasing", "merchandiser"],
    status: "active",
    lastLoginAt: "2026-09-25T08:18:00.000Z",
    createdAt: "2026-07-03T02:40:00.000Z",
    updatedAt: "2026-09-25T08:18:00.000Z",
    forcePasswordChange: true,
    note: "兼岗账号：染整跟单同时负责外协工厂产能沟通。",
  },
  {
    id: "su-1005",
    name: "王思远",
    account: "wang.siyuan",
    email: "wang.siyuan@cloth2026.com",
    roles: ["sales"],
    status: "active",
    lastLoginAt: "2026-09-25T10:20:00.000Z",
    createdAt: "2026-07-02T06:15:00.000Z",
    updatedAt: "2026-09-18T02:44:00.000Z",
    forcePasswordChange: false,
    note: "华东区客户对接，负责报价单与销售订单。",
  },
  {
    id: "su-1006",
    name: "刘婷",
    account: "liu.ting",
    email: "liu.ting@cloth2026.com",
    roles: ["merchandiser"],
    status: "active",
    lastLoginAt: "2026-09-24T09:48:00.000Z",
    createdAt: "2026-09-01T03:26:00.000Z",
    updatedAt: "2026-09-24T09:48:00.000Z",
    forcePasswordChange: false,
    note: "寄样登记、客户反馈回收与订单交期跟踪。",
  },
  {
    id: "su-1007",
    name: "赵敏",
    account: "zhao.min",
    email: "zhao.min@cloth2026.com",
    roles: ["sales"],
    status: "inactive",
    lastLoginAt: "2026-08-28T07:11:00.000Z",
    createdAt: "2026-07-19T01:30:00.000Z",
    updatedAt: "2026-08-29T05:20:00.000Z",
    forcePasswordChange: false,
    note: "离职交接中，账号已停用但历史记录保留。",
  },
  {
    id: "su-1008",
    name: "顾成",
    account: "gu.cheng",
    email: "gu.cheng@cloth2026.com",
    roles: ["viewer"],
    status: "inactive",
    lastLoginAt: "2026-08-30T03:02:00.000Z",
    createdAt: "2026-07-19T01:44:00.000Z",
    updatedAt: "2026-08-30T03:02:00.000Z",
    forcePasswordChange: false,
    note: "外部审计只读账号，季度结束后停用。",
  },
];

export const currentPrototypeUser = {
  name: "周志远",
  roles: ["owner"] as UserRoleKey[],
  tenantName: "Default Tenant",
};

export function countRecentlyLoggedIn(users: PrototypeUser[]): number {
  const reference = new Date(REFERENCE_NOW).getTime();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  return users.filter((user) => {
    const time = new Date(user.lastLoginAt).getTime();
    return Number.isFinite(time) && reference - time <= sevenDays;
  }).length;
}

/* -------------------------------- 日期格式化 ------------------------------- */

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function toShanghaiParts(value: string): { year: number; month: number; day: number; hour: number; minute: number } | null {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return null;
  const shifted = new Date(time + 8 * 60 * 60 * 1000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
  };
}

export function formatSystemDateTime(value: string): string {
  const parts = toShanghaiParts(value);
  if (!parts) return "—";
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)} ${pad(parts.hour)}:${pad(parts.minute)}`;
}

export function formatSystemDate(value: string): string {
  const parts = toShanghaiParts(value);
  if (!parts) return "—";
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

/* -------------------------------- 权限矩阵 -------------------------------- */

export type PermissionModuleKey =
  | "dashboard"
  | "fabric"
  | "purchase_price"
  | "supplier_unit"
  | "customer"
  | "sample"
  | "quote"
  | "order"
  | "user_management"
  | "audit_log"
  | "system_settings";

/**
 * 权限操作使用业务语言命名，不使用含义模糊的通用「管理 manage」。
 * 英文 key 保持稳定，中文标签仅在展示层映射。
 */
export type PermissionActionKey =
  | "view"
  | "create"
  | "edit"
  | "deactivate"
  | "view_purchase_price"
  | "manage_source"
  | "manage_purchase_quote"
  | "manage_production_unit"
  | "record_feedback"
  | "advance_quote_status"
  | "update_fulfillment"
  | "assign_role"
  | "reset_password"
  | "maintain_config";

export type PermissionLevel = "allow" | "restricted" | "deny";

export const permissionActionLabels: Record<PermissionActionKey, string> = {
  view: "查看",
  create: "新增",
  edit: "编辑",
  deactivate: "停用",
  view_purchase_price: "查看采购价格",
  manage_source: "管理货源",
  manage_purchase_quote: "管理采购报价",
  manage_production_unit: "管理生产单元",
  record_feedback: "登记客户反馈",
  advance_quote_status: "推进报价状态",
  update_fulfillment: "跟进履约状态",
  assign_role: "分配角色",
  reset_password: "重置密码",
  maintain_config: "维护配置",
};

export const permissionModules: Array<{ key: PermissionModuleKey; label: string; description: string; actions: PermissionActionKey[] }> = [
  { key: "dashboard", label: "工作台", description: "经营概览与待办汇总", actions: ["view"] },
  { key: "fabric", label: "面料库", description: "面料主档、工艺明细与货源", actions: ["view", "create", "edit", "manage_source"] },
  { key: "purchase_price", label: "采购价格", description: "采购报价与真实采购价格", actions: ["view_purchase_price", "manage_purchase_quote"] },
  { key: "supplier_unit", label: "供应商与生产单元", description: "供应商档案、车间与产能", actions: ["view", "create", "edit", "deactivate", "manage_production_unit"] },
  { key: "customer", label: "客户", description: "客户主档与联系人", actions: ["view", "create", "edit", "deactivate"] },
  { key: "sample", label: "寄样", description: "寄样登记与客户反馈", actions: ["view", "create", "edit", "record_feedback"] },
  { key: "quote", label: "客户报价", description: "报价单与状态推进", actions: ["view", "create", "edit", "advance_quote_status"] },
  { key: "order", label: "订单", description: "销售订单与交付跟踪", actions: ["view", "create", "edit", "update_fulfillment"] },
  { key: "user_management", label: "用户管理", description: "账号、角色与密码维护", actions: ["view", "create", "edit", "deactivate", "assign_role", "reset_password"] },
  { key: "audit_log", label: "操作日志", description: "操作记录与安全事件，仅提供查看", actions: ["view"] },
  { key: "system_settings", label: "系统设置", description: "租户级参数与配置组", actions: ["view", "maintain_config"] },
];

type RolePermissionMap = Partial<Record<PermissionModuleKey, Partial<Record<PermissionActionKey, PermissionLevel>>>>;

export const rolePermissionMatrix: Record<UserRoleKey, RolePermissionMap> = {
  owner: {
    dashboard: { view: "allow" },
    fabric: { view: "allow", create: "allow", edit: "allow", manage_source: "allow" },
    purchase_price: { view_purchase_price: "allow", manage_purchase_quote: "allow" },
    supplier_unit: { view: "allow", create: "allow", edit: "allow", deactivate: "allow", manage_production_unit: "allow" },
    customer: { view: "allow", create: "allow", edit: "allow", deactivate: "allow" },
    sample: { view: "allow", create: "allow", edit: "allow", record_feedback: "allow" },
    quote: { view: "allow", create: "allow", edit: "allow", advance_quote_status: "allow" },
    order: { view: "allow", create: "allow", edit: "allow", update_fulfillment: "allow" },
    user_management: { view: "allow", create: "allow", edit: "allow", deactivate: "allow", assign_role: "allow", reset_password: "allow" },
    audit_log: { view: "allow" },
    system_settings: { view: "allow", maintain_config: "allow" },
  },
  admin: {
    dashboard: { view: "allow" },
    fabric: { view: "allow", create: "allow", edit: "allow", manage_source: "allow" },
    purchase_price: { view_purchase_price: "allow", manage_purchase_quote: "allow" },
    supplier_unit: { view: "allow", create: "allow", edit: "allow", deactivate: "allow", manage_production_unit: "allow" },
    customer: { view: "allow", create: "allow", edit: "allow", deactivate: "allow" },
    sample: { view: "allow", create: "allow", edit: "allow", record_feedback: "allow" },
    quote: { view: "allow", create: "allow", edit: "allow", advance_quote_status: "allow" },
    order: { view: "allow", create: "allow", edit: "allow", update_fulfillment: "allow" },
    user_management: {
      view: "allow",
      create: "restricted",
      edit: "restricted",
      deactivate: "restricted",
      assign_role: "restricted",
      reset_password: "restricted",
    },
    audit_log: { view: "allow" },
    system_settings: { view: "allow", maintain_config: "allow" },
  },
  sales: {
    dashboard: { view: "allow" },
    fabric: { view: "allow", create: "deny", edit: "deny", manage_source: "deny" },
    purchase_price: { view_purchase_price: "deny", manage_purchase_quote: "deny" },
    supplier_unit: { view: "allow", create: "deny", edit: "deny", deactivate: "deny", manage_production_unit: "deny" },
    customer: { view: "allow", create: "allow", edit: "allow", deactivate: "deny" },
    sample: { view: "allow", create: "allow", edit: "allow", record_feedback: "allow" },
    quote: { view: "allow", create: "allow", edit: "allow", advance_quote_status: "allow" },
    order: { view: "allow", create: "allow", edit: "allow", update_fulfillment: "allow" },
    user_management: { view: "deny", create: "deny", edit: "deny", deactivate: "deny", assign_role: "deny", reset_password: "deny" },
    audit_log: { view: "deny" },
    system_settings: { view: "deny", maintain_config: "deny" },
  },
  purchasing: {
    dashboard: { view: "allow" },
    fabric: { view: "allow", create: "allow", edit: "allow", manage_source: "allow" },
    purchase_price: { view_purchase_price: "allow", manage_purchase_quote: "allow" },
    supplier_unit: { view: "allow", create: "allow", edit: "allow", deactivate: "allow", manage_production_unit: "allow" },
    customer: { view: "allow", create: "deny", edit: "deny", deactivate: "deny" },
    sample: { view: "allow", create: "deny", edit: "deny", record_feedback: "deny" },
    quote: { view: "allow", create: "deny", edit: "deny", advance_quote_status: "deny" },
    order: { view: "allow", create: "deny", edit: "deny", update_fulfillment: "deny" },
    user_management: { view: "deny", create: "deny", edit: "deny", deactivate: "deny", assign_role: "deny", reset_password: "deny" },
    audit_log: { view: "deny" },
    system_settings: { view: "deny", maintain_config: "deny" },
  },
  merchandiser: {
    dashboard: { view: "allow" },
    fabric: { view: "allow", create: "deny", edit: "deny", manage_source: "deny" },
    purchase_price: { view_purchase_price: "deny", manage_purchase_quote: "deny" },
    supplier_unit: { view: "allow", create: "deny", edit: "deny", deactivate: "deny", manage_production_unit: "deny" },
    customer: { view: "allow", create: "deny", edit: "deny", deactivate: "deny" },
    sample: { view: "allow", create: "allow", edit: "allow", record_feedback: "allow" },
    quote: { view: "allow", create: "deny", edit: "deny", advance_quote_status: "deny" },
    order: { view: "allow", create: "deny", edit: "allow", update_fulfillment: "restricted" },
    user_management: { view: "deny", create: "deny", edit: "deny", deactivate: "deny", assign_role: "deny", reset_password: "deny" },
    audit_log: { view: "deny" },
    system_settings: { view: "deny", maintain_config: "deny" },
  },
  viewer: {
    dashboard: { view: "allow" },
    fabric: { view: "allow", create: "deny", edit: "deny", manage_source: "deny" },
    purchase_price: { view_purchase_price: "deny", manage_purchase_quote: "deny" },
    supplier_unit: { view: "allow", create: "deny", edit: "deny", deactivate: "deny", manage_production_unit: "deny" },
    customer: { view: "allow", create: "deny", edit: "deny", deactivate: "deny" },
    sample: { view: "allow", create: "deny", edit: "deny", record_feedback: "deny" },
    quote: { view: "allow", create: "deny", edit: "deny", advance_quote_status: "deny" },
    order: { view: "allow", create: "deny", edit: "deny", update_fulfillment: "deny" },
    user_management: { view: "deny", create: "deny", edit: "deny", deactivate: "deny", assign_role: "deny", reset_password: "deny" },
    audit_log: { view: "deny" },
    system_settings: { view: "deny", maintain_config: "deny" },
  },
};

export const permissionLevelLabels: Record<PermissionLevel, string> = {
  allow: "允许",
  restricted: "受限允许",
  deny: "不允许",
};

/**
 * 「受限允许」必须给出可阅读的限制说明，页面上不能只展示图标。
 * 说明以模块为单位聚合展示，同时作为单元格的悬浮提示。
 */
export type PermissionRestriction = {
  role: UserRoleKey;
  module: PermissionModuleKey;
  action: PermissionActionKey;
  note: string;
};

export const permissionRestrictions: PermissionRestriction[] = [
  {
    role: "admin",
    module: "user_management",
    action: "create",
    note: "可以新增普通账号，但不能新增 owner 身份账号。",
  },
  {
    role: "admin",
    module: "user_management",
    action: "edit",
    note: "可以编辑普通账号的资料与角色，但不能编辑 owner 身份账号。",
  },
  {
    role: "admin",
    module: "user_management",
    action: "deactivate",
    note: "可以停用普通账号，但不能停用 owner 身份账号；最后一个启用的 owner 任何人都不能停用。",
  },
  {
    role: "admin",
    module: "user_management",
    action: "assign_role",
    note: "可以为普通账号分配业务角色，但不能分配或回收 owner 角色。",
  },
  {
    role: "admin",
    module: "user_management",
    action: "reset_password",
    note: "只能重置非 owner 账号的密码；owner 账号的密码只能由另一个 owner 重置。",
  },
  {
    role: "merchandiser",
    module: "order",
    action: "update_fulfillment",
    note: "可以编辑履约资料并推进非终态进度（如已发货 → 部分到货），终态（完成、取消）由 owner 或 admin 处理。",
  },
];

export function restrictionNoteOf(role: UserRoleKey, moduleKey: PermissionModuleKey, action: PermissionActionKey): string | undefined {
  return permissionRestrictions.find((item) => item.role === role && item.module === moduleKey && item.action === action)?.note;
}

export function restrictionsOfModule(moduleKey: PermissionModuleKey): PermissionRestriction[] {
  return permissionRestrictions.filter((item) => item.module === moduleKey);
}

export const permissionRestrictionNotes: Record<UserRoleKey, string[]> = {
  owner: [
    "拥有全部模块的查看、写操作与维护权限。",
    "一个租户允许有多个 owner；至少保留一个启用状态的 owner。",
    "最后一个启用的 owner 不能被停用、移除 owner 角色或降级。",
    "可以新增、编辑、停用其他 owner 身份账号并分配 owner 角色。",
    "可以重置其他 owner 与普通用户的密码；admin 不能重置 owner 密码。",
  ],
  admin: [
    "拥有除 owner 身份处置外的日常系统与业务权限。",
    "不能新增、停用、编辑 owner 身份账号，也不能分配 owner 角色。",
    "可以看到真实采购价格，并对普通账号执行停用与重置密码。",
    "重置密码为受限允许：只能重置非 owner 账号，owner 密码需由另一个 owner 重置。",
  ],
  sales: [
    "写操作集中在客户、寄样、客户报价与销售订单。",
    "默认不能查看真实采购价格，报价所需成本需由采购角色提供。",
    "不能停用客户主档，也看不到用户管理与操作日志。",
  ],
  purchasing: [
    "可以管理面料货源、供应商、生产单元与采购报价。",
    "可以查看采购价格；客户、寄样、报价、订单仅可查看。",
    "不开放用户管理与系统设置。",
  ],
  merchandiser: [
    "负责寄样执行与订单跟进，不能创建销售订单。",
    "订单终态推进需要 owner 或 admin 处理。",
    "不能查看采购价格，也不改动客户、面料与供应商主档。",
  ],
  viewer: [
    "只能查看业务资料，任何写操作都会被拒绝。",
    "不开放采购价格、用户管理、操作日志与系统设置。",
  ],
};

export function resolvePermissionLevel(role: UserRoleKey, moduleKey: PermissionModuleKey, action: PermissionActionKey): PermissionLevel {
  return rolePermissionMatrix[role][moduleKey]?.[action] ?? "deny";
}

/* -------------------------------- 操作日志 -------------------------------- */

export type LogCategoryKey = "login_security" | "user_permission" | "business";

export const logCategoryOptions: Array<{ value: "all" | LogCategoryKey; label: string }> = [
  { value: "all", label: "全部日志" },
  { value: "login_security", label: "登录安全" },
  { value: "user_permission", label: "用户权限" },
  { value: "business", label: "业务操作" },
];

export const logCategoryLabels: Record<LogCategoryKey, string> = {
  login_security: "登录安全",
  user_permission: "用户权限",
  business: "业务操作",
};

export type LogModuleKey =
  | "auth"
  | "user_management"
  | "role_management"
  | "purchase_price"
  | "fabric_library"
  | "supplier_management"
  | "customer_management"
  | "sample_management"
  | "customer_quote"
  | "sales_order";

export const logModules: LogModuleKey[] = [
  "auth",
  "user_management",
  "role_management",
  "purchase_price",
  "fabric_library",
  "supplier_management",
  "customer_management",
  "sample_management",
  "customer_quote",
  "sales_order",
];

export const logModuleLabels: Record<LogModuleKey, string> = {
  auth: "认证",
  user_management: "用户管理",
  role_management: "角色权限",
  purchase_price: "采购价格",
  fabric_library: "面料库",
  supplier_management: "供应商",
  customer_management: "客户",
  sample_management: "寄样",
  customer_quote: "客户报价",
  sales_order: "订单",
};

export type LogActionKey =
  | "login"
  | "login_failed"
  | "logout"
  | "create_user"
  | "update_role"
  | "deactivate_user"
  | "reset_password"
  | "access_denied"
  | "create"
  | "update";

export const logActionLabels: Record<LogActionKey, string> = {
  login: "登录成功",
  login_failed: "登录失败",
  logout: "退出登录",
  create_user: "创建用户",
  update_role: "修改角色",
  deactivate_user: "停用账号",
  reset_password: "重置密码",
  access_denied: "权限拒绝",
  create: "新增",
  update: "修改",
};

export const logActions: LogActionKey[] = [
  "login",
  "login_failed",
  "logout",
  "create_user",
  "update_role",
  "deactivate_user",
  "reset_password",
  "access_denied",
  "create",
  "update",
];

export type LogResultKey = "success" | "failure";

export const logResultLabels: Record<LogResultKey, string> = {
  success: "成功",
  failure: "失败",
};

export type PrototypeLog = {
  id: string;
  requestId: string;
  occurredAt: string;
  actorId: string;
  actorName: string;
  actorEmail: string;
  category: LogCategoryKey;
  module: LogModuleKey;
  action: LogActionKey;
  target: string;
  result: LogResultKey;
  ipAddress: string;
  device: string;
  detail: Record<string, string>;
};

export const prototypeLogs: PrototypeLog[] = [
  {
    id: "log-20260926-001",
    requestId: "req-9f2c1a77b0",
    occurredAt: "2026-09-26T01:41:00.000Z",
    actorId: "su-1001",
    actorName: "周志远",
    actorEmail: "zhou.zhiyuan@cloth2026.com",
    category: "login_security",
    module: "auth",
    action: "login",
    target: "User:su-1001",
    result: "success",
    ipAddress: "192.168.1.24",
    device: "Windows 11 · Chrome 141",
    detail: { 登录方式: "账号密码", 会话有效期: "12 小时", 失败次数: "0" },
  },
  {
    id: "log-20260926-002",
    requestId: "req-6b41de09c3",
    occurredAt: "2026-09-26T01:26:00.000Z",
    actorId: "",
    actorName: "未识别账号",
    actorEmail: "z***@cloth2026.com",
    category: "login_security",
    module: "auth",
    action: "login_failed",
    target: "登录主体:z***@cloth2026.com",
    result: "failure",
    ipAddress: "192.168.1.58",
    device: "macOS 15 · Safari 19",
    detail: { 处理阶段: "登录校验", 返回提示: "账号或密码不正确，请检查后重试。", 记录范围: "脱敏邮箱、IP、设备信息" },
  },
  {
    id: "log-20260926-003",
    requestId: "req-18ad44e5d2",
    occurredAt: "2026-09-26T00:57:00.000Z",
    actorId: "su-1002",
    actorName: "林菲",
    actorEmail: "lin.fei@cloth2026.com",
    category: "user_permission",
    module: "user_management",
    action: "create_user",
    target: "User:su-1006",
    result: "success",
    ipAddress: "192.168.1.31",
    device: "Windows 11 · Edge 141",
    detail: { 账号: "liu.ting", 初始角色: "merchandiser", 强制改密: "是" },
  },
  {
    id: "log-20260925-004b",
    requestId: "req-4c9d70e12b",
    occurredAt: "2026-09-25T08:18:00.000Z",
    actorId: "su-1004",
    actorName: "何雅",
    actorEmail: "he.ya@cloth2026.com",
    category: "login_security",
    module: "auth",
    action: "login",
    target: "User:su-1004",
    result: "success",
    ipAddress: "192.168.1.47",
    device: "Windows 11 · Chrome 141",
    detail: { 登录方式: "账号密码", 会话有效期: "12 小时", 失败次数: "0" },
  },
  {
    id: "log-20260925-004",
    requestId: "req-77c0ff31a4",
    occurredAt: "2026-09-25T09:18:00.000Z",
    actorId: "su-1002",
    actorName: "林菲",
    actorEmail: "lin.fei@cloth2026.com",
    category: "user_permission",
    module: "role_management",
    action: "update_role",
    target: "User:su-1004",
    result: "success",
    ipAddress: "192.168.1.31",
    device: "Windows 11 · Edge 141",
    detail: { 变更前角色: "purchasing", 变更后角色: "purchasing, merchandiser", 生效方式: "下次请求生效" },
  },
  {
    id: "log-20260925-005",
    requestId: "req-2de99117b8",
    occurredAt: "2026-09-25T08:02:00.000Z",
    actorId: "su-1002",
    actorName: "林菲",
    actorEmail: "lin.fei@cloth2026.com",
    category: "user_permission",
    module: "user_management",
    action: "reset_password",
    target: "User:su-1004",
    result: "success",
    ipAddress: "192.168.1.31",
    device: "Windows 11 · Edge 141",
    detail: { 重置方式: "管理员重置", 强制改密: "是", 历史会话: "已失效" },
  },
  {
    id: "log-20260925-006",
    requestId: "req-c41b8e2f90",
    occurredAt: "2026-09-25T06:44:00.000Z",
    actorId: "su-1003",
    actorName: "徐国栋",
    actorEmail: "xu.guodong@cloth2026.com",
    category: "business",
    module: "fabric_library",
    action: "create",
    target: "Fabric:SDD-26092501",
    result: "success",
    ipAddress: "192.168.1.42",
    device: "Windows 10 · Chrome 140",
    detail: { 面料编号: "SDD-26092501", 类型: "针织", 计价单位: "公斤", 货源数量: "2" },
  },
  {
    id: "log-20260925-007",
    requestId: "req-5aa0733c11",
    occurredAt: "2026-09-25T05:30:00.000Z",
    actorId: "su-1005",
    actorName: "王思远",
    actorEmail: "wang.siyuan@cloth2026.com",
    category: "user_permission",
    module: "purchase_price",
    action: "access_denied",
    target: "FabricSupplierQuote:fq-8842",
    result: "failure",
    ipAddress: "192.168.1.66",
    device: "iOS 19 · Safari",
    detail: { 缺少权限: "view_purchase_price", 所属角色: "sales", 提示: "需要采购角色授权" },
  },
  {
    id: "log-20260925-008",
    requestId: "req-0c7fd2b6a9",
    occurredAt: "2026-09-25T03:15:00.000Z",
    actorId: "su-1003",
    actorName: "徐国栋",
    actorEmail: "xu.guodong@cloth2026.com",
    category: "business",
    module: "supplier_management",
    action: "update",
    target: "Supplier:sup-3312",
    result: "success",
    ipAddress: "192.168.1.42",
    device: "Windows 10 · Chrome 140",
    detail: { 变更字段: "付款条款, 交期", 变更前: "月结 30 天", 变更后: "月结 45 天" },
  },
  {
    id: "log-20260924-009",
    requestId: "req-8b32e5a1d7",
    occurredAt: "2026-09-24T09:48:00.000Z",
    actorId: "su-1006",
    actorName: "刘婷",
    actorEmail: "liu.ting@cloth2026.com",
    category: "business",
    module: "sample_management",
    action: "create",
    target: "SampleRequest:sam-2210",
    result: "success",
    ipAddress: "192.168.1.72",
    device: "Windows 11 · Chrome 141",
    detail: { 客户: "杭州锦时服饰", 寄样数量: "3", 快递单号: "SF7738821204" },
  },
  {
    id: "log-20260924-010",
    requestId: "req-31ff09cd55",
    occurredAt: "2026-09-24T07:26:00.000Z",
    actorId: "su-1002",
    actorName: "林菲",
    actorEmail: "lin.fei@cloth2026.com",
    category: "user_permission",
    module: "user_management",
    action: "deactivate_user",
    target: "User:su-1007",
    result: "success",
    ipAddress: "192.168.1.31",
    device: "Windows 11 · Edge 141",
    detail: { 停用原因: "员工离职", 历史记录: "保留", 生效会话: "全部失效" },
  },
  {
    id: "log-20260924-011",
    requestId: "req-6e22ab7f38",
    occurredAt: "2026-09-24T02:05:00.000Z",
    actorId: "su-1005",
    actorName: "王思远",
    actorEmail: "wang.siyuan@cloth2026.com",
    category: "business",
    module: "customer_quote",
    action: "create",
    target: "CustomerQuote:cq-4471",
    result: "success",
    ipAddress: "192.168.1.66",
    device: "Windows 11 · Chrome 141",
    detail: { 客户: "宁波华帛贸易", 明细行数: "4", 币种: "CNY" },
  },
  {
    id: "log-20260923-012",
    requestId: "req-a1c78d02e4",
    occurredAt: "2026-09-23T08:31:00.000Z",
    actorId: "su-1003",
    actorName: "徐国栋",
    actorEmail: "xu.guodong@cloth2026.com",
    category: "business",
    module: "fabric_library",
    action: "update",
    target: "Fabric:SDD-26092307",
    result: "success",
    ipAddress: "192.168.1.42",
    device: "Windows 10 · Chrome 140",
    detail: { 变更字段: "成品参考价（不含税）", 变更前: "32.50", 变更后: "34.80" },
  },
  {
    id: "log-20260923-013",
    requestId: "req-f0d4c2b1e6",
    occurredAt: "2026-09-23T01:12:00.000Z",
    actorId: "su-1008",
    actorName: "顾成",
    actorEmail: "gu.cheng@cloth2026.com",
    category: "login_security",
    module: "auth",
    action: "logout",
    target: "User:su-1008",
    result: "success",
    ipAddress: "10.0.2.15",
    device: "Ubuntu 24 · Firefox 142",
    detail: { 会话时长: "1 小时 42 分", 退出方式: "主动退出" },
  },
];

/* ------------------------------ 派生与安全提示 ------------------------------ */

export function latestLoginEventOf(userId: string): PrototypeLog | undefined {
  return prototypeLogs
    .filter((log) => log.actorId === userId && (log.action === "login" || log.action === "login_failed"))
    .sort((left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime())[0];
}

export function buildSecurityNotes(user: PrototypeUser): string[] {
  const notes: string[] = [];
  if (user.roles.includes("owner")) {
    notes.push("企业所有者账号：一个租户允许有多个 owner，系统必须保留至少一个启用状态的 owner。");
    notes.push("该账号不能被系统管理员停用、编辑或降级；若它是最后一个启用的 owner，任何人都不能停用它。");
  }
  if (user.roles.includes("admin")) {
    notes.push("系统管理员可以创建与停用普通账号，但无法改动企业所有者身份。");
  }
  if (user.roles.includes("sales") || user.roles.includes("viewer")) {
    notes.push("该角色默认不能查看真实采购价格，报价所需成本需由采购角色提供。");
  }
  if (user.roles.includes("purchasing")) {
    notes.push("该账号可查看并维护采购价格，请定期复核其有效性。");
  }
  if (user.forcePasswordChange) {
    notes.push("已设置首次登录强制修改密码：下次登录后会先要求修改密码。");
  }
  if (user.status === "inactive") {
    notes.push("账号已停用，历史操作记录保留，重新启用后可恢复登录。");
  }
  notes.push("所有演示数据均为静态样例，按钮不会写入数据库。");
  return notes;
}

const sensitiveDetailKeys = ["密码", "token", "会话", "快递单号", "身份证", "手机"];

export function maskSensitiveValue(key: string, value: string): string {
  const isSensitive = sensitiveDetailKeys.some((sensitive) => key.includes(sensitive));
  if (!isSensitive) return value;
  if (value.length <= 2) return "••";
  return `${value.slice(0, 1)}${"•".repeat(Math.min(6, value.length - 2))}${value.slice(-1)}`;
}

export function maskLogDetail(detail: Record<string, string>): Record<string, string> {
  const masked: Record<string, string> = {};
  for (const [key, value] of Object.entries(detail)) {
    masked[key] = maskSensitiveValue(key, value);
  }
  return masked;
}

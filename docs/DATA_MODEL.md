# 数据模型说明

`prisma/schema.prisma` 是数据库模型的事实来源。本文解释业务职责、关系、约束和迁移风险，不替代 schema。

## 核心关系

```text
Tenant
  ├─ User
  │    ├─ Account[]              （密码凭据，Better Auth）
  │    ├─ Session[]              （数据库会话，Better Auth）
  │    ├─ UserRoleAssignment[]   （固定六角色，可多角色）
  │    └─ OperationLog[]
  ├─ Supplier
  │    └─ SupplierUnit[]
  ├─ Fabric
  │    ├─ GreigeFabric[]
  │    ├─ DyeingFinishing[]
  │    ├─ PostProcess[]
  │    ├─ FabricStockInBatch[]
  │    └─ FabricSupplier[]
  │         ├─ Supplier
  │         ├─ SupplierUnit?（当前常用生产单元）
  │         └─ FabricSupplierQuote[]
  │              └─ SupplierUnit?（报价当时的生产单元）
  ├─ ConfigOption[]
  ├─ OperationLog[]
  └─ UserRoleAssignment[]

全局认证基础设施（不属于任何租户，无 tenantId）
  ├─ Verification[]        （重置密码令牌）
  └─ AuthLoginThrottle[]   （登录入口限速）
```

重点关系：

```text
Fabric
  └─ FabricSupplier
       ├─ Supplier
       ├─ SupplierUnit
       └─ FabricSupplierQuote[]
            └─ SupplierUnit（报价当时的生产单元）
```

## 核心表职责

| 模型 | 职责 |
| --- | --- |
| `Tenant` | SaaS 和私有部署的租户边界，关联用户、供应商、面料、报价、批次和日志。 |
| `Fabric` | 面料主档案，保存名称、分类、结构、规格、来源、状态、质量、用途配置 key、工艺状态和完整度。 |
| `Supplier` | 供应商公司、工厂、档口或贸易主体。`roles` 表达多角色；`type` 暂留为 legacy。 |
| `SupplierUnit` | 供应商下属分厂、事业部、车间、部门、生产线或外协点，记录具体业务和工艺能力。 |
| `FabricSupplier` | 面料与供应商的长期货源关系，保存供应商货号、样品状态、品质差异、首选状态和当前生产单元。 |
| `FabricSupplierQuote` | 一次采购报价的不可覆盖快照，保存金额、币种、计价单位、MOQ、交期、联系人、日期和报价当时生产单元。 |
| `GreigeFabric` | 一款面料可有多条坯布资料（多家织厂 / 不同规格）。 |
| `DyeingFinishing` | 一款面料可有多条染整资料（不同染厂 / 不同工序）。 |
| `PostProcess` | 一款面料可有多条后工艺资料。 |
| `FabricStockInBatch` | 预留的入库批次模型；真实库存和 UI 尚未开发。 |
| `ConfigOption` | 系统级或租户级枚举配置，保存稳定 `group`、`key` 和中文 `label`。 |
| `OperationLog` | 重要业务写操作的审计记录。供应商和生产单元写操作、面料新增已接入。 |
| `User` | 登录主体，归属一个租户。`email` 全局唯一并统一小写；`status` 是启用/停用开关；`provisioningStatus` 是建号完成度，两者不混用。 |
| `Account` | Better Auth 凭据表。密码哈希**只**存在 `Account.password`，`User` 上没有 `passwordHash`，任何代码都不直接写这一列。 |
| `Session` | 数据库会话。不存 `tenantId`，租户通过 `Session → User` 取得。 |
| `Verification` | Better Auth 全局验证表（管理员重置密码链路会短暂使用）。无 `tenantId`。 |
| `UserRoleAssignment` | 用户的固定角色。一个用户可有多行，`RoleKey` enum 固定六值，`@@unique([userId, roleKey])`。 |
| `AuthLoginThrottle` | 登录入口限速。按 IP / 登录标识两个维度计数，`keyHash` 只保存不可逆摘要。无 `tenantId`。 |

## 认证与权限数据模型

数据模型已落地（migration `20260926093217_add_authentication_and_authorization_models`），**登录、权限拦截、审计服务尚未实现**，见"尚未启用"一节。

### `UserProvisioningStatus`：建号完成度，不是启用开关

| 值 | 含义 |
| --- | --- |
| `pending` | 账号已创建，但建号流程（凭据 + 角色 + 审计日志）尚未全部完成。**默认状态**，此时用户无角色、无业务权限。 |
| `ready` | 建号流程全部完成，账号可以登录。 |
| `failed` | 建号流程已确定失败（例如写角色或审计日志时不可恢复地出错）。保留账号行以便排查和重试，不等于停用。 |

它与 `UserStatus`（`active` / `inactive`）是**两个独立维度**：

- `UserStatus` 是管理员手上的启用/停用开关；
- `UserProvisioningStatus` 记录账号是否"配齐"，由建号流程推进。

登录接口必须同时满足 `status = active` **且** `provisioningStatus = ready` 才允许进入；`pending` 与 `failed` 一律拒绝。该判断属于登录实现，**本轮只建字段，不实现判断**。

### `provisioningRequestId`：建号幂等与失败补偿的持久化依据

- 每一次管理员建号请求生成一个 `requestId`，写入 `User.provisioningRequestId`，该列**全局唯一**。
- Better Auth 的建号写入与我们的业务写入**无法共享同一个数据库事务**（已实测：外层事务回滚后用户行仍在）。因此建号分两步，中途崩溃会留下"有 User/Account、无角色、无日志"的半完成账号。
- 有了 `provisioningRequestId`，重试同一个请求时可以：先按 `requestId` 查到上次创建的账号 → 认领它并补齐角色与日志 → 把 `provisioningStatus` 推进到 `ready`；而不是再建一个账号，也不会因为"邮箱已存在"而无从判断该账号是不是自己上一次建的。
- 清理孤儿账号时同样以它为准：有 `User` 但 `UserRoleAssignment` 为空且创建时间超过阈值的行，可判为建号失败残留。

### 登录保护是两层，不是一层

| 层 | 载体 | 防什么 | 局限 |
| --- | --- | --- | --- |
| 入口限速 | `AuthLoginThrottle`（`login_ip` / `login_identifier` 两种 scope） | 同一 IP 或同一登录标识在短时间内的高频尝试、按 IP 撞库 | 不区分账号是否存在，也不负责账号本身的锁定状态 |
| 账号锁定 | `User.failedLoginAttempts` + `User.lockedUntil` | 针对**已知账号**的连续密码猜解 | 无法限制不存在的邮箱，也无法处理跨账号的撞库 |

两层必须同时存在：`failedLoginAttempts` 挂在用户行上，一个不存在的邮箱根本没有用户行可记数；而只有限速没有锁定，则单个账号仍可被慢速爆破。

`AuthLoginThrottle` 的 `keyHash` **只保存带服务端 secret 的 HMAC（或等价不可逆摘要）**：不保存明文邮箱，不保存原始 IP。该表也不带 `tenantId`——登录前的 IP 与未知邮箱尚不能可靠归属租户。

### 为什么没有采用 Better Auth 内置的 `RateLimit` 表

- 内置限速只在它自己的 **HTTP `onRequest` 层**生效；本项目不挂载 Better Auth 的 HTTP handler（`/api/auth/*` 全部不暴露），而是由自建 `/api/auth/login` 直接调用 `auth.api.*`，实测直调**完全不走限速**。
- 因此不启用 `rateLimit.storage = "database"`，也不建 `RateLimit` 表，改由 `AuthLoginThrottle` + `User.failedLoginAttempts` 承担。
- 若将来挂载 Better Auth 的 HTTP 端点，必须同时启用内置限速并补齐 `RateLimit` 表，否则多实例部署时计数只存在于单进程内存。

### 角色：只有 `UserRoleAssignment`，没有 `Role` / `Permission` 表

- `RoleKey` enum 固定六值：`owner` / `admin` / `sales` / `purchasing` / `merchandiser` / `viewer`。V1 不允许自定义角色，权限字典与矩阵是服务端常量。
- `User` 上的旧 `role` 字符串列**已在本轮 migration 中删除**（删除前已确认 dev / test 两库 `User` 均为 0 行），真实角色一律以 `UserRoleAssignment` 为准。
- 租户边界由**复合外键**保证：`User` 增加 `@@unique([tenantId, id])`，`UserRoleAssignment` 用 `(tenantId, userId) → User(tenantId, id)`，数据库层面无法把 A 租户的角色挂到 B 租户的用户上。
- `UserRoleAssignment.createdByUserId` 是**可空审计快照字段，不是数据库外键**。原因：Prisma 不允许复合关系的标量集合里同时出现必填列与可空列（`tenantId` 必填 + `createdByUserId` 可空），无法用 `(tenantId, createdByUserId)` 建复合外键；而单列外键又无法保证租户边界。**服务层必须在写入时校验 `createdByUserId` 属于同一租户**，数据库不兜底。

## 租户隔离

- `Fabric`、`Supplier`、`SupplierUnit`、`FabricSupplier`、`FabricSupplierQuote`、`FabricStockInBatch` 和 `OperationLog` 直接保存 `tenantId`。
- `GreigeFabric`、`DyeingFinishing` 和 `PostProcess` 通过所属 `Fabric` 间接归属租户；查询时不能脱离面料租户边界。
- `ConfigOption.tenantId` 可为空：系统配置使用系统 owner，租户配置覆盖同组同 key 的系统显示项。
- `User`、`UserRoleAssignment` 也直接保存 `tenantId`；`Account` 通过 `User` 间接归属租户，`Session` 同理。
- `Verification` 与 `AuthLoginThrottle` 是**全局认证基础设施，不保存 `tenantId`**：一个重置令牌、一次登录尝试在被识别之前无法可靠归属租户。
- 所有 API 从 `getServerTenant()` 获取租户，不接受客户端 `tenantId`。
- 详情和更新查询使用 `id + tenantId`；跨租户资源返回 404。
- 未来货源和报价写 API 必须验证 `SupplierUnit.tenantId` 等于当前租户，并且 `SupplierUnit.supplierId` 等于对应 `FabricSupplier.supplierId`。

## 货源与报价规则

### 首选货源

- 业务上每款面料最多一个 `isPreferred=true` 的货源。
- 新增面料请求中多个首选会被拒绝；有供应商但未指定首选时，第一家自动成为首选。
- 列表读取优先选择 `isPreferred=true`；如果历史数据没有首选，则回退到最早创建的有效货源，再以 `id` 保证稳定排序。

### 最新报价

列表只返回所选货源的最新一条报价。排序规则：

1. `quoteDate desc`
2. `createdAt desc`
3. `id desc`

### 报价历史

- 详情返回所有货源及全部报价历史，排序同上。
- `FabricSupplierQuote.supplierUnitId` 是报价自己的历史关系，不能用 `FabricSupplier.supplierUnitId` 替代。
- 修改货源当前生产单元不会改变旧报价关联的生产单元。
- `purchasePriceExclTax` 使用 `Decimal`，API 返回字符串；日期返回 ISO 8601 字符串。

## 价格口径：含税 / 不含税 / 税点

面料库里每个价格都拆成三个字段，全部手工填写、原样存库：

| 模型 | 不含税 | 含税 | 税点 |
| --- | --- | --- | --- |
| `Fabric`（成品参考价） | `finishedReferencePriceExclTax` `Decimal(12,2)?` | `finishedReferencePriceInclTax` `Decimal(12,2)?` | `finishedReferenceTaxRate` `Decimal(6,3)?` |
| `FabricSupplierQuote`（采购价） | `purchasePriceExclTax` `Decimal(12,2)` 必填 | `purchasePriceInclTax` `Decimal(12,2)?` | `purchaseTaxRate` `Decimal(6,3)?` |
| `GreigeFabric` / `DyeingFinishing` / `PostProcess`（工艺单价） | `unitPriceExclTax` `Decimal(12,2)?` | `unitPriceInclTax` `Decimal(12,2)?` | `taxRate` `Decimal(6,3)?` |

- 税点存小数（`0.13` = 13%），界面按百分比录入；与客户报价单 `CustomerQuote.taxRate`、销售订单 `SalesOrder.taxRate` 的口径一致。
- 系统不做含税 / 不含税互相推导，也不由两价反算税点，价格以录入原话为准。
- 后端校验税率范围 `0 ≤ rate ≤ 1`，越界返回 400；留空表示未填写。
- 迁移 `20260925055710_price_tax_exclusive_inclusive_split` 把旧价格列 RENAME 为不含税列（历史值按不含税价解释），再新增含税列与税点列，历史金额不丢失。

## 关键唯一约束与索引

- `Fabric`: `@@unique([tenantId, code])`。
- `FabricSupplier`: `@@unique([tenantId, fabricId, supplierId])`。
- `SupplierUnit`: `@@unique([tenantId, supplierId, name])`。
- `ConfigOption`: `@@unique([ownerKey, group, key])`。
- `FabricStockInBatch`: `@@unique([tenantId, batchNo])`。
- `User`: `email` **全局唯一**（不是租户内唯一）；`@@unique([tenantId, username])`；`@@unique([tenantId, id])`（供 `UserRoleAssignment` 复合外键引用）；`provisioningRequestId` 全局唯一。
- `UserRoleAssignment`: `@@unique([userId, roleKey])`；`@@index([tenantId, roleKey])`。
- `Session`: `token` 唯一。
- `AuthLoginThrottle`: `@@unique([scope, keyHash])`；`@@index([blockedUntil])`、`@@index([scope, windowStartedAt])`。
- `OperationLog`: 所有索引都以 `tenantId` 为前缀（`[tenantId, createdAt]`、`[tenantId, userId, createdAt]`、`[tenantId, category, createdAt]`、`[tenantId, module, createdAt]`、`[tenantId, module, action]`、`[tenantId, result]`、`[tenantId, requestId]`）。日志只在租户内查询，不建全局单列索引。

`User.email` 之所以改成全局唯一：Better Auth 按 email 单字段查用户，一个邮箱也应只对应一个自然人。改约束前已实测 dev / test 两库 `User` 均为 0 行，无冲突数据。

当前约束风险：

- `FabricSupplier` 的唯一约束意味着同一面料与同一供应商只能有一条长期关系，即使该供应商有多个生产单元。当前产品规则接受这一限制，以 `supplierUnitId` 表示常用单元，历史报价可分别指向不同单元。
- 如果未来要求“同一供应商的多个车间同时作为独立货源”，必须先重新评审唯一约束、首选规则和旧数据迁移，不能直接绕过约束。
- 数据库没有部分唯一索引保证每款面料最多一个首选货源；当前由服务校验保障。未来独立货源 API 必须继续保证该规则，必要时再评审数据库级约束。

## 外键删除规则

- 删除 `Supplier` 时，其 `SupplierUnit` 使用 `onDelete: Cascade`。
- 删除 `Fabric` 时，`FabricSupplier`、`GreigeFabric`、`DyeingFinishing` 和 `PostProcess` 使用级联删除。
- 删除 `FabricSupplier` 时，其 `FabricSupplierQuote` 使用级联删除。
- 删除当前生产单元时，`FabricSupplier.supplierUnitId` 使用 `SetNull`。
- 被历史报价引用的生产单元受 `FabricSupplierQuote.supplierUnit` 的 `Restrict` 保护，不能删除。
- 删除 `User` 时，`Account`、`Session`、`UserRoleAssignment` 使用级联删除（`onDelete: Cascade`）。`OperationLog.userId` 是可空关系，用户删除后日志保留、`userId` 置空（注销与"不删除用户"的产品规则另见认证设计文档）。
- 业务 API 不提供供应商或生产单元 DELETE。生产单元使用启用/暂停管理。
- 其他未显式声明 `onDelete` 的关系遵循 Prisma/PostgreSQL 默认行为；实现删除能力前必须逐项评审，不能假设会级联。

## Legacy 字段

`Fabric` 仍保留以下旧单供应商字段，用于兼容和后续安全迁移：

- `supplierId`
- `supplierQuote`
- `minimumOrderQty`

新功能不得读取或写入这些字段。供应商关系使用 `FabricSupplier`，报价使用 `FabricSupplierQuote`。`Supplier.type` 也属于 legacy，新功能使用 `roles`。

## 颜色决策

V1 不管理颜色、色号和色卡。当前 schema 不新增颜色业务关系；颜色相关能力应在未来单独评审，不得临时塞入 tags 或 remarks 形成隐式模型。

## 认证模型：已建表，尚未启用

以下能力**只有数据模型，没有任何实现**，不要据此宣称系统已有认证：

- 登录 / 退出 / 建号 / 重置密码接口：未创建。
- Better Auth 实例、Cookie、会话校验、权限拦截：未创建。
- 审计日志写入服务：未创建（`OperationLog` 新字段目前没有写入方，历史行按默认值 `category = business`、`result = success` 解释）。
- 首个 owner：未创建，两库 `User` 仍为 0 行。
- `Account` / `Session` / `Verification` / `AuthLoginThrottle` 目前全为空表。

## 数据迁移风险

- 旧 `Fabric` 单供应商字段尚未搬运到新货源和报价表，也不能直接删除。
- `User.role` 已在 migration `20260926093217_add_authentication_and_authorization_models` 中删除。该 migration 带一条前置保护：若 `User` 表非空则直接报错中止，避免在真实用户数据上丢列。**将来若要在已有用户的库上执行同类变更，必须先决定历史 `role` 如何搬运到 `UserRoleAssignment`**。
- `OperationLog` 的新增 `category` / `result` 是带默认值的 `NOT NULL`：PostgreSQL 会把默认值应用到全部历史行，历史日志被解释为 `business` / `success`（与它们的真实语义一致），未伪造任何数据。`requestId`、`userAgent`、操作人快照等可空列在历史行上为 `null`，UI 需显示"—"。
- 安全迁移需要先为旧供应商数据创建 `FabricSupplier`，再为旧价格创建初始 `FabricSupplierQuote`，核对数量和金额后才可切断旧字段读取。
- 报价生产单元外键使用 `Restrict`。清理生产单元前必须先确认不存在历史报价引用；正常业务应停用而不是删除。
- 多租户字段虽然已存在，但当前运行时仍是临时单租户。引入真实认证后必须验证所有间接关系查询仍受租户限制。
- `FabricStockInBatch` 只是预留模型，不能据此宣称库存模块已完成，也不应在未评审流程前写入真实库存。

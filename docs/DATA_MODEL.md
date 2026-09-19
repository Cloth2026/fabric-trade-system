# 数据模型说明

`prisma/schema.prisma` 是数据库模型的事实来源。本文解释业务职责、关系、约束和迁移风险，不替代 schema。

## 核心关系

```text
Tenant
  ├─ Supplier
  │    └─ SupplierUnit[]
  ├─ Fabric
  │    ├─ GreigeFabric?
  │    ├─ DyeingFinishing?
  │    ├─ PostProcess[]
  │    ├─ FabricStockInBatch[]
  │    └─ FabricSupplier[]
  │         ├─ Supplier
  │         ├─ SupplierUnit?（当前常用生产单元）
  │         └─ FabricSupplierQuote[]
  │              └─ SupplierUnit?（报价当时的生产单元）
  ├─ ConfigOption[]
  └─ OperationLog[]
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
| `GreigeFabric` | 一款面料可选的一对一坯布资料。 |
| `DyeingFinishing` | 一款面料可选的一对一染整资料。 |
| `PostProcess` | 一款面料可有多条后工艺资料。 |
| `FabricStockInBatch` | 预留的入库批次模型；真实库存和 UI 尚未开发。 |
| `ConfigOption` | 系统级或租户级枚举配置，保存稳定 `group`、`key` 和中文 `label`。 |
| `OperationLog` | 重要业务写操作的审计记录。供应商和生产单元写操作、面料新增已接入。 |

## 租户隔离

- `Fabric`、`Supplier`、`SupplierUnit`、`FabricSupplier`、`FabricSupplierQuote`、`FabricStockInBatch` 和 `OperationLog` 直接保存 `tenantId`。
- `GreigeFabric`、`DyeingFinishing` 和 `PostProcess` 通过所属 `Fabric` 间接归属租户；查询时不能脱离面料租户边界。
- `ConfigOption.tenantId` 可为空：系统配置使用系统 owner，租户配置覆盖同组同 key 的系统显示项。
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
- `purchasePrice` 使用 `Decimal`，API 返回字符串；日期返回 ISO 8601 字符串。

## 关键唯一约束与索引

- `Fabric`: `@@unique([tenantId, code])`。
- `FabricSupplier`: `@@unique([tenantId, fabricId, supplierId])`。
- `SupplierUnit`: `@@unique([tenantId, supplierId, name])`。
- `ConfigOption`: `@@unique([ownerKey, group, key])`。
- `FabricStockInBatch`: `@@unique([tenantId, batchNo])`。

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

## 数据迁移风险

- 旧 `Fabric` 单供应商字段尚未搬运到新货源和报价表，也不能直接删除。
- 安全迁移需要先为旧供应商数据创建 `FabricSupplier`，再为旧价格创建初始 `FabricSupplierQuote`，核对数量和金额后才可切断旧字段读取。
- 报价生产单元外键使用 `Restrict`。清理生产单元前必须先确认不存在历史报价引用；正常业务应停用而不是删除。
- 多租户字段虽然已存在，但当前运行时仍是临时单租户。引入真实认证后必须验证所有间接关系查询仍受租户限制。
- `FabricStockInBatch` 只是预留模型，不能据此宣称库存模块已完成，也不应在未评审流程前写入真实库存。

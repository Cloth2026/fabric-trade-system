# 当前 API 合同

本文记录仓库中已经存在并真实工作的 Route Handlers。它是便于交接的合同摘要，具体实现仍以 `src/app/api/`、`src/server/` 和测试为准。

## 通用约定

- 所有业务查询和写入使用服务端 `getServerTenant()` 取得 `tenantId`，不接受客户端覆盖。
- 跨租户详情或更新按资源不存在处理，返回 404。
- 数据库和请求使用稳定英文 key，中文标签由 `ConfigOption` 或前端标签映射负责。
- `Decimal` 在只读响应中序列化为十进制字符串，不转为 JSON number。
- 日期序列化为 ISO 8601 字符串。
- 非法 JSON、Zod 校验或非法查询参数返回 400。
- 当前资源不存在或属于其他租户返回 404。
- 唯一约束和明确的业务冲突返回 409。
- 未捕获数据库异常返回通用 500，不向客户端暴露数据库内部信息。

## 面料 API

### `GET /api/fabrics`

用途：分页读取面料摘要，供专业表格和卡片视图使用。

查询参数：

| 参数 | 规则 |
| --- | --- |
| `q` | 最长 200 字符；搜索编号、中英文名称、成分、供应商名称和供应商货号。 |
| `fabricType` | `knitted`、`woven`、`all`，默认 `all`。 |
| `status` | 启用的 `fabric_status` key 或 `all`。 |
| `developmentSource` | 启用的 `development_source` key 或 `all`。 |
| `completeness` | `all`、`complete`、`needs_attention`。`complete >= 85`。 |
| `page` | 正整数，默认 1。 |
| `pageSize` | 正整数，默认 50，最大 100。 |

排序：`updatedAt desc`，再按 `id desc`。

响应：

- `data[]`: `id`、`code`、中英文名称、类型、计价单位、成分、克重、门幅、纱支/经纬密、来源、状态、完整度、缺失项、创建/更新时间。
- `supplierSourceCount`: 当前租户下有效货源数量。
- `preferredSupplierSource`: 所选货源摘要，包括供应商、当前生产单元、供应商货号、样品状态和 `latestQuote`；无货源时为 `null`。
- `pagination`: `page`、`pageSize`、`total`、`totalPages`。

首选货源选择：先取 `isPreferred=true`，没有时回退到最早创建的有效货源，最后以 `id` 稳定排序。

最新报价选择：在所选货源内按 `quoteDate desc`、`createdAt desc`、`id desc` 取第一条；无报价时为 `null`。

错误：非法参数或不存在/停用的配置筛选 key 返回 400。

### `POST /api/fabrics`

用途：在一个事务中新增面料及相关资料，并写入 `OperationLog`。

请求体概要：

- 基础必填：`code`、`name`、`fabricType`、`developmentSource`、`composition`、`weight`、`width`。
- 可选主档：英文名、状态、分类、结构、弹力、纱支、经纬密、用途/季节/认证 key、来源、参考价、质量和备注。
- 工艺：`greigeStatus` + `greige`、`dyeingStatus` + `dyeingFinishing`、`postProcessStatus` + `postProcesses[]`。
- 货源：`suppliers[]`，每项可包含供应商货号、样品状态、质量差异、首选标记和可选 `initialQuote`。
- `initialQuote.purchasePrice` 必填，空字符串或 `null` 不能转成 0；金额不能为负数。
- `currency` 为 3 位大写代码，默认 `CNY`。

服务器规则：

- `code` 必须以 `SDD-` 开头，总长度不超过 64。
- `pricingUnit` 由服务器派生：`knitted -> kg`，`woven -> meter`。
- 配置 key 必须存在且启用。
- 工艺状态为 `none` 时不得带明细，`available` 时必须有明细，`pending` 可暂缺。
- 同一请求不能重复 `supplierId`，最多一个首选；未指定首选时第一家自动设为首选。
- 所有供应商必须属于当前租户且为启用状态。
- 不写入 legacy 单供应商字段。

成功：201，返回 `{ fabric: { id, code, name, ... } }` 的创建结果。

错误：非法 JSON/字段/配置/供应商为 400，租户内编号重复为 409。

### `GET /api/fabrics/[id]`

用途：读取一个面料的完整只读详情。

响应 `{ data }` 包含：

- 主档：当前非 legacy 的面料业务字段、完整度、缺失项、创建和更新时间。
- `supplierSources[]`: 全部货源关系，包含供应商、当前生产单元、供应商货号、样品状态、品质差异、首选状态、备注和 `quotes[]`。
- `greige`、`dyeingFinishing`、`postProcesses[]`: 结构化工艺资料，不拼接成长文本。

报价历史按 `quoteDate desc`、`createdAt desc`、`id desc` 返回。每条报价包含自己的：

- `supplierUnitId`
- `supplierUnit`: `id`、`name`、`unitForm`、`status`

报价没有生产单元时两个字段都为 `null`。不得使用货源当前 `supplierUnit` 覆盖报价自己的历史生产单元。

错误：不存在或其他租户的面料返回 404。

### `POST /api/fabrics/[id]/sources`

用途：在既有面料下新增一个供应商货源（可携带首条报价），事务内写 `OperationLog` 并重算面料完整度。

请求体（严格模式）：

- `supplierId` 必填；供应商必须属于当前租户且为启用状态。
- `supplierUnitId` 选填；必须属于该供应商且为启用生产单元。
- `supplierFabricCode`、`sampleStatus`（须为启用的 `sample_status` 配置 key）、`qualityDifferences`、`remarks` 选填。
- `isPreferred` 选填。面料尚无货源时首个货源自动成为首选；指定 `isPreferred: true` 时自动取消其他货源的首选。
- `initialQuote` 选填，字段同新增面料时的报价（`purchasePrice` 必填）。

服务器规则：

- `pricingUnit` 沿用面料主档，报价快照单元默认取货源当前生产单元。
- 同一面料同一供应商只能有一条货源关系（409）。

成功：201，返回 `{ data }` 为该面料完整详情（结构与 `GET /api/fabrics/[id]` 一致）。

错误：非法 JSON/字段/供应商/生产单元/配置 key 为 400，面料不存在或跨租户为 404，货源重复为 409。

### `PATCH /api/fabrics/[id]/sources/[sourceId]`

用途：维护货源资料或切换首选，事务内写 `OperationLog` 并重算完整度。

请求体（严格模式，字段任意子集）：`supplierUnitId`（`null` 表示清除当前单元）、`supplierFabricCode`、`sampleStatus`、`qualityDifferences`、`remarks`、`isPreferred`。

服务器规则：

- 生产单元必须属于该货源的供应商且为启用状态。
- `isPreferred: true` 自动取消其他货源首选；取消唯一首选后若仍有货源，自动提升第一个货源为首选（面料始终保留恰好一个首选货源）。
- 修改货源当前生产单元不改写历史报价的快照单元。

成功：200，返回 `{ data }` 为该面料完整详情。

错误：非法/空 payload 为 400，面料或货源不存在（含跨面料 sourceId）为 404。

### `POST /api/fabrics/[id]/sources/[sourceId]/quotes`

用途：为货源新增一条采购报价快照，事务内写 `OperationLog` 并重算完整度。

请求体（严格模式）：

- `purchasePrice` 必填且非负；`currency` 3 位大写代码默认 `CNY`。
- `minimumOrderQty`、`leadTime`、`contactName`、`quoteDate`、`qualityDifferences`、`remarks` 选填。
- `supplierUnitId` 选填；未提供或为 `null` 时沿用货源当前生产单元作为快照；提供时必须属于该货源的供应商且为启用状态。

`pricingUnit` 由服务器按面料主档派生，不接受客户端指定。

成功：201，返回 `{ data }` 为该面料完整详情。

错误：非法 JSON/字段/生产单元为 400，面料或货源不存在为 404。

## 配置 API

### `GET /api/config-options`

用途：读取新增面料和筛选所需的启用配置项。

查询参数：`groups`，逗号分隔且至少一个。仅允许以下白名单：

- `development_source`
- `fabric_status`
- `knitted_category`
- `woven_category`
- `fabric_structure`
- `elasticity_level`
- `repurchase_status`
- `dyeing_process_type`
- `post_process_type`
- `inspection_conclusion`
- `fabric_usage`
- `fabric_season`
- `fabric_certification`
- `sample_status`

响应 `{ options }`，每项包含 `group`、`key`、`label`、`sortOrder`。只返回启用项；系统与当前租户存在相同 `group + key` 时租户项优先，不返回重复项。

错误：缺少 groups 或查询白名单外分组返回 400。

## 供应商 API

稳定角色 key：`fabric_supplier`、`greige_supplier`、`weaving_factory`、`dyeing_factory`、`printing_factory`、`finishing_factory`、`market_stall`、`trading_company`。

状态 key：`active`、`inactive`。

### `GET /api/suppliers`

用途：供应商管理列表，也供新增面料搜索供应商。

查询参数：

- `q`: 模糊搜索名称、主要联系人、电话。
- `role`: 一个稳定角色 key。
- `status`: `active`、`inactive`、`all`。不传时默认仅 `active`；供应商管理传 `all`，新增面料搜索不传。
- `limit`: 默认 20，非法值回退 20，范围 1 至 50。

响应 `{ suppliers }`。每项包含供应商基础、联系、合作和风险字段、`roles`、`status`、时间及生产单元数量。

错误：非法角色或状态返回 400。

### `POST /api/suppliers`

用途：创建供应商并写操作日志。

请求体：`name` 必填；`roles` 至少一项并去重；`status` 默认 `active`；可带地区、地址、联系人、电话、邮箱、社交联系方式、主营、默认交期/MOQ、付款方式、合作评价、风险和备注。非空邮箱必须符合格式。

成功：201，返回 `{ supplier }`。非法 JSON 或字段返回 400，数据库唯一冲突返回 409。

### `GET /api/suppliers/[id]`

用途：读取当前租户供应商详情。返回 `{ supplier }`；不存在或跨租户返回 404。

### `PATCH /api/suppliers/[id]`

用途：更新供应商资料或通过 `status` 启用/停用，并写操作日志。

请求体：创建字段的任意非空子集；严格模式不接受 `tenantId` 等未知字段。`roles` 如提供仍至少一项。

返回 `{ supplier }`。非法 JSON/字段返回 400，不存在或跨租户返回 404，唯一冲突返回 409。

## 生产单元 API

单元形式 key：`branch`、`business_unit`、`workshop`、`department`、`production_line`、`outsourced_site`、`other`。

业务类型 key：`greige`、`weaving`、`dyeing`、`printing`、`finishing`、`coating`、`laminating`、`inspection`、`other`。

状态 key：`active`、`paused`。

### `GET /api/suppliers/[id]/units`

用途：读取指定供应商下的生产单元。

查询参数：

- `q`: 搜索名称、主要业务、主要产品和工艺能力。
- `unitForm`: 一个单元形式 key。
- `businessType`: 一个业务类型 key。
- `status`: `active` 或 `paused`；不传表示全部。
- `limit`: 默认 20，范围 1 至 50。

响应 `{ units }`，每项包含生产单元字段及所属供应商摘要。供应商不存在或跨租户返回 404；非法筛选返回 400。

### `POST /api/suppliers/[id]/units`

用途：在启用供应商下创建生产单元并写操作日志。

请求体：`name`、`unitForm` 必填；`businessTypes` 至少一项并去重；`status` 默认 `active`；`supportsSampling` 默认 `true`；其余能力、合作、联系和风险字段选填。

成功：201，返回 `{ unit }`。非法 JSON/字段返回 400；供应商不存在返回 404；供应商已停用或同供应商下名称重复返回 409。

### `GET /api/supplier-units/[id]`

用途：读取当前租户生产单元详情。返回 `{ unit }`；不存在或跨租户返回 404。

### `PATCH /api/supplier-units/[id]`

用途：更新生产单元资料或通过 `status` 启用/暂停，并写操作日志。

请求体：创建字段的任意非空子集。严格模式不接受 `tenantId`、`supplierId` 等未知字段，因此不能借更新改变归属。

返回 `{ unit }`。非法 JSON/字段返回 400，不存在或跨租户返回 404，同供应商下名称重复返回 409。

## 未提供的 API

当前没有以下真实 API：

- 面料 `PATCH` 或 DELETE。
- 独立添加/编辑 `FabricSupplier`。
- 独立新增 `FabricSupplierQuote`。
- 供应商或生产单元 DELETE。
- 寄样、客户、销售报价、订单和库存 API。

UI 中对应入口如有展示，必须明确标记“后续开放”，不能模拟成功写入。

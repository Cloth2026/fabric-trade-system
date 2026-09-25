# 面料库字段与表单结构

本文档记录面料库 MVP 的详细字段、表单结构和业务规则。当前 Prisma schema、新增面料 API、真实列表和真实详情已经落地；未来编辑、货源维护和采购报价写入仍应复用这里的字段语义，并以 `prisma/schema.prisma` 和 `docs/API_CONTRACTS.md` 为实现事实来源。

## 设计原则

- 面料档案不是简单商品资料，必须围绕结构、生产过程、工艺链、计价单位和资料可补全性设计。
- 允许快速建档和不完整资料保存，但需要明确标记缺失项，便于后续补全。
- 针织默认按公斤计价，梭织默认按米计价，MVP 阶段不开放任意单位。
- 枚举字段都应预留“配置管理”能力，配置页面后续实现。
- 工艺信息分为坯布信息、染整信息、后工艺信息。三者都可为空，也可标记为待确认。
- 染整包含染色、印花和常规整理；后工艺是染整之后的独立工艺，例如烫金、植绒、压皱、压花等。
- V1 暂不管理面料颜色；颜色、色卡、样品图片后续作为独立模块扩展。
- 一个面料可以对应多个供应商，供应商货源和供应商报价不再放在 `Fabric` 主表的单一供应商字段中表达。

## 表单分区

### 1. 基础信息

| 字段 | 必填 | 类型 | 规则 / 说明 |
| --- | --- | --- | --- |
| 面料英文名称 | 否 | 文本 | 用于英文资料、出口或客户资料展示 |
| 面料名称 | 是 | 文本 | 中文主名称 |
| 面料编号 | 是 | 固定前缀 + 文本 | 固定前缀 `SDD-` 不可修改；横杠后手动填写；当前租户内唯一；总长度不超过 64 字符 |
| 面料类型 | 是 | 枚举 | `针织` / `梭织` |
| 计价单位 | 是 | 派生字段 | 针织为 `公斤`，梭织为 `米` |
| 开发来源 | 是 | 枚举 | 自主研发、市场采购、客户来样、供应商提供、展会采集 |
| 面料状态 | 否 | 枚举 | 待完善、可销售、停用、淘汰 |
| 成分 | 是 | 文本 | 例如 `95%棉 5%氨纶` |
| 克重 | 是 | 文本 / 数值+单位 | MVP 可先保存文本，后续可拆数值和单位 |
| 门幅 | 是 | 文本 / 数值+单位 | MVP 可先保存文本，后续可拆数值和单位 |
| 纱支 | 否 | 文本 | 针织 / 梭织都可填写 |
| 经纬密 | 条件必填待定 | 文本 | 仅梭织显示；是否必填后续按实际业务再定 |

### 2. 分类结构

针织与梭织使用不同细类枚举，但字段语义相同。

| 字段 | 必填 | 类型 | 条件 | 说明 |
| --- | --- | --- | --- | --- |
| 针织细类 | 否 | 枚举 | 面料类型为针织 | 汗布、罗纹、双面、珠地、网眼、毛圈、卫衣布、经编等 |
| 梭织细类 | 否 | 枚举 | 面料类型为梭织 | 平纹、斜纹、缎纹、牛仔、府绸、帆布、提花等 |
| 组织结构 | 否 | 枚举 | 所有类型 | 选项随针织 / 梭织变化 |
| 弹力等级 | 否 | 枚举 | 针织 | 无弹、微弹、高弹等 |
| 是否弹力 | 否 | 枚举 | 梭织 | 无弹、微弹、高弹等 |

说明：不再单独保留“是否含氨纶”，是否含氨纶由成分字段表达。

### 3. 来源与价格

| 字段 | 必填 | 类型 | 条件 | 说明 |
| --- | --- | --- | --- | --- |
| 来源联系人 | 否 | 文本 | 所有类型 | 可记录档口、业务员或联系人 |
| 来源日期 | 否 | 日期 | 所有类型 | 采购 / 采集 / 来样日期 |
| 成品参考价（不含税） | 否 | 金额 | 所有类型 | `finishedReferencePriceExclTax`，市场成品价格或预估销售参考 |
| 成品参考价（含税） | 否 | 金额 | 所有类型 | `finishedReferencePriceInclTax`，手工填写，不与不含税价互相推导 |
| 成品参考价税点 | 否 | 百分比 | 所有类型 | `finishedReferenceTaxRate`，界面填 `13` 表示 13%，库存小数 `0.13` |
| 是否可复购 | 否 | 枚举 | 所有类型 | 未知、可复购、不可复购、需确认 |
| 纸管重量 | 否 | 文本 / 数值 | 针织 | 针织按公斤计价时影响称重和核算 |
| 空差 | 否 | 文本 / 数值 | 所有类型 | 针织、梭织都可记录 |

说明：

- 已移除“是否独家”和“成本状态”。成本结构后续应由成本 / 供应链模块计算，不在基础档案中用单字段表达。
- `Fabric.supplierId`、`Fabric.supplierQuote`、`Fabric.minimumOrderQty` 等旧单供应商字段仅作为 legacy 字段暂时保留，避免删除现有数据；新功能不再依赖这些字段。
- 多供应商货源与供应商报价见下一节。

### 3.1 面料供应商货源与报价历史

一个面料可以对应多个供应商。供应商关系和报价历史拆成两层：

1. `FabricSupplier`：面料与供应商的长期供货关系，只保存稳定关系字段。
2. `FabricSupplierQuote`：供应商报价历史，每次报价新增一条快照记录，不覆盖旧价格。

设计规则：

- `FabricSupplier` 不保存价格、币种、计价单位、MOQ、交期、联系人和报价日期，避免“当前条件”和最新报价不同步。
- `FabricSupplierQuote` 不冗余保存 `fabricId`、`supplierId`、`supplierFabricCode`，统一通过 `FabricSupplier` 关联读取面料、供应商和供应商货号。
- 每条报价历史必须有 `purchasePriceExclTax` 和 `quoteDate`；`quoteDate` 默认当前时间。
- `FabricSupplier.supplierUnitId` 可选记录当前常用或负责该面料的生产单元；同一租户、面料和供应商仍只保留一条长期供货关系。
- `FabricSupplierQuote.supplierUnitId` 独立保存当次报价实际对应的生产单元，后续修改长期关系上的常用生产单元不会改写历史报价。
- 面料详情 API 的每条报价返回报价自己的 `supplierUnitId` 和 `supplierUnit`，不得用长期关系当前生产单元替代。

`FabricSupplier` 字段：

| 字段 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- |
| supplierId | 是 | 供应商引用 | 关联 `Supplier` |
| supplierUnitId | 否 | 生产单元引用 | 当前常用或负责该面料的生产单元 |
| supplierFabricCode | 否 | 文本 | 供应商自己的货号 / 品号 |
| sampleStatus | 否 | 枚举 key | V1 只记录供应商关系中的样品状态，不展开寄样流程 |
| qualityDifferences | 否 | 多行文本 | 同款面料不同供应商的品质差异 |
| isPreferred | 否 | 布尔 | 是否优先供应商 |
| remarks | 否 | 多行文本 | 其他说明 |

`SupplierUnit` 生产单元说明：

- 生产单元属于一个 `Supplier`，可表示分厂、事业部、车间、部门、生产线、外协点或其他组织形式。
- `unitForm` 为单选稳定 key，`businessTypes` 为至少一项的多选稳定 key，`processCapabilities` 保留自由文本工艺描述。
- 货源当前生产单元允许为空并使用 `onDelete: SetNull`。
- 报价历史生产单元允许为空，但一旦被报价引用即受 `onDelete: Restrict` 保护；业务上使用暂停而不是删除。
- 后续货源和报价写 API 必须验证生产单元属于当前租户和同一个供应商。

`FabricSupplierQuote` 字段：

| 字段 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- |
| fabricSupplierId | 是 | 关系引用 | 关联 `FabricSupplier` |
| supplierUnitId | 否 | 生产单元引用 | 当次报价实际对应的生产单元，作为历史快照保留 |
| purchasePriceExclTax | 是 | 金额 | 不含税采购价 |
| purchasePriceInclTax | 否 | 金额 | 含税采购价，手工填写 |
| purchaseTaxRate | 否 | 百分比 | 税点，界面填 `13` 表示 13%，库存小数 `0.13`，须在 0–100 之间 |
| currency | 是 | 文本 | 默认 `CNY` |
| pricingUnit | 是 | 枚举 | `kg` / `meter` |
| minimumOrderQty | 否 | 文本 | 报价当时起订量 |
| leadTime | 否 | 文本 | 报价当时交期 |
| contactName | 否 | 文本 | 报价联系人 |
| quoteDate | 是 | 日期 | 报价日期，默认当前时间 |
| qualityDifferences | 否 | 多行文本 | 报价或批次相关品质差异 |
| remarks | 否 | 多行文本 | 其他说明 |

安全迁移方案：

- 本轮不删除 `Fabric` 上的旧供应商字段。
- 如果旧数据中存在 `Fabric.supplierId` 或 `Fabric.supplierQuote`，后续应写一次显式迁移脚本：
  - 为每条旧面料供应商数据创建一条 `FabricSupplier`。
  - 如果存在旧 `supplierQuote`，同步创建一条 `FabricSupplierQuote`。
  - 迁移完成并确认业务读写都切到新表后，再考虑移除旧字段。

### 4. 坯布信息

坯布信息是可选分区，状态包括：`无`、`待确认`、`有`。

**一对多**：一款面料可以记录多条坯布（`GreigeFabric`），用于表达多家织厂或不同规格的坯布。UI 按后工艺的交互模式提供「增加坯布 / 移除坯布」；保存时该分区按当前填写内容整体替换。

| 字段 | 必填 | 类型 | 显示条件 | 说明 |
| --- | --- | --- | --- | --- |
| 坯布状态 | 否 | 枚举 | 始终显示 | 无、待确认、有 |
| 胚布供应商 | 否 | 可搜索下拉 | 状态为有 | 支持模糊检索供应商 |
| 胚布名称 / 编号 | 否 | 文本 | 状态为有 | 可记录供应商坯布名称或编号 |
| 胚布成分 | 否 | 文本 | 状态为有 | 可与成品成分不同 |
| 胚布克重 | 否 | 文本 | 状态为有 | 染整前克重 |
| 胚布门幅 | 否 | 文本 | 状态为有 | 染整前门幅 |
| 胚布单价（不含税） | 否 | 金额 | 状态为有 | `unitPriceExclTax` |
| 胚布单价（含税） | 否 | 金额 | 状态为有 | `unitPriceInclTax`，手工填写 |
| 税点 | 否 | 百分比 | 状态为有 | `taxRate`，界面填 `13` 表示 13%，库存小数 `0.13` |
| 胚布损耗 | 否 | 文本 / 数值 | 状态为有 | 生产损耗 |
| 坯布备注 | 否 | 多行文本 | 状态为有 | 其他说明 |

说明：用户口径里使用“胚布供应商”，后续数据库建议统一命名为 `greigeSupplierId`，界面可保留业务叫法。

### 5. 染整信息

染整信息是可选分区，状态包括：`无`、`待确认`、`有`。

**一对多**：一款面料可以记录多条染整（`DyeingFinishing`），例如「染色」和「定型」分别由不同染厂、不同单价完成。交互与保存规则同坯布。

| 字段 | 必填 | 类型 | 显示条件 | 说明 |
| --- | --- | --- | --- | --- |
| 染整状态 | 否 | 枚举 | 始终显示 | 无、待确认、有 |
| 染整类型 | 否 | 枚举 | 状态为有 | 染色、印花、水洗、定型、柔软、复合等 |
| 染整厂 | 否 | 可搜索下拉 | 状态为有 | 支持模糊检索供应商 |
| 染整单价（不含税） | 否 | 金额 | 状态为有 | `unitPriceExclTax` |
| 染整单价（含税） | 否 | 金额 | 状态为有 | `unitPriceInclTax`，手工填写 |
| 税点 | 否 | 百分比 | 状态为有 | `taxRate`，界面填 `13` 表示 13%，库存小数 `0.13` |
| 染整损耗 | 否 | 文本 / 数值 | 状态为有 | 染整损耗 |
| 交期 | 否 | 文本 / 数值 | 状态为有 | 可先保存文本 |
| 注意事项 | 否 | 多行文本 | 状态为有 | 风险和工艺注意点 |

说明：当前新增面料页已按轻量字段展示，后续可以按此表逐步补齐。

### 6. 后工艺信息

后工艺信息是可选分区，状态包括：`无`、`待确认`、`有`。

| 字段 | 必填 | 类型 | 显示条件 | 说明 |
| --- | --- | --- | --- | --- |
| 后工艺状态 | 否 | 枚举 | 始终显示 | 无、待确认、有 |
| 后工艺类型 | 否 | 枚举 | 状态为有 | 烫金、植绒、压皱、压花、涂层、冲孔、绣花等 |
| 后工艺厂 | 否 | 可搜索下拉 | 状态为有 | 支持模糊检索供应商 |
| 效果 / 位置说明 | 否 | 文本 | 状态为有 | 例如满版、局部、正面、反面 |
| 后工艺单价（不含税） | 否 | 金额 | 状态为有 | `unitPriceExclTax` |
| 后工艺单价（含税） | 否 | 金额 | 状态为有 | `unitPriceInclTax`，手工填写 |
| 税点 | 否 | 百分比 | 状态为有 | `taxRate`，界面填 `13` 表示 13%，库存小数 `0.13` |
| 后工艺损耗 | 否 | 文本 / 数值 | 状态为有 | 生产损耗 |
| 最小起订量 | 否 | 文本 / 数值 | 状态为有 | 加工厂 MOQ |
| 交期 | 否 | 文本 / 数值 | 状态为有 | 可先保存文本 |
| 风险备注 | 否 | 多行文本 | 状态为有 | 掉粉、牢度、色差、手感变化等风险 |

### 7. 质量与备注

| 字段 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- |
| 色牢度 | 否 | 文本 | 可记录检测等级 |
| 起毛起球 | 否 | 文本 | 可记录检测等级 |
| 检测结论 | 否 | 枚举 | 未检测、合格、需复检、风险 |
| 手感评价 | 否 | 文本 | 主观手感描述 |
| 备注 | 否 | 多行文本 | 其他说明 |

说明：已移除“缩率”。如果后续需要缩率，应优先放入染整工艺或检测报告模块，而不是基础质量备注。

### 8. 用途 / 季节 / 认证

该分区用于辅助检索和后续补全，放在新增面料表单末尾，与“质量与备注”同级。

| 字段 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- |
| 用途 | 否 | 多选标签 | T恤、内衣、家居服、运动服、鞋材、箱包、领口、袖口、下摆、工装、裤装、外套、衬衫、校服、制服、户外服、冲锋衣、裙装、里布、睡衣、毯子、帽子、装饰布、牛仔裤、童装 |
| 适用季节 | 否 | 多选标签 | 春夏、秋冬 |
| 认证标准 | 否 | 多选标签 | OEKO-TEX、GOTS、BLUESIGN |

数据库映射：

- 用途：`Fabric.usageOptionKeys`，保存 `ConfigOption.group = "fabric_usage"` 下被选中的 `key`。
- 适用季节：`Fabric.seasonOptionKeys`，保存 `ConfigOption.group = "fabric_season"` 下被选中的 `key`。
- 认证标准：`Fabric.certificationOptionKeys`，保存 `ConfigOption.group = "fabric_certification"` 下被选中的 `key`。
- 新增面料页面只引用启用状态的配置项；选项显示名、排序、启停后续由枚举配置管理维护。
- 通用标签：`Fabric.tags`，保留给后续自由标签、风险标签或运营标签使用。

## 枚举配置清单

新增面料页面已通过 `GET /api/config-options` 读取启用选项，显示中文 `label`、提交稳定英文 `key`。配置管理页面尚未开发，但以下分组已经由 `ConfigOption` 和 seed 管理：

- 开发来源
- 面料状态
- 针织细类
- 梭织细类
- 组织结构
- 弹力等级 / 是否弹力
- 是否可复购
- 坯布状态
- 染整状态
- 染整类型
- 后工艺状态
- 后工艺类型
- 检测结论
- 用途
- 适用季节
- 认证标准
- 供应商样品状态

## 完整度规则

第一版建议以“资料完整度”辅助用户补全档案，不强行阻止保存。

基础必填缺失：

- 面料编号
- 面料名称
- 面料类型
- 开发来源
- 成分
- 克重
- 门幅

待补标记：

- 坯布状态为待确认
- 染整状态为待确认
- 后工艺状态为待确认
- 没有任何 `FabricSupplier`
- 优先供应商价格为空
- 梭织经纬密为空

## 当前实现状态与后续

已实现：

- Prisma 面料、工艺、供应商、生产单元、货源、报价历史、配置和操作日志模型。
- 新增面料 API、配置校验、完整度计算、多供应商和可选首次报价。
- 新增面料真实表单、真实列表和真实详情读取。
- 供应商及生产单元真实管理。

尚未实现：

1. 配置项管理 UI。
2. 颜色、色号和色卡（V1 明确不做）。
3. 库存业务接入（`FabricStockInBatch` 仍是预留模型）。
4. 面料删除、附件 / 图片上传。

## 面料编辑规则 - 2026-09-25

- `PATCH /api/fabrics/[id]` 覆盖主档、坯布、染整、后工艺、质量与标签，一次提交即整体保存工艺明细。
- **面料编号可修改**：仍需 `SDD-` 前缀、租户内唯一，重复返回 409，旧编号写入 `OperationLog.previousCode`。
- **面料类型受限修改**：`fabricType` 决定 `pricingUnit`（针织 kg / 梭织米），而已有采购报价已快照计价单位。因此**该面料尚无任何采购报价时**才允许改类型；已有报价时返回 409。
- 工艺状态与明细必须一致：状态为「无」时不能提交明细，状态为「有」时至少一条明细，否则 400。
- 坯布与染整按后工艺模式改为一对多，保存时整体替换（`deleteMany` + 逐条 `create`）。
- 供应商货源与采购报价仍在详情页用独立维护抽屉，不并入编辑抽屉。

## 价格含税 / 不含税与税点 - 2026-09-25

面料库里所有价格都拆成「不含税」和「含税」两个字段，并各带一个手工填写的税点：

| 位置 | 不含税 | 含税 | 税点 |
| --- | --- | --- | --- |
| 成品参考价（`Fabric`） | `finishedReferencePriceExclTax` | `finishedReferencePriceInclTax` | `finishedReferenceTaxRate` |
| 采购报价（`FabricSupplierQuote`） | `purchasePriceExclTax`（必填） | `purchasePriceInclTax` | `purchaseTaxRate` |
| 坯布 / 染整 / 后工艺 | `unitPriceExclTax` | `unitPriceInclTax` | `taxRate` |

规则：

1. **两个价格都手工填写并原样存库**，系统不用其中一个推导另一个，也不用两者反算税点。这样供应商"报含税"或"报不含税"的原话都能如实记录。
2. **税点单位**：界面填百分比数字（`13` 表示 13%），API 与数据库存小数（库里 `0.13`），`Decimal(6,3)`。这与客户报价单 / 销售订单的 `taxRate` 口径一致，跨模块不需要换算。
3. **税点可留空**：留空时展示与计算按 0 处理。后端校验 `0 ≤ 税率 ≤ 1`，超出返回 400。
4. **历史数据**：迁移 `20260925035141` 之后的 `20260925055710_price_tax_exclusive_inclusive_split` 把旧列 **RENAME** 成不含税列（历史值按不含税价解释），新增含税列与税点列，因此旧数据的价格不会丢失，税点为空。
5. 报价单 / 销售订单引用采购报价做成本快照时取的是**不含税采购价**（`purchasePriceExclTax`），与"成本恒为 CNY 不含税口径"一致。

## Backend Creation Rules - 2026-09-13

- `POST /api/fabrics` now creates fabric records through a server-side service layer.
- `tenantId` is resolved on the server by the temporary single-tenant context. Request bodies must not provide or override `tenantId`.
- `pricingUnit` is derived by the server: `knitted -> kg`, `woven -> meter`.
- New writes must not populate legacy `Fabric.supplierId`, `Fabric.supplierQuote`, or `Fabric.minimumOrderQty`.
- Supplier source data is written through `FabricSupplier`.
- Supplier quote snapshots are written through `FabricSupplierQuote`.
- `FabricSupplierQuote.purchasePriceExclTax` is required. `quoteDate` is generated by the server when not provided.
- Config-backed keys must exist and be enabled before saving: `development_source`, `fabric_status`, `knitted_category`, `woven_category`, `fabric_structure`, `elasticity_level`, `repurchase_status`, `dyeing_process_type`, `post_process_type`, `inspection_conclusion`, `fabric_usage`, `fabric_season`, and `fabric_certification`.
- Completeness is calculated in `src/server/fabrics/completeness.ts` and saved to `Fabric.completenessPercent` plus `Fabric.missingInfoFlags`.
- Current completeness flags include missing core fields, missing supplier, missing preferred supplier quote, pending process statuses, and missing woven warp/weft density.

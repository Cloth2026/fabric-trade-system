# 客户报价单 · 产品设计

> 状态：**已确认，可用于实现**（2026-09-22）。按 `AGENTS.md`「产品设计先确认，再实现数据库、API 和真实 UI」，本文档确认后进入实现阶段。后续如要改字段或状态流转，回到这里改文档再动代码。

## 0. 决策记录

| # | 议题 | 结论 | 决定人 | 日期 |
| --- | --- | --- | --- | --- |
| 1 | 报价数量是否必填 | **选填**。不填则只显示单价 / 含税单价，金额与毛利列显示「—」 | 用户 | 2026-09-22 |
| 2 | 超期（expired）判定 | **双轨**：默认按 `validUntil` 在列表红字提示，**不改库**；同时提供手工「标记已过期」按钮 | 用户 | 2026-09-22 |
| 3 | 同一面料多行 | **允许**。不同色号 / 数量可拆成多行，靠 `sortOrder` + `colorOrRemark` 区分，不加唯一约束 | 用户 | 2026-09-22 |
| 4 | 币种 | **支持 CNY 与 USD**。单头币种，成本固定以 CNY 记，靠汇率折算后比价 | 用户 | 2026-09-22 |
| 5 | 成本快照可否手改 | **允许手工覆盖**。选采购报价自动带出，带出后可改，也可不选直接手填 | 用户 | 2026-09-22 |
| 6 | 汇率字段 | **表头 `exchangeRate`（Decimal 14,6），含义「1 单位报价币种 = N CNY」，手填，CNY 单固定 1**。汇率随单留存，历史报价单毛利不随汇率漂移 | 用户 | 2026-09-22 |
| 7 | 明细行币种字段 | **删掉**，币种只认单头 | 用户 | 2026-09-22 |

## 1. 背景与目标

`docs/PRODUCT_REQUIREMENTS.md` 列出的四项高频工作之一是「制作客户报价单」。面料库、供应商、客户、寄样已完成，报价单的输入要素（面料、客户、采购价）已齐备。

目标：让业务人员能**针对某个客户，从面料库挑若干面料，报出含税售价，留档可查**，并且事后能知道这一单的毛利水平。

## 2. 范围

**本次做**

- 客户报价单的列表、搜索、状态筛选、超期提示。
- 新建报价单：选客户（+ 联系人）、选面料（可重复）、填单价与可选数量、自动算含税价。
- 明细行可关联一条采购报价带出成本，**带出后允许手工覆盖**。
- 报价单详情：表头条款 + 明细行 + 金额合计与毛利。
- 状态推进：草稿 → 已发送 → 客户已接受 / 客户未接受 / 已过期（含手工标记）。
- 编辑报价单（仅限草稿态）。

**本次不做**

- 订单、合同、发货、收款。
- 报价转订单的一键操作（留到订单模块）。
- 多版本对比与改价历史（表上预留 `version`，本次不建 UI）。
- 颜色 / 色卡主档（Roadmap 明确暂缓；本模块的色号只是明细行上的一个文本备注）。
- 报价单打印导出（PDF/Excel）。
- 审批流、折扣审批、权限分级。
- 汇率自动抓取（本次只手工填汇率）。

## 3. 关键概念界定

| 概念 | 含义 | 数据来源 |
| --- | --- | --- |
| 采购报价 | 供应商给我的进货价（CNY） | `FabricSupplierQuote`（已存在，**本次不改**） |
| 客户报价 | 我给客户的售价（CNY 或 USD） | 本次新增 |
| 参考成本 | 报价当时的采购价副本，**以 CNY 记录**，可手工覆盖 | 存于报价明细行 |
| 汇率 | 1 单位报价币种 = 多少 CNY | 报价单表头，手填，默认 1（CNY 时） |

**硬性约束**：客户报价**只读取**采购报价，永不回写。供应商日后涨价，已发出的客户报价单金额不变；反过来，手改报价单上的成本也**不会影响**采购报价历史。这条与 Roadmap「不直接覆盖采购报价历史」一致。

## 4. 数据模型

### 4.1 `CustomerQuote`（报价单表头）

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | cuid | 是 | |
| tenantId | string | 是 | 租户隔离 |
| code | string | 是 | `QT-YYYYMMDD-NNN`，租户内唯一 |
| customerId | string | 是 | 关联 `Customer` |
| contactId | string? | 否 | 关联 `CustomerContact`，须属于同一客户 |
| status | string | 是 | 默认 `draft`，取值见 §5 |
| version | int | 是 | 默认 1，本次不使用，为将来改价预留 |
| currency | string | 是 | `CNY` / `USD`，默认取 `Customer.defaultCurrency`，不在这两者内时回落 `CNY` |
| exchangeRate | decimal(14,6) | 是 | **新增**。1 单位报价币种 = N CNY；`CNY` 时强制 1，`USD` 时必填且 > 0 |
| quoteDate | datetime | 是 | 默认当天 |
| validUntil | datetime? | 否 | 有效期，用于超期提示 |
| priceTerms | string? | 否 | 贸易条款（FOB / CIF / EXW 等） |
| deliveryTerms | string? | 否 | 交货方式 |
| leadTime | string? | 否 | 交期，表头级默认，明细行可覆盖 |
| paymentTerms | string? | 否 | 新建时取 `Customer.paymentTerms` |
| taxRate | decimal(6,3) | 否 | 表头默认税率，明细行可覆盖 |
| remark | string? | 否 | |
| sentAt | datetime? | 否 | 转为已发送时盖章 |
| decidedAt | datetime? | 否 | 接受 / 未接受 / 过期时盖章 |

### 4.2 `CustomerQuoteItem`（报价明细行）

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | cuid | 是 | |
| tenantId | string | 是 | |
| quoteId | string | 是 | 级联删除 |
| fabricId | string | 是 | 关联 `Fabric`，须同租户；**同一单内可重复出现** |
| fabricSupplierQuoteId | string? | 否 | 关联采购报价，仅用于带出成本初值 |
| unit | string? | 否 | 面料计价单位快照，同寄样的做法 |
| quantity | decimal(12,3)? | **否** | 报价数量，**选填**，不填则本行只报单价 |
| minimumOrderQty | string? | 否 | 起订量，默认带自采购报价，可改 |
| unitPrice | decimal(12,2) | 是 | **不含税**单价，币种同表头 |
| costPrice | decimal(12,2)? | 否 | 参考成本，**恒为 CNY**。选采购报价自动带出，**允许手工覆盖或清空** |
| taxRate | decimal(6,3)? | 否 | 行级税率，缺省取表头 |
| leadTime | string? | 否 | |
| colorOrRemark | string? | 否 | 色号 / 备注，同一面料拆多行时靠它区分 |
| remark | string? | 否 | |
| sortOrder | int | 是 | 行序 |

### 4.3 派生字段（不落库，前端与服务端按同一套规则计算）

设 `rate = exchangeRate`（CNY 时为 1），`tax = 行税率 ?? 表头税率 ?? 0`：

- 不含税单价（CNY 口径） = `unitPrice × rate`
- 含税单价 = `unitPrice × (1 + tax)`（报价币种）
- 不含税金额 = `quantity × unitPrice`（报价币种）；**`quantity` 为空则显示「—」**
- 含税金额 = 不含税金额 × (1 + tax)；`quantity` 为空时同样显示「—」
- 单件毛利（CNY） = `unitPrice × rate − costPrice`；无 `costPrice` 时显示「无成本参考」
- 行毛利（CNY） = 单件毛利 × `quantity`；无数量时只显示单件毛利
- 毛利率 = 单件毛利 ÷ (`unitPrice × rate`)

> **统一口径**：金额一律用报价币种展示；成本与毛利一律折算成 **CNY** 展示，USD 单在毛利旁标注「按汇率 X 折算」。

## 5. 状态机

```
draft ──发送──> sent ──> accepted
  │               │
  │               ├────> rejected
  │               │
  └──标记过期─────┴────> expired（手工）
```

| 状态 | key | 是否可编辑 | 说明 |
| --- | --- | --- | --- |
| 草稿 | draft | 可 | 新建默认，可直接标记过期 |
| 已发送 | sent | 否 | 盖章 sentAt |
| 客户已接受 | accepted | 否 | 盖章 decidedAt，**终态** |
| 客户未接受 | rejected | 否 | 盖章 decidedAt，**终态** |
| 已过期 | expired | 否 | 盖章 decidedAt，**终态** |

状态 key 存英文，中文标签走 `ConfigOption` 组 `customer_quote_status`，与既有模块口径一致。

### 5.1 超期提示（不改库）

- 判定：`validUntil` 存在且早于今天，且状态不属于 `accepted` / `rejected` / `expired`。
- 表现：列表行与详情头部在状态徽标旁显示红字「已超期 N 天」。
- **不写库、不加定时任务**：不会因为时间流逝自动把 `sent` 改成 `expired`。
- 真要落库，由用户在详情里点「标记为已过期」手工执行。

## 6. 交互流程

### 6.1 列表页

沿用寄样模块布局（统计卡 + 搜索 + 表格）：

- 统计卡：报价单数 / 待回复（sent）/ 已接受 / 超期未处理。
- 搜索：单号、客户名、面料编号。
- 筛选：状态下拉。
- 表格列：单号、客户、状态（超期红字）、行数、币种、含税合计、报价日期、有效期、最近更新。
  - 币种列显示 `CNY` / `USD`；合计列按各自币种原样展示，不做跨币种汇总。
- 操作：新增报价单、点行开详情。

### 6.2 新增抽屉

分区与寄样表单一致（这里为 报价对象 / 报价明细 / 条款与备注）：

1. **报价对象**：客户（必填，搜索选择）→ 选完级联出联系人（可留空）。币种、付款条款自动带出客户档案值，可改。
   - 币种选 `CNY` 时汇率框只读显示 1；选 `USD` 时汇率框必填（提示「1 USD = ? CNY」）。
2. **报价明细**：面料（搜索选择，**可重复选同一面料**）→ 选完自动列出该面料的采购报价供选（可跳过）→ 填数量（选填）、不含税单价 → 实时显示含税单价、含税金额、毛利。
   - 选了采购报价则自动填 `costPrice` 与 `minimumOrderQty`，**成本框可改、可清空**。
   - 成本框右侧标注「CNY」，改动后提示「仅影响本报价单，不回写采购报价」。
   - 「添加面料」可加多行；同一面料多行时在色号备注里写明色号。
3. **条款与备注**：报价日期、有效期、贸易条款、交货方式、交期、税率、备注。

底部：合计含税（按币种）、整体毛利（CNY，USD 单标注汇率）。

### 6.3 详情抽屉

- 头部：单号 + 状态徽标 + 超期红字。
- 状态推进按钮组（同寄样的「标记为…」样式）：发送 / 已接受 / 未接受 / 标记已过期。
- 表头信息：客户、联系人、币种与汇率、报价日期、有效期、贸易条款、交期、付款条款、备注。
- 明细表：`面料编号 / 名称 / 色号 / 成本(CNY) / 不含税单价 / 数量 / 含税单价 / 含税金额 / 毛利率 / 备注`。
- 合计区：含税合计（币种）、整体毛利（CNY）、整体毛利率。

### 6.4 编辑

仅 `draft` 态有「编辑」入口，复用新增抽屉；编辑同样允许改成本与汇率。

## 7. 校验规则

| 场景 | 处理 |
| --- | --- |
| 客户不属于当前租户 | 404 |
| 联系人不属于该客户 | 400 |
| 面料不属于当前租户 / 已删除 | 400 |
| 采购报价不属于所选面料 | 400 |
| `currency` 不在 `CNY` / `USD` 内 | 400 |
| `currency = USD` 且 `exchangeRate` 缺失或 ≤ 0 | 400 |
| `unitPrice` ≤ 0 或非数字 | 400 |
| `quantity` 有值但 ≤ 0 | 400 |
| `costPrice` 有值但 < 0 | 400 |
| `taxRate` 超出 0–1 | 400 |
| 明细行为空 | 400 |
| 单号冲突 | 409（自动生成，理论上不冲突） |
| 非草稿态编辑 | 400 |
| 从终态（accepted / rejected / expired）再流转 | 400 |

## 8. API 草案（**未实现，仅设计**）

遵循 `docs/API_CONTRACTS.md` 通用约定：租户隔离、`Decimal` 出字符串、ISO 日期、400/404/409 语义。

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| GET | `/api/customer-quotes` | 列表，`q` / `status` / `customerId` / `overdue` 筛选 |
| POST | `/api/customer-quotes` | 新建（含明细行） |
| GET | `/api/customer-quotes/[id]` | 详情 |
| PATCH | `/api/customer-quotes/[id]` | 编辑（仅草稿） |
| PATCH | `/api/customer-quotes/[id]/status` | 状态推进（含手工标记过期） |

列表与详情的响应里带派生字段：`isOverdue`、`overdueDays`、每行 `grossMargin` / `grossMarginRate`、单头 `totalNetAmount` / `totalTaxAmount` / `totalGrossMargin`（缺数量的行不参与金额汇总）。

写入走事务：报价单 + 明细同一事务提交，并写 `OperationLog`（module 建议 `customer_quote`，action `create` / `update` / `update_status`）。

## 9. 测试点

- 新建含多行明细（含同一面料两行），金额与毛利计算正确。
- 数量留空时只出单价，金额列为空且不报错。
- 选采购报价后成本被带出；**手工覆盖**后保存，再改采购报价，客户报价单成本不变，采购报价也不被回写。
- USD 单：汇率必填校验、金额按 USD 展示、毛利按汇率折算成 CNY。
- 超期提示：`validUntil` 过期后列表红字出现，但数据库 `status` 不变；点「标记为已过期」后才落库。
- 终态不可再流转。
- 租户隔离：A 租户读不到 B 租户的报价单，跨租户返回 404。
- 校验：空明细、负单价、跨租户联系人、USD 缺汇率。
- 单号按日递增不重复。

## 10. 与已提交代码的关系

`1c5e930` 已提交 `CustomerQuote` / `CustomerQuoteItem` 两个模型、迁移 `20260922025225_add_customer_quotes`（dev / test 双库已应用）、配置组 `customer_quote_status` 及 `configGroups.customerQuoteStatus`。

按 §0 结论核对后，与已提交模型的差异只有两处，**都用增量迁移解决，不改写已有迁移**：

- 表头新增 `exchangeRate`；
- 明细行 `currency` 的处置（见 §11.2）。

其余字段（选填 `quantity`、可覆盖 `costPrice`、允许同面料多行）在现有模型上已成立，不需要改表。

## 11. 待确认

### 11.1 汇率 → 已确认：表头存 `exchangeRate`

`CustomerQuote.exchangeRate`（Decimal(14,6)），含义「1 单位报价币种 = N CNY」，新建时手填，`CNY` 单强制 1。成本恒记 CNY，毛利统一折成 CNY 展示并标注汇率。汇率随单留存，日后汇率变动不影响历史报价单的毛利口径。

### 11.2 明细行 `currency` → 已确认：删列

币种只属于单头，`CustomerQuoteItem.currency` 以增量 migration 删除，避免同一单内出现币种不一致的脏数据。

---

## 12. 实现阶段的落地顺序

1. 增量 migration：`add_customer_quote_exchange_rate`（加 `exchangeRate`、删明细行 `currency`），dev / test 双库应用。
2. 服务层 `src/server/customer-quotes.ts` + `schemas.ts` + `constants.ts`（含金额/毛利派生计算）。
3. 5 个 API 路由（列表、新建、详情、编辑、状态推进）。
4. 前端 `src/components/quotes/*` + `src/lib/api/customer-quote-client.ts`，接入侧边栏已预留的「报价」入口。
5. 集成测试 + 真实浏览器回归 + 提交。

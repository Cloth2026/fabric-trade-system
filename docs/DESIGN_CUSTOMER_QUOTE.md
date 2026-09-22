# 客户报价单 · 产品设计（待确认）

> 状态：**草稿，等待确认**。按 `AGENTS.md`「产品设计先确认，再实现数据库、API 和真实 UI」，本文档被认可前不写任何实现代码，也不提交 migration。

## 1. 背景与目标

`docs/PRODUCT_REQUIREMENTS.md` 列出的四项高频工作之一是「制作客户报价单」。面料库、供应商、客户、寄样已完成，报价单的输入要素（面料、客户、采购价）已齐备。

目标：让业务人员能**针对某个客户，从面料库挑若干面料，报出含税售价，留档可查**，并且事后能知道这一单的毛利水平。

## 2. 范围

**本次做**

- 客户报价单的列表、搜索、状态筛选。
- 新建报价单：选客户（+ 联系人）、选面料、填数量与单价、自动算含税价。
- 明细行可关联一条采购报价，把采购价**单向快照**为参考成本（只读）。
- 报价单详情：表头条款 + 明细行 + 金额合计与毛利。
- 状态推进：草稿 → 已发送 → 客户已接受 / 客户未接受 / 已过期。
- 编辑报价单（仅限草稿态）。

**本次不做**

- 订单、合同、发货、收款。
- 报价转订单的一键操作（留到订单模块）。
- 多版本对比与改价历史（表上预留 `version`，本次不建 UI）。
- 颜色 / 色号 / 色卡（Roadmap 明确暂缓）。
- 报价单打印导出（PDF/Excel）。
- 审批流、折扣审批、权限分级。

## 3. 关键概念界定

| 概念 | 含义 | 数据来源 |
| --- | --- | --- |
| 采购报价 | 供应商给我的进货价 | `FabricSupplierQuote`（已存在，**本次不改**） |
| 客户报价 | 我给客户的售价 | 本次新增 |
| 参考成本 | 报价当时采购价的**只读副本** | 快照到报价明细行 |

**硬性约束**：客户报价**只读取**采购报价，永不回写。供应商日后涨价，已发出的客户报价单金额不变。这条与 Roadmap「不直接覆盖采购报价历史」一致。

## 4. 数据模型草案

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
| currency | string | 是 | 默认 `CNY`，新建时取 `Customer.defaultCurrency` |
| quoteDate | datetime | 是 | 默认当天 |
| validUntil | datetime? | 否 | 有效期，用于 expired 判定展示 |
| priceTerms | string? | 否 | 贸易条款（FOB / CIF / EXW 等） |
| deliveryTerms | string? | 否 | 交货方式 |
| leadTime | string? | 否 | 交期，表头级默认，明细行可覆盖 |
| paymentTerms | string? | 否 | 新建时取 `Customer.paymentTerms` |
| taxRate | decimal(6,3) | 否 | 表头默认税率，明细行可覆盖 |
| remark | string? | 否 | |
| sentAt | datetime? | 否 | 转为已发送时盖章 |
| decidedAt | datetime? | 否 | 客户接受/未接受时盖章 |

### 4.2 `CustomerQuoteItem`（报价明细行）

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| id | cuid | 是 | |
| tenantId | string | 是 | |
| quoteId | string | 是 | 级联删除 |
| fabricId | string | 是 | 关联 `Fabric`，须同租户 |
| fabricSupplierQuoteId | string? | 否 | 关联采购报价，用于取成本 |
| unit | string? | 否 | 面料计价单位快照，同寄样的做法 |
| quantity | decimal(12,3)? | 否 | 报价数量 |
| minimumOrderQty | string? | 否 | 起订量，默认带自采购报价 |
| unitPrice | decimal(12,2) | 是 | **不含税**单价 |
| costPrice | decimal(12,2)? | 否 | 采购价快照，**只读** |
| currency | string | 是 | 默认 `CNY` |
| taxRate | decimal(6,3)? | 否 | 行级税率，缺省取表头 |
| leadTime | string? | 否 | |
| colorOrRemark | string? | 否 | 色号/备注 |
| remark | string? | 否 | |
| sortOrder | int | 是 | 行序 |

### 4.3 派生字段（不落库，前端/服务端计算）

- 不含税金额 = `quantity × unitPrice`
- 含税单价 = `unitPrice × (1 + taxRate)`
- 含税金额 = 不含税金额 × (1 + taxRate)
- 毛利 = 不含税金额 − `costPrice × quantity`（无成本时显示「无成本参考」）
- 毛利率 = 毛利 ÷ 不含税金额

## 5. 状态机

```
draft ──发送──> sent ──> accepted
                 │
                 ├──────> rejected
                 │
                 └──────> expired（超过 validUntil，仅提示不自动改状态）
```

| 状态 | key | 是否可编辑 | 说明 |
| --- | --- | --- | --- |
| 草稿 | draft | 可 | 新建默认 |
| 已发送 | sent | 否 | 盖章 sentAt |
| 客户已接受 | accepted | 否 | 盖章 decidedAt |
| 客户未接受 | rejected | 否 | 盖章 decidedAt |
| 已过期 | expired | 否 | 手工标记 |

状态 key 存英文，中文标签走 `ConfigOption` 组 `customer_quote_status`，与既有模块口径一致。

**待确认**：`expired` 是手工标记，还是超过 `validUntil` 自动判定（列表红字提示但不改库）？我倾向后者，改动小。

## 6. 交互流程

### 6.1 列表页

沿用寄样模块布局（统计卡 + 搜索 + 表格）：

- 统计卡：报价单数 / 待回复（sent）/ 已接受 / 报价总额（当期）。
- 搜索：单号、客户名、面料编号。
- 筛选：状态下拉、`validUntil` 已过期高亮。
- 表格列：单号、客户、状态、行数、币种、不含税合计、含税合计、报价日期、有效期、最近更新。
- 操作：新增报价单、点行开详情。

### 6.2 新增抽屉

分区与寄样表单一致（寄样对象 / 寄出面料 / 收件与备注 → 这里改为 报价对象 / 报价明细 / 条款与备注）：

1. **报价对象**：客户（必填，搜索选择）→ 选完级联出联系人（可留空）。币种、付款条款自动带出客户档案值，可改。
2. **报价明细**：面料（搜索选择）→ 选完自动列出该面料的采购报价供选（可跳过）→ 填数量、不含税单价 → 实时显示含税单价、含税金额、毛利。
   - 选了采购报价则自动填 `costPrice`（只读展示）与 `minimumOrderQty`。
   - 支持「添加面料」多行。
3. **条款与备注**：报价日期、有效期、贸易条款、交货方式、交期、税率、备注。

底部：合计不含税、合计含税、整体毛利。

### 6.3 详情抽屉

- 头部：单号 + 状态徽标 + 已过期高亮。
- 状态推进按钮组（同寄样的「标记为…」样式）。
- 表头信息：客户、联系人、币种、报价日期、有效期、贸易条款、交期、付款条款、备注。
- 明细表：`面料编号 / 名称 / 采购成本 / 不含税单价 / 数量 / 含税单价 / 含税金额 / 毛利率 / 色号备注`。
- 合计区：不含税合计、含税合计、整体毛利率。

### 6.4 编辑

仅 `draft` 态有「编辑」入口，复用新增抽屉。

## 7. 校验规则

| 场景 | 处理 |
| --- | --- |
| 客户不属于当前租户 | 404 |
| 联系人不属于该客户 | 400 |
| 面料不属于当前租户 / 已删除 | 400 |
| 采购报价不属于所选面料 | 400 |
| `unitPrice` ≤ 0 或非数字 | 400 |
| `quantity` ≤ 0 | 400 |
| `taxRate` 超出 0–1 | 400 |
| 明细行为空 | 400 |
| 单号冲突 | 409（自动生成，理论上不冲突） |
| 非草稿态编辑 | 400 |
| 非法状态流转（如 accepted → draft） | 400 |

## 8. API 草案（**未实现，仅设计**）

遵循 `docs/API_CONTRACTS.md` 通用约定：租户隔离、`Decimal` 出字符串、ISO 日期、400/404/409 语义。

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| GET | `/api/customer-quotes` | 列表，`q` / `status` / `customerId` 筛选 |
| POST | `/api/customer-quotes` | 新建（含明细行） |
| GET | `/api/customer-quotes/[id]` | 详情 |
| PATCH | `/api/customer-quotes/[id]` | 编辑（仅草稿） |
| PATCH | `/api/customer-quotes/[id]/status` | 状态推进 |

写入走事务：报价单 + 明细同一事务提交，并写 `OperationLog`（module 建议 `customer_quote`，action `create` / `update` / `update_status`）。

## 9. 测试点

- 新建含多行明细，金额与毛利计算正确。
- 选采购报价后成本被快照；随后改采购报价，客户报价单成本不变。
- 租户隔离：A 租户读不到 B 租户的报价单，跨租户返回 404。
- 状态流转与 `sentAt` / `decidedAt` 盖章。
- 非草稿态编辑被拒。
- 校验：空明细、负单价、跨租户联系人。
- 单号按日递增不重复。

## 10. 风险与待确认

1. **报价数量是否必填**：有的报价只报单价不报量。我倾向**选填**，不填则只显示单价与含税单价。
2. **expired 判定方式**：见 §5 待确认。
3. **是否允许同一报价单出现同一面料多行**（不同色号/不同数量）：我倾向允许，靠 `sortOrder` 区分。
4. **币种是否支持非 CNY**：字段已留，但采购成本是 CNY，混合币种时毛利不可比。第一版建议**只允许 CNY**，多币种留到外贸场景。
5. **成本快照是否允许手工覆盖**：我倾向不允许（只读），若采购价选错则改选另一条报价。

## 11. 与已写代码的冲突说明

今天上午我在设计未确认的情况下，已经写了 `CustomerQuote` / `CustomerQuoteItem` 两个模型、迁移 `20260922025225_add_customer_quotes`（已应用到 dev / test 双库）、配置组 `customer_quote_status` 及 `configGroups.customerQuoteStatus`，**均未提交**。

本文档确认前这些改动一律视为提案，不作为实现依据；确认后按 §4 校验字段是否有出入，再决定是直接采纳还是调整迁移。

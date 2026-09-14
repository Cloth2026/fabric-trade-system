# Fabric ERP Project Overview

## 项目定位

这是一个面向面料贸易业务的 Web 后台管理系统，当前处于从静态原型进入真实业务闭环的早期开发阶段。系统优先服务局域网多人使用，同时按未来云端 SaaS 和公司内部私有化部署的方向设计。

第一阶段核心模块是“面料库”，目标不是简单商品列表，而是围绕面料档案、结构分类、坯布、染整、后工艺、来源价格、质量备注、用途季节认证、资料完整度等信息建立可补全的面料档案体系。

## 当前技术栈

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS
- Prisma 7
- PostgreSQL
- `@prisma/adapter-pg`
- Zod
- lucide-react
- Framer Motion
- TanStack Table 依赖已安装，后续表格视图可使用

## 项目结构

- `src/app/page.tsx`：当前面料库主页面与新增面料入口。
- `src/components/fabrics/`：新增面料统一状态、基础字段、工艺字段、多供应商字段和真实提交抽屉。
- `src/components/suppliers/`：供应商与下属生产单元的静态 UI 原型、示例数据、详情抽屉和新增/编辑表单。
- `src/components/form/`：Spatial Glass 风格的通用表单控件。
- `src/lib/api/fabric-client.ts`：配置、供应商搜索和新增面料的前端 API 封装。
- `src/app/globals.css`：全局样式、空间玻璃 UI、抽屉动效等。
- `src/lib/prisma.ts`：Prisma Client 初始化。
- `prisma/schema.prisma`：数据库模型。
- `prisma/migrations/`：数据库 migration。
- `prisma/seed.mjs`：默认枚举配置 seed。
- `docs/PROJECT_CONTEXT.md`：项目背景与技术方向。
- `docs/FABRIC_LIBRARY_FIELDS.md`：面料库字段和表单结构设计。
- `docs/DEV_LOG.md`：开发日志和上下文记录。

## 数据库结构

当前 Prisma schema 已包含以下核心模型：

- `Tenant`：租户。为未来 SaaS 和私有化部署预留多租户能力。
- `User`：用户。当前仅有基础字段，权限细分后续实现。
- `ConfigOption`：可维护枚举配置。支持系统级和未来租户级配置。
- `Supplier`：供应商主体。保留 legacy `type`，新增多角色及基础、联系、合作和风险字段。
- `SupplierUnit`：供应商下属生产单元，记录单元形式、业务类型、工艺能力、合作条件、联系人和质量风险。
- `Fabric`：面料主档案。
- `FabricSupplier`：面料与供应商的长期供货关系。一个面料可以对应多个供应商，只保存稳定关系字段。
- `FabricSupplierQuote`：面料供应商报价历史。每次报价新增快照记录，避免覆盖旧价格。
- `GreigeFabric`：坯布信息。
- `DyeingFinishing`：染整信息。
- `PostProcess`：后工艺信息。
- `FabricStockInBatch`：入库批次，当前 schema 已保留但页面暂未优先实现。
- `OperationLog`：操作日志，后续用于审计。

关键规则：

- `Fabric.code` 在租户内唯一，页面规则为 `SDD-` 固定前缀。
- `Fabric.fabricType` 区分针织与梭织。
- `Fabric.pricingUnit` 由面料类型派生：针织默认 `kg`，梭织默认 `meter`。
- V1 暂不管理面料颜色。
- 不再用 `Fabric.supplierId`、`Fabric.supplierQuote` 等单一字段表示唯一供应商；这些旧字段暂时保留用于安全迁移。
- 供应商价格管理采用 `FabricSupplier` 长期关系 + `FabricSupplierQuote` 报价历史。
- `FabricSupplier` 不保存价格、币种、计价单位、MOQ、交期、联系人和报价日期。
- `FabricSupplierQuote` 的 `purchasePrice` 和 `quoteDate` 必填；面料、供应商和供应商货号统一通过 `FabricSupplier` 读取。
- 同一租户、同一供应商下的生产单元名称唯一；删除供应商时，其生产单元级联删除。
- `FabricSupplier.supplierUnitId` 表示当前常用生产单元，`FabricSupplierQuote.supplierUnitId` 独立保存报价当时的生产单元；两者均可为空以兼容旧流程。
- 用途、适用季节、认证标准不是自由文本，保存为配置项 key 数组：
  - `usageOptionKeys`
  - `seasonOptionKeys`
  - `certificationOptionKeys`
- 对应配置分组：
  - `fabric_usage`
  - `fabric_season`
  - `fabric_certification`

## 已完成的功能

- 创建了新的 Next.js 项目脚手架。
- 确定了整体 UI 方向：Spatial Glass Fabric OS，偏 Apple 风格的空间玻璃后台系统。
- 完成面料库主页面静态原型：
  - 面料卡片视图
  - 专业表格入口
  - 入库批次入口
  - 搜索、类型筛选、来源筛选
  - 右侧详情抽屉
- 完成“新增面料”页面真实表单：
  - 基础信息
  - 分类结构
  - 来源与价格
  - 坯布信息
  - 染整信息
  - 后工艺信息
  - 质量与备注
  - 用途 / 季节 / 认证
- 新增面料抽屉已加入打开/关闭动效。
- 小模块标题已加入语义彩色图标。
- 完成面料库字段设计文档。
- 完成 Prisma schema 设计。
- 完成首个 migration 文件。
- 完成默认枚举配置 seed 脚本。
- 本地已安装 PostgreSQL 17，并将服务运行路径调整到 `D:\PostgreSQLServer`。
- 已创建开发数据库 `fabric_trade_dev`。
- 已执行 Prisma migration。
- 已执行默认枚举 seed。
- 已新增并修正面料多供应商货源和报价历史数据模型。
- 已接入枚举配置读取、当前租户供应商搜索和 `POST /api/fabrics`。
- 已实现多供应商增删、首选唯一、可选首次报价、字段级错误和保存成功反馈。
- 已实现坯布、染整、后工艺状态与明细清理/展开联动。
- 已实现服务器控制租户和计价单位，前端 payload 不包含 `tenantId` 或 `pricingUnit`。
- 已完成供应商基础管理静态 UI 原型：专业表格、搜索/筛选、详情抽屉、新增/编辑表单、多角色与启用/停用演示。该原型只更新浏览器内存，不调用供应商 API、不写入数据库。
- 已完成供应商下属“生产单元”静态 UI 原型：支持分厂、事业部、染色/印花/后整理等车间类型，提供详情内搜索筛选、能力卡片、空状态、二级详情、新增/编辑和启用/暂停合作演示。
- 已完成供应商与生产单元 Prisma 数据模型，并为面料货源及报价历史增加可选生产单元关联。

## 正在开发的功能

当前阶段已经完成新增面料的前后端闭环，正在准备面料库读取阶段：

- 从数据库读取面料列表
- 新增成功后刷新真实列表
- 面料详情读取
- 后续独立开发面料编辑
- 供应商基础管理页面正在等待产品设计确认，目前仅为静态 UI 原型。
- 供应商与生产单元数据模型已完成，真实供应商 API 与静态 UI 绑定仍待后续独立开发。

## 已知问题

- 面料库列表仍使用静态数据，尚未从数据库读取。
- 开发数据库当前没有供应商记录，供应商搜索在录入供应商前会显示空结果。
- 供应商基础管理尚无读写 API 或真实 UI 持久化逻辑；当前页面中的新增、编辑、停用和关联数据仍为静态演示。
- 生产单元数据库模型已经建立，但静态 UI 尚未连接该模型，刷新页面仍会恢复示例数据。
- PostgreSQL 安装过程中曾误装到 C 盘，后来已将运行服务路径和注册表调整到 `D:\PostgreSQLServer`；C 盘保留过备份目录，后续可人工清理。
- 当前 UI 中部分旧静态数据存在编码显示异常，需要在后续真实数据接入时清理。
- 权限和登录尚未实现；当前使用集中管理的临时服务端单租户上下文。
- 入库批次、图片/色卡/样品模块暂时不作为当前优先级。
- 旧的 `Fabric` 单供应商字段尚未迁移到 `FabricSupplier` / `FabricSupplierQuote`，当前不删除旧字段。

## 下一步原计划

1. 实现面料列表读取 API。
2. 用真实数据库数据替换首页静态面料卡片。
3. 新增成功后刷新面料列表。
4. 实现面料详情读取 API。
5. 单独评审并实现面料编辑。
6. 继续暂缓寄样、客户报价、订单和库存。

## 运行提示

开发环境需要：

- Node.js
- PostgreSQL 15+
- npm

常用命令：

```bash
npm install
npm run prisma:generate
npm run prisma:migrate:dev
npm run prisma:seed
npm run dev
```

环境变量请参考 `.env.example`，不要提交真实 `.env`。
## Backend Status - 2026-09-13

- `POST /api/fabrics` exists and creates a fabric plus optional greige, dyeing/finishing, post-processes, supplier relations, initial supplier quote snapshots, and operation log in one transaction.
- `GET /api/suppliers` exists and searches active suppliers within the current server-side tenant only.
- Temporary single-tenant context is centralized in `src/server/tenant.ts`.
- Create-fabric validation is centralized in `src/server/fabrics/schema.ts`.
- Completeness calculation is centralized in `src/server/fabrics/completeness.ts`.
- The create-fabric drawer is bound to the API with config loading, supplier search, validation errors, and success feedback.
- Fabric list reading/editing is still not implemented.
- No new migration was needed in this backend foundation round.

## Next Plan - Updated 2026-09-13

1. Read the fabric list from the database instead of static data.
2. Refresh the real list after successful creation.
3. Add a fabric detail read API.
4. Review editing requirements before implementing the edit flow.
5. Keep customer quotation, samples, orders, and inventory for later dedicated phases.
## Backend Hardening - 2026-09-13

- `sample_status` is now part of repeatable seed data.
- Automated tests require `TEST_DATABASE_URL` and refuse non-test database names.
- Supplier search limit handling is fixed: default 20, invalid 20, min 1, max 50.
- Create-fabric validation now enforces process status/detail consistency.
- Create-fabric validation now rejects duplicate supplier IDs and multiple preferred suppliers.
- When suppliers are provided without an explicit preferred supplier, the first supplier is saved as preferred.
- `GET /api/config-options?groups=...` returns enabled system and current-tenant config options for whitelisted groups only.
- API error handling maps invalid JSON to 400 and unique conflicts to 409 without leaking database internals.

## Create Fabric UI Connection - 2026-09-14

- The approved Spatial Glass create drawer now uses one controlled form state and real APIs.
- Config-backed fields display Chinese labels and submit stable keys.
- Supplier and factory selectors use current-tenant fuzzy search.
- Multiple suppliers, one preferred supplier, and optional initial quote snapshots are supported.
- Empty quote prices are never converted to zero.
- Process status changes clear or omit hidden detail data according to backend rules.
- The client payload contains neither `tenantId` nor `pricingUnit`.
- Automated coverage is 36 passing tests; Prisma validation/generation/status, lint, build, and browser checks pass.

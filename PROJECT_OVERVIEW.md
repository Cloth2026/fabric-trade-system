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

- `src/app/page.tsx`：当前主页面和新增面料抽屉静态原型。
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
- `Supplier`：供应商。可作为来源供应商、坯布供应商、染整厂、后工艺厂等。
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
- 完成“新增面料”页面静态原型：
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

## 正在开发的功能

当前阶段正在从静态 UI 原型进入真实后端闭环：

- 新增面料 API
- 新增面料表单状态绑定
- Zod 字段校验
- 枚举配置读取
- 供应商可搜索下拉
- 面料供应商关系与供应商报价历史管理
- 保存成功后刷新面料列表

## 已知问题

- 当前新增面料页面仍是静态原型，尚未提交到真实 API。
- 面料库列表仍使用静态数据，尚未从数据库读取。
- `README.md` 仍是 Next.js 默认模板，需要后续改成项目专用说明。
- PostgreSQL 安装过程中曾误装到 C 盘，后来已将运行服务路径和注册表调整到 `D:\PostgreSQLServer`；C 盘保留过备份目录，后续可人工清理。
- 当前 UI 中部分旧静态数据存在编码显示异常，需要在后续真实数据接入时清理。
- 权限、登录、租户上下文、操作日志写入尚未真正接入业务流程。
- 入库批次、图片/色卡/样品模块暂时不作为当前优先级。
- 旧的 `Fabric` 单供应商字段尚未迁移到 `FabricSupplier` / `FabricSupplierQuote`，当前不删除旧字段。

## 下一步原计划

1. 实现枚举配置读取 API。
2. 实现面料供应商关系和供应商报价历史的 Zod schema。
3. 实现新增面料 Zod schema。
4. 实现 `POST /api/fabrics`，但 V1 先聚焦面料库和供应商价格管理。
5. 将新增面料页面从静态输入改为真实表单状态。
6. 保存时校验面料编号唯一性、必填项、枚举 key 是否有效。
7. 保存成功后从数据库读取面料列表并刷新页面。
8. 增加基础错误提示、保存成功反馈和操作日志。

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
- The UI drawer is still not bound to the API.
- Fabric list reading/editing is still not implemented.
- No new migration was needed in this backend foundation round.

## Next Plan - Updated 2026-09-13

1. Implement config-options read API.
2. Bind the create-fabric drawer to `POST /api/fabrics`.
3. Add UI field-level validation display and save success feedback.
4. Read fabric list from the database instead of static data.
5. Add fabric detail read API and edit API.
6. Keep customer quotation, samples, orders, and inventory for later dedicated phases.

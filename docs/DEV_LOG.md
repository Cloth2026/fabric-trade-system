# Development Log

本文档用于记录项目进展、关键决策、验证结果和下一步计划。它是长期开发时的“续航入口”，目的是减少每次继续开发时翻聊天记录的成本。

## 使用约定

每次继续开发前，优先读取：

1. `docs/PROJECT_CONTEXT.md`
2. `docs/FABRIC_LIBRARY_FIELDS.md`
3. `docs/DEV_LOG.md`

每次完成一个阶段后，在本文档追加一条记录，内容包括：

- 日期
- 本轮目标
- 已完成内容
- 修改文件
- 验证结果
- 下一步建议
- 未决问题

## 当前项目状态

日期：2026-09-13

项目定位：

- 从零重建面料贸易业务后台管理系统。
- 旧 localhost 原型只作为业务参考，不继承其技术结构。
- 先做 Web 后台管理系统，先支持局域网多人使用，架构保留云端 SaaS 和私有化部署能力。
- 第一个核心模块是面料库。

技术栈：

- Next.js
- TypeScript
- PostgreSQL
- Prisma 7
- Tailwind CSS
- shadcn/ui 方向
- TanStack Table
- lucide-react
- Framer Motion 用于克制的动效

UI 方向：

- 已定稿为 Spatial Glass Fabric OS 风格。
- 视觉关键词：空间感、玻璃层级、柔和背景、低对比专业感、轻动效。
- 后续新增组件必须融入当前整体 UI，不使用传统 ERP 的生硬控件。
- 枚举下拉不使用原生浏览器 select，统一用玻璃风格自定义下拉。

## 已完成

### 2026-09-12

本轮目标：

- 创建全新项目脚手架。
- 先把面料库的 UI 风格和新增面料页面原型跑起来。

已完成内容：

- 创建 `fabric-trade-system` 项目。
- 完成 Next.js / TypeScript / Prisma / Tailwind 基础工程。
- 配置 development / test / production 环境样例文件。
- 生成并接入 UI 背景图 `public/images/fabric-showroom-bg.png`。
- 完成面料库首页静态 UI：
  - 左侧导航
  - 面料库主页面
  - 卡片视图
  - 表格视图
  - 入库批次视图
  - 玻璃风格筛选下拉
  - 详情抽屉
  - 新增面料抽屉
- 完成新增面料页面静态原型。

关键 UI 决策：

- 页面铺满整个视口。
- 右侧详情关闭后主页面仍然铺满，不保留空白右栏。
- 下拉框、输入框、按钮、抽屉、卡片都使用玻璃层级风格。
- 页面标题和业务模块标题应搭配符合语义的小图标，增强信息识别和视觉丰富度。
- 后续业务功能增加时，必须保持风格一致。

验证结果：

- `npm.cmd run lint` 通过。
- `npm.cmd run build` 通过。
- 浏览器验证通过：新增面料抽屉可打开，针织 / 梭织可切换，玻璃风格控件可正常交互。

### 2026-09-13

本轮目标：

- 把面料库字段结构和数据库模型沉淀下来，降低后续开发时的上下文损耗。

已完成内容：

- 新增 `docs/FABRIC_LIBRARY_FIELDS.md`。
- 记录面料库 MVP 字段、必填规则、枚举字段、条件显示、完整度规则。
- 重写 `prisma/schema.prisma`，同步到当前业务口径。
- 生成 Prisma Client 到 `src/generated/prisma`。
- 从新增面料表单中移除残留的“缩率”输入。

面料库字段口径：

- 面料档案不能只按“面料名称 + 成分 + 价格”建档。
- 必须围绕结构、生产过程、工艺链、计价单位和可补全信息设计。
- 面料编号规则：固定前缀 `SDD-`，前缀不可修改，横杠后手动填写，总长度不超过 64 字符，全表唯一。
- 针织默认按公斤计价。
- 梭织默认按米计价。
- 基础必填项包括：面料编号、面料名称、面料类型、开发来源、成分、克重、门幅。
- 成分、克重、门幅、纱支移入基础信息。
- 梭织额外显示经纬密。
- 移除“是否含氨纶”，由成分字段表达。
- 来源与价格中移除“是否独家”和“成本状态”。
- 是否可复购为枚举字段。
- 针织显示纸管重量和空差。
- 梭织显示空差。
- 坯布供应商、染整厂、后工艺厂都应为可搜索供应商下拉。
- 质量与备注中移除“缩率”。

Prisma 模型口径：

- 保留 SaaS / 私有化部署基础：`Tenant`、`tenantId`、`User`、`OperationLog`。
- 增加 `ConfigOption`，用于后续枚举字段配置管理。
- 增加 `Supplier`，并关联来源供应商、坯布供应商、染整厂、后工艺厂。
- `Fabric` 表包含面料主档字段、完整度字段和工艺状态字段。
- `GreigeFabric`、`DyeingFinishing`、`PostProcess` 独立建模。
- `FabricStockInBatch` 先保留模型，但入库批次功能暂不作为当前第一步实现重点。

修改文件：

- `docs/FABRIC_LIBRARY_FIELDS.md`
- `docs/DEV_LOG.md`
- `prisma/schema.prisma`
- `src/app/page.tsx`
- `src/generated/prisma`

验证结果：

- `npx.cmd prisma validate` 通过。
- `npm.cmd run prisma:generate` 通过。
- `npm.cmd run lint` 通过。
- `npm.cmd run build` 通过。

### 2026-09-13 本地启动问题修复

问题：

- 使用 `http://127.0.0.1:3002/` 打开页面后，右上角“新增面料”按钮点击没有反应。

原因：

- Next.js dev server 阻止了来自 `127.0.0.1` 的开发资源请求，导致页面可以显示但 React 没有完整 hydration。
- 日志中出现 `Blocked cross-origin request to Next.js dev resource`。
- 另外，Codex 工作区存在 `C:\Users\Administrator\Documents\...` 和 `D:\Codex\projects\...` 两套路径映射。启动 Next dev server 时应优先使用真实路径 `D:\Codex\projects\2026-07-27\http-localhost-3001\fabric-trade-system`，否则 `.next/dev` 路径可能被拼坏。

修复：

- 在 `next.config.ts` 增加 `allowedDevOrigins`：
  - `127.0.0.1`
  - `localhost`
  - `192.168.1.11`
- 给右上角“新增面料”按钮补充 `type="button"`。
- 从真实 D 盘路径启动 dev server。

验证：

- `http://127.0.0.1:3002/` 返回 200。
- 浏览器实际点击“新增面料”后，新增面料抽屉正常打开。
- `npm.cmd run lint` 通过。
- `npm.cmd run build` 通过。

### 2026-09-13 新增面料用途模块调整

本轮目标：

- 根据用户确认的页面需求，调整新增面料表单字段结构。

已完成内容：

- 从“分类结构”模块移除“用途 / 标签”字段。
- 新增“用途 / 季节 / 认证”模块。
- 新模块放在新增面料表单末尾，位于“质量与备注”之后。
- 新模块采用玻璃风格多选标签交互。
- 字段包括：
  - 用途：T恤、内衣、家居服、运动服、鞋材、箱包、领口、袖口、下摆、工装、裤装、外套、衬衫、校服、制服、户外服、冲锋衣、裙装、里布、睡衣、毯子、帽子、装饰布、牛仔裤、童装。
  - 适用季节：春夏、秋冬。
  - 认证标准：OEKO-TEX、GOTS、BLUESIGN。

修改文件：

- `src/app/page.tsx`
- `docs/FABRIC_LIBRARY_FIELDS.md`
- `docs/DEV_LOG.md`

验证：

- `npm.cmd run lint` 通过。
- `npm.cmd run build` 通过。
- 浏览器验证通过：点击“新增面料”后，旧字段消失，新模块显示在表单最后。

### 2026-09-13 新增面料标题图标调整

本轮目标：

- 增强新增面料页面的视觉识别，让页面标题和各表单模块标题都具备语义图标。

已完成内容：

- 新增面料抽屉左上角标题区域增加页面图标。
- 以下模块标题前增加语义小图标：
  - 基础信息
  - 分类结构
  - 来源与价格
  - 坯布信息
  - 染整信息
  - 后工艺信息
  - 质量与备注
  - 用途 / 季节 / 认证
- 抽出 `PanelTitle` 组件，统一模块标题图标、标题、描述的排版。
- 明确后续其他模块页面也需要增加符合模块意义的小图标。

修改文件：

- `src/app/page.tsx`
- `docs/DEV_LOG.md`

### 2026-09-13 新增面料图标色彩层级调整

本轮目标：

- 让新增面料页面的小图标不再过于素，增强模块识别和视觉层次。

已完成内容：

- 为模块标题图标增加柔和彩色玻璃底。
- 不同模块使用不同语义色：
  - 基础信息：蓝色
  - 分类结构：靛蓝
  - 来源与价格：绿色
  - 坯布信息：浅绿色
  - 染整信息：青色
  - 后工艺信息：紫色
  - 质量与备注：琥珀色
  - 用途 / 季节 / 认证：玫瑰色
- `PanelTitle` 支持 `tone` 参数，后续模块页面可以复用同一套图标色彩规则。

验证：

- `npm.cmd run lint` 通过。
- `npm.cmd run build` 通过。
- 浏览器验证通过：新增面料抽屉内每个模块图标均渲染为彩色玻璃底。

### 2026-09-13 新增面料打开关闭动效

本轮目标：

- 让新增面料页面打开和关闭时更有空间感，而不是直接出现 / 消失。

已完成内容：

- 为新增面料浮层增加背景淡入 / 淡出动画。
- 为新增面料抽屉增加轻微右侧位移、缩放和透明度变化。
- 关闭时先播放约 220ms 退场动画，再卸载抽屉。
- 点击关闭、取消、保存静态草稿都会使用同一套退场动效。
- 点击背景遮罩也可以关闭新增面料抽屉。
- 为 `prefers-reduced-motion: reduce` 增加降级，减少动效对敏感用户的影响。

修改文件：

- `src/app/page.tsx`
- `src/app/globals.css`
- `docs/DEV_LOG.md`

验证：

- `npm.cmd run lint` 通过。
- `npm.cmd run build` 通过。
- 浏览器验证通过：打开时有入场动画类，关闭后抽屉正常卸载。

## 下一步建议

优先做：

1. 新增面料 API。
2. Zod 字段校验。
3. Prisma 写入逻辑。
4. 固定一个临时租户 / 临时用户上下文，后续再接权限登录。
5. 将当前新增面料静态表单改为真实提交。
6. 保存成功后刷新面料列表。

暂不优先做：

- 入库批次完整功能。
- 图片、色卡、样品管理。
- 枚举配置管理页面。
- 权限细分。
- Excel 导入导出。
- 云端 SaaS 部署。

### 2026-09-13 新增面料用途字段同步 Prisma

本轮目标：

- 将已经定稿的“用途 / 季节 / 认证”模块同步到数据库结构设计和 Prisma Client。

已完成内容：

- 在 `Fabric` 模型中新增 `usageOptionKeys String[]`，用于保存用途枚举配置项 key。
- 在 `Fabric` 模型中新增 `seasonOptionKeys String[]`，用于保存适用季节枚举配置项 key。
- 在 `Fabric` 模型中新增 `certificationOptionKeys String[]`，用于保存认证标准枚举配置项 key。
- 用途 / 适用季节 / 认证标准属于可维护枚举字段，选项来源统一走 `ConfigOption`，新增面料页面只引用配置项。
- 保留原有 `tags String[]` 作为通用标签字段，不再承载用途 / 季节 / 认证这三类结构化枚举。
- 重新生成 Prisma Client，生成结果已包含新增字段的查询、创建、更新类型。
- 在 `docs/FABRIC_LIBRARY_FIELDS.md` 补充字段到 Prisma 模型的映射说明。

修改文件：

- `prisma/schema.prisma`
- `src/generated/prisma/`
- `docs/FABRIC_LIBRARY_FIELDS.md`
- `docs/DEV_LOG.md`

验证：

- `npx.cmd prisma validate` 通过。
- `npm.cmd run prisma:generate` 通过。
- `npm.cmd run lint` 通过。
- `npm.cmd run build` 通过。

说明：

- 当前完成的是 schema 设计和 Prisma Client 同步，尚未执行数据库 migration。
- 后续实现真实保存时，需要新增 API、Zod 校验、表单状态绑定和保存成功后的列表刷新。

追加调整：

- 用户确认“用途、适用季节、认证标准”也属于枚举类型字段，需要支持管理维护。
- 字段语义调整为保存配置项 key 数组：
  - `Fabric.usageOptionKeys`
  - `Fabric.seasonOptionKeys`
  - `Fabric.certificationOptionKeys`
- 对应配置分组约定：
  - `fabric_usage`
  - `fabric_season`
  - `fabric_certification`
- 新增面料页面后续不直接维护选项，只读取启用状态的枚举配置项。

### 2026-09-13 数据库 migration 与枚举 seed 准备

本轮目标：

- 按下一步计划执行数据库 migration 和默认枚举配置 seed。

已完成内容：

- 为 `ConfigOption` 增加 `ownerKey` 字段，用于稳定区分系统级配置和后续租户级配置。
- 将 `ConfigOption` 唯一约束调整为 `ownerKey + group + key`，避免 PostgreSQL 中 `tenantId = null` 导致系统级配置可重复的问题。
- 新增首个 migration 文件：`prisma/migrations/202609130001_init_fabric_library/migration.sql`。
- 新增 `prisma/seed.mjs`，用于写入默认枚举配置项。
- 新增 `package.json` 脚本：
  - `npm.cmd run prisma:seed`
  - `prisma db seed` 可复用同一个 seed 脚本。
- seed 覆盖默认枚举分组：
  - `development_source`
  - `fabric_status`
  - `knitted_category`
  - `woven_category`
  - `fabric_structure`
  - `elasticity_level`
  - `repurchase_status`
  - `process_info_status`
  - `dyeing_process_type`
  - `post_process_type`
  - `inspection_conclusion`
  - `fabric_usage`
  - `fabric_season`
  - `fabric_certification`

验证：

- `npx.cmd prisma format` 通过。
- `npx.cmd prisma validate` 通过。
- `npm.cmd run prisma:generate` 通过。
- `npm.cmd run lint` 通过。
- `npm.cmd run build` 通过。

当前阻塞：

- 本机没有可用 PostgreSQL：
  - `localhost:5432` 连接失败。
  - 未检测到 `psql`、Docker、Podman、PostgreSQL Windows 服务。
  - 因此 `npm.cmd run prisma:seed` 暂时无法执行成功，真实数据库 migration 也尚未应用。

数据库准备好之后执行：

1. 确认 `.env` 中 `DATABASE_URL` 指向开发库，例如 `fabric_trade_dev`。
2. 执行 `npm.cmd run prisma:migrate:dev`。
3. 执行 `npm.cmd run prisma:seed`。
4. 执行 `npm.cmd run prisma:migrate:status`。

### 2026-09-13 面料多供应商货源与报价历史模型

本轮目标：

- 只做“面料与多供应商货源”的数据模型设计和基础重构，不开发寄样、报价、订单、库存，也不大规模修改 UI。

已核实内容：

- 已阅读 `AGENTS.md`、`docs/PROJECT_CONTEXT.md`、`docs/FABRIC_LIBRARY_FIELDS.md`、`docs/DEV_LOG.md` 和 `PROJECT_OVERVIEW.md`。
- `npm.cmd run prisma:migrate:status` 显示开发库 `fabric_trade_dev` 与已有 migration 同步。
- 直接查询 `_prisma_migrations`，确认 `202609130001_init_fabric_library` 已应用。
- 当前 Git 工作区仍是项目初始开发态，文件均为未跟踪；本轮未重置或删除用户已有修改。

模型决策：

- V1 暂不管理面料颜色。
- 一个面料可以对应多个供应商。
- 不再使用 `Fabric.supplierId`、`Fabric.supplierQuote`、`Fabric.minimumOrderQty` 等字段表达唯一供应商；这些旧字段暂时保留，作为 legacy 字段等待后续安全迁移。
- 新增 `FabricSupplier`，表示面料与供应商的供货关系，并保存当前常用或最新供货条件。
- 新增 `FabricSupplierQuote`，表示供应商报价历史；每次报价新增一条记录，避免覆盖旧价格。

新增数据关系：

- `Tenant` -> `FabricSupplier[]`
- `Tenant` -> `FabricSupplierQuote[]`
- `Fabric` -> `FabricSupplier[]`
- `Fabric` -> `FabricSupplierQuote[]`
- `Supplier` -> `FabricSupplier[]`
- `Supplier` -> `FabricSupplierQuote[]`
- `FabricSupplier` -> `FabricSupplierQuote[]`

修改文件：

- `prisma/schema.prisma`
- `prisma/migrations/20260913084358_add_fabric_supplier_sources/migration.sql`
- `docs/FABRIC_LIBRARY_FIELDS.md`
- `docs/DEV_LOG.md`
- `PROJECT_OVERVIEW.md`

数据迁移风险：

- 本轮没有删除旧字段，因此不会丢失 `Fabric.supplierId`、`Fabric.supplierQuote` 等旧数据。
- 如果旧字段已有业务数据，后续切换读写前需要写显式迁移脚本：
  - 为每条旧 `Fabric.supplierId` 创建 `FabricSupplier`。
  - 将旧 `Fabric.supplierQuote` 等价格信息写入首条 `FabricSupplierQuote`。
  - 迁移确认后，再考虑移除旧字段。
- `FabricSupplier` 当前使用 `tenantId + fabricId + supplierId` 唯一约束；如果未来出现“同一供应商同一面料多个货号并存”的真实场景，需要调整唯一约束。

验证：

- `npx.cmd prisma validate` 通过。
- `npx.cmd prisma migrate dev --name add_fabric_supplier_sources` 通过，并创建 / 应用增量 migration。
- `npm.cmd run prisma:migrate:status` 通过，开发库当前有 2 个 migration 且 schema up to date。
- `npm.cmd run prisma:generate` 通过。
- `npm.cmd run lint` 通过。
- `npm.cmd run build` 通过。

下一步建议：

- 先实现面料供应商关系和报价历史的 Zod schema。
- 再实现面料库新增 / 编辑 API 中的供应商货源写入逻辑。
- UI 层先保持现有新增面料页面风格，只在后续小步加入“供应商货源”子表单或抽屉，不要一次性大改页面。

### 2026-09-13 修正供应商报价历史模型

本轮目标：

- 根据产品与技术审核意见，只修正“面料供应商关系 + 报价历史”的数据模型。
- 不开发 API，不修改 UI，不开发寄样、报价、订单、库存或其他业务模块。

数据安全检查：

- 本轮开始前执行 `npm.cmd run prisma:migrate:status`，开发库 `fabric_trade_dev` 与已有 2 个 migration 同步。
- 已查询 `FabricSupplier` 和 `FabricSupplierQuote` 数据量，两张表均为 0 行。
- 因此本轮删除上一版新表中的冗余字段不会造成当前开发库业务数据丢失。
- 仍然没有删除 `Fabric` 上的 legacy 字段。

模型修正：

- `FabricSupplier` 只保存长期供货关系字段：
  - `tenantId`
  - `fabricId`
  - `supplierId`
  - `supplierFabricCode`
  - `sampleStatus`
  - `qualityDifferences`
  - `isPreferred`
  - `remarks`
  - `createdAt`
  - `updatedAt`
- 从 `FabricSupplier` 移除：
  - `purchasePrice`
  - `currency`
  - `pricingUnit`
  - `minimumOrderQty`
  - `leadTime`
  - `contactName`
  - `quoteDate`
- `FabricSupplierQuote` 保存每一次报价快照：
  - `tenantId`
  - `fabricSupplierId`
  - `purchasePrice`，必填
  - `currency`
  - `pricingUnit`
  - `minimumOrderQty`
  - `leadTime`
  - `contactName`
  - `quoteDate`，必填，默认当前时间
  - `qualityDifferences`
  - `remarks`
  - `createdAt`
- 从 `FabricSupplierQuote` 移除冗余字段：
  - `fabricId`
  - `supplierId`
  - `supplierFabricCode`

修改文件：

- `prisma/schema.prisma`
- `prisma/migrations/20260913094627_refine_supplier_quote_history_model/migration.sql`
- `src/generated/prisma/`
- `docs/FABRIC_LIBRARY_FIELDS.md`
- `docs/DEV_LOG.md`
- `PROJECT_OVERVIEW.md`

数据迁移风险：

- 新增 migration 中 Prisma 会提示删除列风险，但当前两张表均为空。
- 如果其他环境已经写入 `FabricSupplier` 或 `FabricSupplierQuote` 数据，应用本 migration 前需要先备份，并按业务规则把旧关系表中的价格字段迁移到报价历史。
- 当前开发库不存在该风险。

验证：

- `npx.cmd prisma validate` 通过。
- `npx.cmd prisma migrate dev --name refine_supplier_quote_history_model` 通过，并创建 / 应用增量 migration。
- `npm.cmd run prisma:generate` 通过。
- `npm.cmd run prisma:migrate:status` 通过，开发库当前有 3 个 migration 且 schema up to date。
- `npm.cmd run lint` 通过。
- `npm.cmd run build` 通过。

下一步建议：

- 基于修正后的模型实现供应商报价历史 Zod schema。
- API 写入报价时必须通过 `fabricSupplierId` 找到面料和供应商，不再让前端提交冗余 `fabricId` / `supplierId`。
- UI 后续展示最新报价时，从 `FabricSupplier.quotes` 按 `quoteDate` 或 `createdAt` 排序取最新记录。

## 未决问题

- 梭织经纬密是否要在 MVP 中设为必填，当前暂定为选填但纳入待补标记。
- 克重、门幅、纸管重量、空差是先保存文本，还是拆成数值 + 单位；当前 MVP 暂定先保存文本。
- 供应商类型是否需要细分为织厂、染厂、后整理厂、市场档口、贸易商；当前模型先用 `Supplier.type` 文本保留扩展空间。
- 枚举配置是否先做系统级，还是直接支持租户级；当前模型支持 system / tenant 两种 scope。

## 继续开发提示

如果下次用户只说“继续”，建议按这个顺序恢复上下文：

1. 读 `docs/PROJECT_CONTEXT.md`。
2. 读 `docs/FABRIC_LIBRARY_FIELDS.md`。
3. 读 `docs/DEV_LOG.md`。
4. 检查 `git status --short`。
5. 如果继续面料库落地，优先实现新增面料 API 和 Zod 校验。
### 2026-09-13 Add fabric creation backend foundation

Goal:
- Implement the backend foundation for creating fabrics without binding the existing create-fabric UI drawer yet.
- Keep scope limited to fabric creation, supplier search, validation, temporary tenant context, completeness calculation, and tests.

Completed:
- Added a temporary server-side tenant context in `src/server/tenant.ts`.
- Added server-side Zod validation for create-fabric payloads in `src/server/fabrics/schema.ts`.
- Added config key validation through `ConfigOption` in `src/server/config-options.ts`.
- Added independent completeness calculation in `src/server/fabrics/completeness.ts`.
- Added transactional fabric creation service in `src/server/fabrics/create-fabric.ts`.
- Added supplier search service in `src/server/suppliers.ts`.
- Added `POST /api/fabrics`.
- Added `GET /api/suppliers`.
- Added automated tests in `tests/fabric-backend.test.ts`.
- Added `tsx` as a dev dependency to run TypeScript tests with Node's built-in test runner.

Important rules implemented:
- `tenantId` is always resolved server-side and is never trusted from the client payload.
- `pricingUnit` is derived server-side: `knitted -> kg`, `woven -> meter`.
- Fabric code must start with `SDD-` and must be unique within the current tenant.
- Required fields: `code`, `name`, `fabricType`, `developmentSource`, `composition`, `weight`, `width`.
- Config-backed keys must exist and be enabled before saving.
- Supplier IDs must belong to the current tenant.
- Fabric creation runs in one database transaction.
- `FabricSupplierQuote` is created only under a current-tenant `FabricSupplier` relation.
- Legacy `Fabric.supplierId`, `Fabric.supplierQuote`, and `Fabric.minimumOrderQty` are not written by the new API.

Validation:
- `npm.cmd test` passed, 10 tests.
- `npx.cmd prisma validate` passed.
- `npm.cmd run prisma:generate` passed.
- `npm.cmd run prisma:migrate:status` passed, database schema is up to date with 3 migrations.
- `npm.cmd run lint` passed.
- `npm.cmd run build` passed.

Notes:
- `git fetch origin` failed in this environment because GitHub credentials were unavailable. Local `HEAD` and local `origin/main` both pointed to `0eec6c5` before implementation.
- The rollback test intentionally triggers a duplicate `FabricSupplier` relation. Prisma prints the expected unique-constraint error, and the test confirms the fabric record is rolled back.

Next suggested step:
- Bind the existing create-fabric drawer to `POST /api/fabrics` in a small UI pass, including field-level errors and save success feedback.
- Add a config-options read API before building the future enum management screens.
### 2026-09-13 Harden fabric backend validation

Goal:
- Fix backend review findings after commit `0af2fade`.
- Keep scope limited to backend foundation, validation, config reads, test isolation, and documentation.

Completed:
- Added repeatable `sample_status` seed options: `not_requested`, `requested`, `received`, `tested`, `expired`.
- Fixed supplier search limit parsing so missing/invalid limit defaults to 20, with min 1 and max 50.
- Added test database safety setup. Automated tests now require `TEST_DATABASE_URL` and refuse database names that do not contain `test`.
- Added process status/detail consistency checks for greige, dyeing/finishing, and post-process data.
- Added supplier relation checks for duplicate supplier IDs and multiple preferred suppliers.
- Added auto-preferred behavior: if suppliers exist and none is explicitly preferred, the first supplier is saved as preferred.
- Added config options read service and `GET /api/config-options`.
- Added config group whitelist to prevent arbitrary database group queries.
- Hardened API error handling:
  - invalid JSON returns 400
  - Prisma unique constraint conflicts return 409
  - database internals are not returned to the client

Validation added:
- `sample_status` exists and can validate supplier sample status.
- Supplier search default, invalid, and over-limit behavior.
- Test database safety protection.
- Process status/detail conflict cases.
- Duplicate supplier ID rejection.
- Multiple preferred supplier rejection.
- Auto-preferred supplier persistence.
- Unique conflict API mapping.
- Invalid JSON API mapping.
- Config option whitelist and tenant isolation.

Notes:
- Tests now run against `fabric_trade_test` locally through `.env.test`, which is ignored and must not be committed.
- The test suite still emits a pg/Prisma adapter deprecation warning, but all assertions pass.

Next suggested step:
- Bind the create-fabric drawer to `POST /api/fabrics` after this backend foundation is reviewed.
- Add a lightweight UI-side config options loader for enum fields.

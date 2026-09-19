# Fabric Trade System 项目总览

## 产品定位

Fabric Trade System 是面向小型面料贸易公司和面料管理团队的 Web ERP。系统首先服务局域网多人协作，同时保留未来云端 SaaS 和公司内部私有化部署的架构空间。

当前核心不是传统库存 ERP，而是建立可持续补全的面料档案，并管理供应商、生产单元、采购货源和报价历史。主要用户包括面料开发、采购、业务、跟单和管理人员，他们的日常工作包括：

- 快速查找面料编号、规格、结构、工艺和来源资料。
- 记录一款面料对应的多家供应商、供应商货号及品质差异。
- 区分供应商公司与其分厂、车间、部门等生产单元。
- 保存采购报价快照，比较 MOQ、交期和历史价格。
- 持续补全坯布、染整、后工艺、质量、用途和认证信息。

## 当前技术栈

- Next.js 16.3.5 App Router
- React 19.2
- TypeScript 5
- Tailwind CSS 4
- PostgreSQL
- Prisma 7.10，使用 PostgreSQL driver adapter
- Zod 4
- lucide-react、Framer Motion
- Node.js 内置 test runner + tsx
- TanStack Table 已安装，当前页面仍以项目自有表格组件为主

UI 采用 Spatial Glass Fabric OS 方向：专业、克制、分层、带轻量动效，避免传统 ERP 的拥挤和沉闷。桌面端面料库默认使用专业表格，卡片作为辅助浏览方式。

## 项目目录

| 路径 | 职责 |
| --- | --- |
| `src/app/` | Next.js 页面、全局样式和 Route Handlers |
| `src/components/fabrics/` | 面料列表、详情、新增表单和面料展示辅助组件 |
| `src/components/suppliers/` | 供应商与生产单元真实管理 UI |
| `src/components/form/` | Spatial Glass 通用表单控件 |
| `src/lib/api/` | 前端 API Client、响应类型和请求竞态辅助逻辑 |
| `src/server/` | 租户上下文、Zod 校验、业务服务和错误映射 |
| `src/generated/prisma/` | Prisma 生成代码，不手工编辑 |
| `prisma/schema.prisma` | 当前数据库模型事实来源 |
| `prisma/migrations/` | 已执行的增量 migration，不删除或改写历史文件 |
| `prisma/seed.mjs` | 系统级枚举配置的可重复执行 seed |
| `tests/` | API、服务、数据模型和前端辅助逻辑测试 |
| `docs/` | 产品、数据、API、路线和开发交接文档 |

## 本地运行

前置条件：Node.js、npm、PostgreSQL 15 或更高版本。环境变量模板见 `.env.example`、`.env.development.example` 和 `.env.test.example`，不得提交真实 `.env`。

```bash
npm install
npm run prisma:generate
npm run prisma:migrate:dev
npm run prisma:seed
npm run dev
```

自动测试必须使用独立的 `TEST_DATABASE_URL`，数据库名称必须明显包含 `test`。测试环境准备和命令见 `README.md`。

## 数据库与租户隔离

- 业务核心表通过 `tenantId` 隔离；没有直接 `tenantId` 的工艺子表必须通过所属 `Fabric` 间接隔离。
- 当前尚未实现登录和完整权限系统，`src/server/tenant.ts` 使用集中管理的临时单租户上下文，并在租户不存在时安全 upsert。
- API 不接受客户端覆盖 `tenantId`。详情和更新查询同时限定资源 ID 与服务端租户；跨租户资源按不存在处理。
- 金额使用 Prisma `Decimal`。只读 API 将金额序列化为字符串，前端不得先转为浮点数再修改精度。
- 稳定英文 key 由数据库和 API 保存；中文标签由配置数据或前端映射负责。

核心数据关系和删除规则见 `docs/DATA_MODEL.md`。

## 已真实实现

### 面料库

- 新增面料真实保存：`POST /api/fabrics` 在事务中创建面料、可选工艺资料、多供应商货源、可选首次报价和操作日志。
- 服务器校验固定 `SDD-` 编号、必填字段、配置 key、工艺状态一致性、供应商租户归属、首选供应商唯一和金额规则。
- 针织自动使用 `kg`，梭织自动使用 `meter`，客户端不能决定计价单位。
- 面料真实列表支持搜索、类型/状态/来源/完整度筛选和分页。
- 面料真实详情包含基础资料、全部供应商货源、完整报价历史和结构化工艺资料。
- 列表与详情具有请求取消和竞态保护；快速切换不会被旧响应覆盖。
- 新增面料成功并完成关闭动效后会刷新当前列表。
- 详情抽屉支持遮罩和关闭按钮关闭，重复打开不会继承退出状态。

### 供应商

- 供应商基础管理真实 API 和 UI：列表、搜索、角色/状态筛选、详情、新增、编辑、启用和停用。
- 供应商生产单元真实 API 和 UI：列表、搜索、单元形式/业务类型/状态筛选、详情、新增、编辑、启用和暂停。
- 供应商和生产单元写操作事务性记录 `OperationLog`。
- 页面保存稳定英文 key，中文界面使用标签映射。
- 不提供生产单元 DELETE；业务生命周期使用启用、停用或暂停。

### 数据模型

- 一款面料可关联多家供应商。
- `FabricSupplier` 保存长期货源关系，`FabricSupplierQuote` 保存不可覆盖的报价历史。
- `FabricSupplier.supplierUnitId` 表示当前常用生产单元。
- `FabricSupplierQuote.supplierUnitId` 独立保存报价当时的生产单元；详情 API 返回报价自身的 `supplierUnitId` 和 `supplierUnit`。

## 尚未实现或仅为提示

- 面料编辑 API 和真实 UI 尚未实现。
- 面料详情底部“编辑面料”“添加货源”“新增报价”目前仅显示后续开放提示。
- 独立的面料货源新增、采购报价新增和首选货源维护 API 尚未实现。
- 寄样与客户反馈、客户管理、客户报价单、订单和真实库存尚未开发。
- `FabricStockInBatch` 仅有预留模型，入库批次 UI 暂缓。
- 登录、权限和复杂审批尚未实现。
- V1 暂不管理颜色、色卡和色号。

## 当前真实 API

面料：

- `GET /api/fabrics`
- `POST /api/fabrics`
- `GET /api/fabrics/[id]`

配置：

- `GET /api/config-options`

供应商与生产单元：

- `GET /api/suppliers`
- `POST /api/suppliers`
- `GET /api/suppliers/[id]`
- `PATCH /api/suppliers/[id]`
- `GET /api/suppliers/[id]/units`
- `POST /api/suppliers/[id]/units`
- `GET /api/supplier-units/[id]`
- `PATCH /api/supplier-units/[id]`

请求参数、响应摘要和错误约定见 `docs/API_CONTRACTS.md`。

## 测试与验证

```bash
npm test
npm run lint
npm run build
npm run prisma:generate
npm run prisma:migrate:status
```

涉及 schema 的任务还应执行 Prisma validate 和对应 migration 验证。纯文档任务不需要运行代码测试或构建。

## 已知限制

- 面料库顶部“可销售、待完善、本月新增”统计当前页数据，不是全库聚合；只有“面料总数”使用分页总数。
- 本地开发库可能存在浏览器回归记录 `SDD-UI-REG-20260919-1645`。它不是 seed 或 Git 内容，需由使用者确认后单独清理。
- 当前仍是临时单租户上下文。
- 部分文件保留 `prototype` 命名，但面料列表和详情已经读取真实 API。
- `Fabric` 上旧单供应商字段仍为安全迁移保留，新功能不得继续依赖。

## 分支与交接基准

- GitHub：`https://github.com/Cloth2026/fabric-trade-system.git`
- 默认分支：`main`
- 本轮文档整理前基准：`05ef48ca7596dba39a5069c4291216ef17a2fff3`
- 该基准已完成面料库真实读取和新增后刷新。文档整理提交会在此基准上新增一个独立 commit。

## 核心文档索引

建议按以下顺序阅读：

1. `PROJECT_OVERVIEW.md`：项目现状和边界。
2. `docs/PRODUCT_REQUIREMENTS.md`：已确认产品规则。
3. `docs/DATA_MODEL.md`：数据库关系、约束和迁移风险。
4. `docs/API_CONTRACTS.md`：当前真实 API 合同。
5. `docs/PRODUCT_ROADMAP.md`：下一阶段路线与暂缓范围。
6. `docs/FABRIC_LIBRARY_FIELDS.md`：面料字段详细定义。
7. `docs/DEV_LOG.md`：历史实施记录。
8. `docs/HANDOFF_WORKBUDDY.md`：WorkBuddy 快速接管入口。

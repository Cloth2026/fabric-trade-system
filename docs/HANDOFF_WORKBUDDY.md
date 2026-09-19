# WorkBuddy 接管指南

## 仓库信息

- GitHub：`https://github.com/Cloth2026/fabric-trade-system.git`
- 默认分支：`main`
- 文档整理前基准 SHA：`05ef48ca7596dba39a5069c4291216ef17a2fff3`
- 产品：小型面料贸易/面料管理 Web ERP
- 当前阶段：面料库和供应商基础已经形成真实读写基础，下一步进入面料货源与采购报价维护。

## 当前状态摘要

已真实完成：

- 新增面料事务保存。
- 面料真实列表、搜索、筛选、分页和详情。
- 多供应商货源与不可覆盖的报价历史模型。
- 报价当时生产单元的历史关联。
- 供应商和生产单元真实 API 与 UI。
- 请求竞态保护和新增成功后列表刷新。

尚未完成：

- 面料编辑。
- 独立添加货源、采购报价和调整首选货源。
- 寄样、客户、客户报价单、订单和库存。
- 登录、权限和复杂审批。

## 必读顺序

1. `PROJECT_OVERVIEW.md`
2. `docs/PRODUCT_REQUIREMENTS.md`
3. `docs/DATA_MODEL.md`
4. `docs/API_CONTRACTS.md`
5. `docs/PRODUCT_ROADMAP.md`
6. `docs/FABRIC_LIBRARY_FIELDS.md`
7. `AGENTS.md`
8. `docs/DEV_LOG.md`，仅在需要追溯历史决策时阅读

## 本地启动

前置条件：Node.js、npm、PostgreSQL 15 或更高版本。

```bash
git clone https://github.com/Cloth2026/fabric-trade-system.git
cd fabric-trade-system
npm install
npm run prisma:generate
npm run prisma:migrate:dev
npm run prisma:seed
npm run dev
```

使用 `.env.example` 或 `.env.development.example` 创建本地环境配置。不要读取、打印或提交真实密码和连接凭据。

## 测试与验证

测试必须使用单独的 `TEST_DATABASE_URL`，数据库名称必须包含 `test`。准备方式见 `README.md`。

```bash
npm test
npm run lint
npm run build
npm run prisma:migrate:status
```

涉及 Prisma schema 时额外执行 validate、generate 和 migration 验证；不要修改已经应用的 migration。

## 开发数据库注意事项

- 当前运行时通过 `src/server/tenant.ts` 提供临时单租户上下文。
- 本地数据库不是 Git 内容，不应假设它和 seed 完全一致。
- 本地开发库可能存在回归测试面料 `SDD-UI-REG-20260919-1645`，清理前先由使用者确认。
- `.env`、`.env.test` 和任何真实数据库凭据都不得提交。
- 不要为了“让环境干净”擅自删除、重建或重置数据库。

## 下一项推荐任务

“面料货源与采购报价维护”的静态 UI 原型：

- 添加供应商货源。
- 选择供应商生产单元。
- 新增采购报价并查看历史。
- 设置首选货源。
- 记录样品状态和质量差异。

产品原型确认后再设计写 API 和事务，不要直接把详情底部静态按钮接成临时写入逻辑。

## 首次接管只读检查

第一次进入仓库时先执行：

```bash
git status --short
git branch --show-current
git rev-parse HEAD
git fetch origin
git rev-parse origin/main
```

随后只读检查：

- 按必读顺序阅读核心文档。
- 查看 `prisma/schema.prisma` 和 migration 列表，不执行破坏性命令。
- 查看 `src/app/api/` 的真实路由清单。
- 核对 `package.json` scripts 和环境模板。
- 如果工作区已有修改，先判断是否属于用户工作，禁止覆盖或回滚。

## 禁止立即进行

- 不要进行全局架构重写或大规模 UI 重构。
- 不要删除或改写历史 migration。
- 不要删除 legacy 字段；先完成显式数据迁移和读写切换。
- 不要同时开发寄样、报价单、订单和库存。
- 不要在未确认产品原型前开发下一模块后端。
- 不要提交 `.env`、数据库转储、密码、API Key、Token 或个人信息。

## 推荐 Git 工作流

1. 从最新 `origin/main` 开始，确认工作区干净。
2. 一次只做一个边界明确的任务。
3. 修改前列出预期文件和原因。
4. 保留用户已有修改，不顺带格式化无关文件。
5. 根据范围执行测试、lint、build 和必要的 Prisma 验证。
6. 检查 `git diff --check` 和修改文件范围。
7. 每项任务创建独立 commit，不 amend 已审核提交。
8. 推送 `origin/main` 后报告 Commit SHA、验证结果、migration 情况和工作区状态。

## 可直接发送给 WorkBuddy 的首次提示词

```text
请接管 GitHub 仓库 https://github.com/Cloth2026/fabric-trade-system.git 的 main 分支。

开始任何修改前，请按顺序阅读 PROJECT_OVERVIEW.md、docs/PRODUCT_REQUIREMENTS.md、docs/DATA_MODEL.md、docs/API_CONTRACTS.md、docs/PRODUCT_ROADMAP.md、docs/FABRIC_LIBRARY_FIELDS.md 和 AGENTS.md。然后只读检查 git status、当前 HEAD、origin/main、prisma/schema.prisma、migration 列表、API 路由清单和 package.json scripts。

当前下一项推荐产品任务是“面料货源与采购报价维护”的静态 UI 原型。不要立即开发 API 或修改数据库；先依据现有 Spatial Glass 风格制作添加货源、选择生产单元、新增报价、报价历史、首选货源、样品状态和质量差异的产品原型，等待用户确认后再进入后端阶段。

请保留用户未提交修改，不改写旧 migration，不使用 Fabric legacy 单供应商字段，不扩大到寄样、客户报价、订单或库存。完成后报告修改文件、验证结果、Commit SHA 和工作区状态。
```

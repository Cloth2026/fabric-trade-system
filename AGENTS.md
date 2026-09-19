<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Fabric Trade System 开发入口

## 任何 AI 开发工具开始工作前

按顺序阅读：

1. `PROJECT_OVERVIEW.md`
2. `docs/PRODUCT_REQUIREMENTS.md`
3. `docs/DATA_MODEL.md`
4. `docs/API_CONTRACTS.md`
5. `docs/PRODUCT_ROADMAP.md`
6. `docs/FABRIC_LIBRARY_FIELDS.md`

需要追溯历史决定时再阅读 `docs/DEV_LOG.md`。涉及 Next.js 代码时继续遵守本文件顶部自动维护的 Next.js 16 本地文档规则。

## 开发规则

- 一次只做一个边界明确的任务。
- 产品设计先确认，再实现数据库、API 和真实 UI。
- 不自行扩大产品范围，不顺带开发寄样、客户报价、订单或库存。
- 修改前检查 Git 状态、当前 HEAD 和 `origin/main`，保留用户未提交修改。
- 不删除、重命名或改写已经存在的 migration；schema 变更只能新增增量 migration。
- 不使用 legacy 字段开发新功能，尤其是 `Fabric.supplierId`、`Fabric.supplierQuote`、`Fabric.minimumOrderQty` 和 `Supplier.type`。
- 所有业务读写保持 `tenantId` 隔离，客户端不得决定租户。
- 金额使用 Prisma `Decimal`，只读 API 返回十进制字符串。
- API 保存稳定英文 key，中文标签由配置或前端映射负责。
- 不提交密码、真实 `.env`、API Key、Access Token、数据库凭据或个人信息。
- 每项任务创建独立 commit，不 amend 已审核提交。
- 完成后报告 Commit SHA、测试结果、migration 情况和 Git 工作区状态。

## 验证原则

- 根据改动范围执行最小但完整的验证，不把未执行的验证写成通过。
- UI 改动需要浏览器回归；数据库改动需要 Prisma validate、generate、migration status 和数据安全检查。
- 自动测试只能使用专用测试数据库，遵守 `README.md` 的 `TEST_DATABASE_URL` 安全要求。
- 提交前运行 `git diff --check`，确认没有无关文件和敏感信息。

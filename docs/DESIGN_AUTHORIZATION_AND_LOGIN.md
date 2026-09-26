# 用户认证、固定角色权限与审计日志 · 正式设计

> **状态：已确认产品方向，待数据模型实施；本文描述目标设计，不代表当前代码已实现。**
>
> 当前代码里没有登录、没有权限校验、没有真实用户数据（`User` 表实测 0 行），`src/server/tenant.ts` 仍是临时单租户上下文。本文是下一轮 Prisma 数据模型与 API 实施的依据，不是功能完成记录。

| 项 | 值 |
| --- | --- |
| 文档状态 | 产品设计已确认，**Better Auth 兼容性已实测**，待数据模型实施 |
| 设计基准提交 | `985da12`（`origin/main`） |
| 兼容性验证提交 | `8147019` → 本轮（基于已安装 `better-auth@1.7.6`） |
| 设计日期 | 2026-09-26 |
| 依赖的静态原型 | `src/components/system/`（用户管理、角色权限、操作日志、`/login`、账号菜单） |
| 下一轮动作 | Prisma 数据模型 + 增量 migration（**本文不写 Prisma 代码**） |
| 实测证据 | §12「Better Auth 实测合同」、`docs/BETTER_AUTH_COMPATIBILITY_REPORT.md` |

---

## 0. 决策基线（已确认，不重新论证）

以下 32 条（23 条产品决策 + 9 条本轮拍板增补）已确认，文档后续内容必须与之一致，不得改成其他方案。

| # | 决策 | 本文落点 |
| --- | --- | --- |
| 1 | 认证框架优先使用 Better Auth，不自行实现密码哈希和 Session | §2.1、§3.3 |
| 2 | 使用 PostgreSQL 数据库 Session，不以自包含 JWT 作为主要 Session | §2.5、§3.4、§5.11 |
| 3 | V1 使用邮箱 + 密码登录 | §3.2、§5.1 |
| 4 | 现有 `username` 作为内部账号编码和搜索字段，暂不作为登录凭证 | §3.2 |
| 5 | 不开放公开注册 | §2.4、§5 |
| 6 | 用户由 owner 或 admin 创建 | §4.4、§5.7 |
| 7 | 初始密码由服务器安全随机生成，只向管理员显示一次 | §5.7、§6 |
| 8 | 新用户首次登录必须修改初始密码 | §5.5、§5.14 |
| 9 | 管理员重置密码：新临时密码 + `mustChangePassword=true` + 撤销全部旧 Session | §5.7 |
| 10 | 用户停用后立即不能登录，并撤销全部 Session | §5.4 |
| 11 | 一个用户只属于一个 Tenant | §3.2 |
| 12 | `tenantId` 由已验证 Session 和用户关系确定，客户端不能提交或覆盖 | §2.6、§5.13、§7.10 |
| 13 | 一个用户可拥有多个角色，权限取并集 | §4.3 |
| 14 | V1 六个固定角色：owner / admin / sales / purchasing / merchandiser / viewer | §4.2 |
| 15 | V1 不允许新增、删除或自定义角色 | §3.7、§4.1 |
| 16 | 权限字典与角色矩阵由服务端代码常量维护，不用 `ConfigOption`，不提供数据库权限编辑器 | §3.9、§4.1 |
| 17 | 一个 Tenant 可以有多个 owner，但必须始终保留至少一个启用状态的 owner | §4.4 |
| 18 | 最后一个启用的 owner 不能被停用、移除 owner 角色或降级 | §4.4 |
| 19 | admin 不能新增、编辑、停用或分配 owner 身份 | §4.4 |
| 20 | 操作日志只允许查看，不允许编辑或删除 | §3.8、§4.1 |
| 21 | 不使用 `AUTH_ENABLED` 或本地免登录开关作为正式运行方案 | §2.1、§8 |
| 22 | 不做公开注册、SSO、OAuth、MFA、组织架构、审批流、行级"只能看自己数据"、自定义角色、日志清理任务 | §1.2 |
| 23 | 本轮不修改已冻结的静态 UI（admin 重置密码规则说明除外） | §11 |

**本轮（Better Auth 兼容性验证轮）拍板增补的 9 条**：

| # | 决策 | 本文落点 |
| --- | --- | --- |
| 24 | 保留 `sales_order.advance_status`（第 28 项权限） | §4.1 |
| 25 | admin **不得**重置 owner 密码；只有 owner 可以重置 owner 密码 | §4.4 R1、§4.2 |
| 26 | `Fabric.finishedReferencePrice*` 属销售参考价，**不受** `purchase_price.view` 保护 | §4.7 |
| 27 | 用户本人改密日志 `action = change_password`，管理员重置密码日志 `action = reset_password` | §5.6、§5.7 |
| 28 | 下一轮 migration **删除** `User.role` 字段，不作 legacy 保留 | §3.2、§8.1 |
| 29 | 权限字典为 **39 项**（不是 32 项） | §4.1 |
| 30 | database hook 请求头统一写作 **`ctx.headers`**（`GenericEndpointContext` 的第二参数），不写 `context.headers` | §2.4、§12 |
| 31 | 建号走服务端 `auth.api.signUpEmail` + `disabledPaths` 屏蔽 HTTP，**不启用 Admin 插件** | §2.2、§2.4、§12 |
| 32 | 管理员重置密码走 `requestPasswordReset` + `resetPassword`（`revokeSessionsOnPasswordReset: true`），不直接写 `Account.password` | §5.7、§12 |

**明确排除的历史方案**（已作废，不得复活）：

- 自建 Cookie Session、自写密码哈希（scrypt/bcrypt 自己实现）。
- 单角色 `User.role` 字符串作为唯一权限来源。
- 自定义角色 / 数据库 `Role` + `Permission` 表。
- `AUTH_ENABLED` 或任何"本地免登录"开关。
- 历史文档 `docs/DESIGN_USER_MODULE.md`（已删除，本轮不恢复）。

---

## 1. 背景、目标与范围

### 1.1 背景

面料库、供应商、寄样、客户、客户报价单、销售订单六个业务模块已经真实落库，但系统目前**没有任何身份边界**：所有 Route Handler 都通过 `getServerTenant()` 拿到同一个临时租户，任何人能访问本机 3000 端口就拥有全部读写能力。系统定位是"局域网多人协作 + 未来云端 SaaS"，一旦接入真实用户，必须先解决三件事：

1. **谁能进来**（认证与会话）。
2. **进来后能做什么**（固定角色 + 权限字典）。
3. **做过什么可被追查**（审计日志）。

静态 UI 原型（`src/components/system/`、`src/app/login/page.tsx`）已经在 `7acbc63` 和 `985da12` 两轮中冻结了产品形态：六角色、受限允许、owner 最低保留规则、统一失败文案、暂时锁定、脱敏失败日志、日志只可读。本轮把这些已确认形态落成可实施的工程方案。

### 1.2 范围

**本次做**

- Better Auth 与现有 `User` / `Tenant` / `OperationLog` 的兼容方案与字段级映射。
- 固定角色与权限字典（服务端常量），多角色并集规则。
- 数据库 Session 策略、Cookie 属性、撤销与过期规则。
- 登录、失败限速、暂时锁定、停用、首次改密、改密、管理员重置、退出、Session 过期九条流程。
- 首个 owner 安全初始化方案（只设计，不写脚本）。
- owner 最低保留规则的并发事务保护。
- 现有 26 个 Route Handler / 42 个 Handler 的改造清单。
- 实施阶段拆分与测试验收设计。

**本次不做（永久或本阶段暂缓）**

- 公开注册、SSO、OAuth、MFA、组织架构、审批流。
- 行级"只能看自己数据"（数据归属仍以租户为界，不做按创建人过滤）。
- 自定义角色、数据库权限编辑器、角色增删改 API。
- 日志清理任务、日志编辑与删除接口。
- 忘记密码自助找回（V1 由管理员重置）；邮箱验证（内部系统，管理员线下交付账号）。
- 修改已冻结的静态 UI（下一阶段真实接入时统一替换演示数据）。

---

## 2. 技术选型与关键结论

### 2.1 认证框架：Better Auth

**结论：采用 Better Auth，密码凭据与 Session 全部交给它管理。**

依据与约束：

| 维度 | 结论 |
| --- | --- |
> 以下结论均已用 **已安装的 `better-auth@1.7.6`** 实测复核（方法与原始输出见 §12）。

| 维度 | 结论 |
| --- | --- |
| 安装版本 | **`better-auth@1.7.6`**，在 `package.json` 中精确锁定（无 `^`）；`npm ls better-auth` → `better-auth@1.7.6` |
| Next.js 16 兼容 | 官方声明兼容；`middleware.ts` 已改名 `proxy.ts`。**本项目不挂载 `toNextJsHandler`**（见下条），因此不存在 BA 的 HTTP 暴露面 |
| App Router 集成 | **结论修正**：浏览器不接触 BA 端点。服务端只用 `auth.api.*`；Cookie 通过 `returnHeaders: true` 拿到的 `Headers` 透传到我们自己的 `Response`（实测可用，见 §12.7） |
| Prisma 7 adapter | `prismaAdapter(prisma, { provider: "postgresql", transaction: true })`，与 `src/lib/prisma.ts` 的 `new PrismaClient({ adapter: new PrismaPg(...) })` **实测可跑通**（沙箱库建号 / 登录 / 改密成功） |
| 密码存储 | 密码**不在 `user` 表**，存在 `account.password`（`providerId = "credential"`），默认 Node 原生 scrypt。`User` 上不新增 `passwordHash` |
| 数据库 Session | `session` 表保存 `token / expiresAt / ipAddress / userAgent`（实测 `ipAddress`、`userAgent` 由请求头自动写入）；Cookie 是不透明串，不是 JWT |
| 管理员创建用户 | **结论修正**：`disableSignUp: true` 会**连服务端 `auth.api.signUpEmail` 一起拒绝**（实测 400 `EMAIL_PASSWORD_SIGN_UP_DISABLED`）。因此改为 `disableSignUp: false` + `disabledPaths: ["/sign-up/email"]`（实测 HTTP 404、服务端仍可用） |
| 改密 / 撤销 Session | 本人：`auth.api.changePassword({ revokeOtherSessions: true })`（实测生效）。管理员重置：`requestPasswordReset` + `resetPassword` 配 `revokeSessionsOnPasswordReset: true`（实测会话清空） |
| 禁止公开注册 | 三条同时生效：① 不挂载 BA HTTP handler（首选）；② 若挂载则必须 `disabledPaths` 屏蔽 `/sign-up/email`；③ 服务端建号全部由我们的 `/api/users` 走权限校验后调用。**不使用 `disableSignUp: true`**（它会把服务端建号一起关掉） |

**不使用 `AUTH_ENABLED` 一类开关**：上线即启用认证，不存在"绕过登录"的运行模式。本地开发同样需要登录（首个 owner 由 §6 初始化）。

### 2.2 不使用 Better Auth Admin 插件（实测后确认）

`admin` 插件提供 `createUser / setRole / setUserPassword / revokeUserSessions / banUser / impersonateUser` 等能力（本轮已逐个确认方法名与端点路径，见 §12.4）。**经实测验证，本设计仍不启用它**。理由（含实测证据）：

1. **要求 `user.role` 列，与决策 28 冲突**：插件 schema 实测会向 `user` 增加 `role / banned / banReason / banExpires`、向 `session` 增加 `impersonatedBy`（`plugins/admin/schema.mjs`）。而决策 28 要求下一轮 migration **删除** `User.role`。采用插件就必须保留/新增该列，直接冲突。
2. **权限判定绑死在 `user.role` 上**：`createUser`、`setUserPassword`、`revokeUserSessions` 的 `hasPermission({ userId, role: session.user.role, ... })` 只看 BA 自己的 role 值。我们若把 BA role 当成"能否调用管理端点"的开关，等于又造了一套角色来源，与决策 16（权限字典与矩阵只在服务端常量里）相悖。
3. **`setUserPassword` / `revokeUserSessions` 必须带管理员会话**：实测无 `headers` 直调返回 `401 UNAUTHORIZED`（`use: [adminMiddleware]`）。想让它工作就得给 ERP 管理员发一个 BA 眼中的 admin 会话，进一步强化第 2 条问题。
4. **16 个 `/admin/*` HTTP 端点默认可被调用**：实测未配置 `disabledPaths` 时 `POST /api/auth/admin/create-user` 走 HTTP 可达（无会话返回 401，有 BA admin 会话即可执行）。虽然可以用 `disabledPaths` 全部屏蔽，但"引入一堆必须屏蔽的端点"不如一开始就不装。
5. **角色模型不匹配**（沿用原有判断）：多角色以逗号字符串存 `user.role`，无法表达并集与 owner 跨行约束；插件不会写 `tenantId`；插件内部事务无法并入 `OperationLog`。

**代价（明确接受）**：自己写用户管理 API（创建、编辑、停用、分配角色、重置密码）。这些 API 内部仍调用 Better Auth 完成建号 / 改密 / 撤销 Session，只是外层套上租户、权限、审计和 owner 规则。实测证明这条路径完全可行（§12.3、§12.5）。

### 2.3 数据模型映射结论（Better Auth → 现有库）

| Better Auth 逻辑模型 | 本项目落地 | 说明 |
| --- | --- | --- |
| `user` | **复用现有 `User` 模型**（`user.modelName = "User"`） | 保留 `id / email / name / tenantId / username / status`；新增 `emailVerified / image / mustChangePassword / lastLoginAt / failedLoginAttempts / lockedUntil / passwordChangedAt` |
| `account` | **新增 `Account`** | 密码存这里，不在 `User` 上 |
| `session` | **新增 `Session`** | 数据库会话；撤销 = 删除/失效行 |
| `verification` | **新增 `Verification`** | 仅为 Better Auth schema 完整性存在，V1 不开放邮件验证 / 自助找回端点 |
| `rateLimit`（可选插件态） | **新增 `RateLimit`** | 登录限速计数持久化到数据库，避免多实例/重启后计数丢失 |
| 角色 | **新增 `UserRoleAssignment`** | 不用 `user.role` 单列；**现有 `User.role` 在下一轮 migration 直接删除**（决策 28） |
| 权限字典 / 角色矩阵 | **不落库**，服务端 TS 常量 | 决策 16 |
| `OperationLog` | **扩展现有模型** | 见 §3.8 |

### 2.4 `User.tenantId` 必填与 Better Auth 建号的冲突（**已实测定稿**）

`User.tenantId` 是非空外键，而 Better Auth 的建号入参不接受它。1.7.6 上的实测把原设计里的两处假设都推翻了，方案相应调整：

| 原假设 | 实测结果 | 结论 |
| --- | --- | --- |
| `additionalFields.tenantId = { required: true, input: false }`，由 hook 注入 | `required: true` 的校验发生在 **`databaseHooks` 之前**，hook 一次都没被调用，直接 400 `MISSING_FIELD: tenantId is required` | **`tenantId` 在 BA 侧必须配成 `required: false, input: false`**，靠 hook 注入 |
| hook 从 `context.headers` 读调用者 | hook 第二参数类型是 `GenericEndpointContext \| null`，实测字段名是 **`ctx.headers`**（`Headers` 实例），且**只有调用时显式传了 `headers` 才存在**；纯服务端直调时 `ctx.headers` 为 `null`、`ctx.request` 为 falsy | 写作 `ctx.headers`；并且**不能只依赖它**（见下） |
| hook 不注入时靠 NOT NULL 兜底 | 兜底确实存在，但形态是 **Prisma 校验错误**：`Argument 'tenant' is missing`，BA 包装成 422 `FAILED_TO_CREATE_USER`，用户行未落库 | 兜底有效，但错误信息对调用方不友好，**主防线必须放在 hook 里** |

**最终方案（三层）**：

1. **注入层（主）**：`databaseHooks.user.create.before(user, ctx)` 里按优先级解析 `tenantId`
   1. 我们的服务端请求上下文（`AsyncLocalStorage`，由 `resolveAuthContext` / 建号服务写入）——**实测可跨 Better Auth 的 async 链路读到**；
   2. 回退：`ctx.headers` 存在时，用它调 `auth.api.getSession({ headers: ctx.headers })` 取调用者 `tenantId`（实测 `ctx.headers` 是完整 `Headers`，含 `cookie`、`x-forwarded-for`）；
   3. 两者都拿不到 → **直接抛错**（fail-closed）。
2. **fail-closed 语义**：hook 抛错后 BA 返回 422 `FAILED_TO_CREATE_USER`（实测），数据库无任何写入。因此**我们的 API 必须在调用 BA 之前先做权限与租户校验**，把这类错误变成可解释的 403/409，而不是把 422 透给用户。
3. **数据库兜底**：`User.tenantId` 保持 NOT NULL + 外键。即使 hook 被改坏到"既不抛错也不注入"，Prisma 也会拒绝写入（实测）。

**不使用退路方案**：`tenantId` 改可空 + 巡检脚本的方案**已排除**，因为实测证明 NOT NULL + 必填外键在 Prisma 层就能挡住，无需牺牲约束强度。

### 2.5 Session 策略结论

| 项 | 结论 | 理由 |
| --- | --- | --- |
| Session 形态 | **数据库 Session**（默认行为） | 决策 2。主 Cookie `session_token` 是不透明串，不是 JWT |
| `session.cookieCache` | **关闭** | 决策 9、10 要求"重置密码/停用后立即全部失效"。开启 cookie cache 时，被撤销会话在其他设备上仍可用到缓存过期，与需求冲突 |
| `expiresIn` | **12 小时（43200 秒）** | 覆盖一个工作日；与静态原型展示的"会话有效期 12 小时"一致 |
| `updateAge` | **1 小时（3600 秒）** | 活跃用户滚动续期；停止操作 12 小时后失效 |
| `freshAge` | **10 分钟（600 秒）** | 改密等敏感操作要求会话较新 |
| `disableSessionRefresh` | `false` | 允许滚动续期 |
| 撤销方式 | 停用/降权用 `prisma.session.deleteMany({ where: { userId } })`；改密与重置优先用 Better Auth 自带开关（`revokeOtherSessions` / `revokeSessionsOnPasswordReset`） | 数据库会话行即事实来源；实测两种方式都能立即生效 |
| Cookie 名（实测） | `advanced.cookiePrefix = "fabric"` → `fabric.session_token`；退出时会同时下发 `fabric.session_data`、`fabric.dont_remember` 的清除指令 | 实测 `set-cookie`：`fabric.session_token=…; Max-Age=43200; Path=/; HttpOnly; SameSite=Lax` |
| 内置限速 | **不启用**（实测只在 `auth.api.*` 之外的 HTTP 层生效；我们不挂 HTTP handler，所以 `rateLimit.storage = "database"` 无意义，且需要额外 `rateLimit` 表） | 登录限速与锁定由我们自己的 `failedLoginAttempts` + `lockedUntil` 实现（§5.2、§5.3） |

### 2.6 `User.email` 唯一性结论：**从"租户内唯一"改为"全局唯一"**

**结论：把 `User.email` 的唯一约束从 `@@unique([tenantId, email])` 改为全局 `@unique`，同时保留 `@@unique([tenantId, username])`。**

论证：

1. **Better Auth 的真实要求**：官方核心 schema 明确把 `user.email` 标注为 **UQ（全局唯一）**。登录流程按 `email` 单字段查用户（`where: [{ field: "email", value }]`）。
2. **技术风险**：若只保留复合唯一 `@@unique([tenantId, email])`，`email` 本身不是唯一字段，Prisma 的 `findUnique` 不可用，适配器只能退化到 `findFirst`。在单租户阶段碰巧正确，一旦库里出现跨租户同名邮箱，登录会命中错误用户或抛错——属于**认证路径上的正确性风险**，不能赌适配器实现。
3. **迁移影响（实测）**：开发库 `User` 表当前 **0 行**、租户只有 1 个（`code = default`），`OperationLog` 69 行且 `userId` 全为 null。因此改为全局唯一的**数据迁移成本为零**，只需一条 `DROP INDEX` + `CREATE UNIQUE INDEX`。
4. **未来多租户扩展影响（明确代价）**：同一自然人在两个租户任职时必须使用两个不同邮箱。这是已知取舍，V1 单租户运行不受影响。未来若必须支持"同邮箱多租户"，需要引入登录时选择租户或外部 IdP，届时再单独评审——**不得在 V1 预埋半成品方案**。

### 2.7 Next.js 16 集成约束（本地文档核对结论）

依据 `node_modules/next/dist/docs/`（版本 16.3.5）：

| 约束 | 结论 | 依据文件 |
| --- | --- | --- |
| 文件约定 | `middleware.ts` **已废弃并改名 `proxy.ts`**，导出 `proxy` 函数，默认 Node.js 运行时 | `01-app/03-api-reference/03-file-conventions/proxy.md`、`01-app/01-getting-started/16-proxy.md` |
| proxy 不是安全边界 | 官方原文：*"Proxy is not intended for slow data fetching... it should not be used as a full session management or authorization solution."* 以及 *"Always verify authentication and authorization inside each Server Function rather than relying on Proxy alone."* | 同上 |
| Route Handler 必须自查 | 官方原文：*"Treat Route Handlers with the same security considerations as public-facing API endpoints, and verify if the user is allowed to access the Route Handler."* | `01-app/02-guides/authentication.md` |
| 校验靠近数据源 | 官方原文：*"The majority of security checks should be performed as close as possible to your data source"*；推荐 Data Access Layer 模式，并警惕 IDOR | 同上、`01-app/02-guides/data-security.md` |
| 动态 API | `cookies()` / `headers()` 均为 async；使用它们会把路由转为动态渲染 | `01-app/03-api-reference/04-functions/cookies.md` |
| Cookie 属性 | 官方示例：`{ httpOnly: true, secure: true, expires, sameSite: 'lax', path: '/' }` | `01-app/02-guides/authentication.md` |
| 客户端 IP | `NextRequest.ip` 与 `.geo` **已在 v15.0.0 移除**；需从 `x-forwarded-for` / `x-real-ip` 等头自行解析 | `01-app/03-api-reference/03-file-conventions/`（版本变更说明） |

**由此产生的两条硬性设计要求：**

1. **`proxy.ts` 只允许做乐观重定向**（检查 Cookie 是否存在），不得作为授权依据；所有 Route Handler 与服务层必须重新校验身份、租户、权限。
2. **Route Handler 内不要调用 `next/headers` 的 `headers()` 取会话**，改用 `request.headers`（Web `Headers` 对象）传给 `auth.api.getSession({ headers })`。原因：
   - 现有测试（`tests/fabric-read-api.test.ts` 等）直接 `import` Route Handler 并用 `new Request(...)` 调用，没有 Next 请求上下文，`headers()` 会抛错；
   - 用 `request.headers` 可以让认证后的 Route Handler 继续被单测覆盖。

---

## 3. 目标数据模型

> 本节只给字段表与约束说明，**不写 Prisma 代码**。实施时按 §8.1 生成增量 migration。

### 3.1 总览

```text
Tenant
  ├─ User（Better Auth user 主体，已有，扩展）
  │    ├─ Account[]        （新增：密码凭据）
  │    ├─ Session[]        （新增：数据库会话）
  │    ├─ UserRoleAssignment[] （新增：多角色）
  │    └─ OperationLog[]
  ├─ Account[] / Session[] / Verification[] / RateLimit[] （Better Auth 基础设施表）
  └─ ... 现有业务表（Fabric / Supplier / Customer / Sample / Quote / Order）
```

### 3.2 `User`（扩展现有模型）

| 字段 | 类型 | 约束 / 默认 | 来源 | 说明 |
| --- | --- | --- | --- | --- |
| `id` | String | PK | 已有 | Better Auth 用户主键 |
| `tenantId` | String | 非空 FK → Tenant，索引 | 已有 | 决策 11；由 §2.4 的 hook 注入 |
| `email` | String | **全局唯一**（见 §2.6） | 已有（改约束） | 登录凭证（决策 3） |
| `username` | String | `@@unique([tenantId, username])` | 已有 | 内部账号编码与搜索字段，**不作登录凭证**（决策 4） |
| `name` | String | 非空 | 已有 | 显示名 |
| `emailVerified` | Boolean | `@default(false)` | **新增** | Better Auth 核心字段；V1 不开启邮件验证流程 |
| `image` | String? | 可空 | **新增** | Better Auth 核心字段；V1 UI 不使用 |
| `status` | `UserStatus` enum | `@default(active)` | 已有 | `active` / `inactive`；停用即禁止登录 |
| `mustChangePassword` | Boolean | `@default(false)` | **新增** | 决策 8、9；为 true 时业务 API 全拒绝（§5.14） |
| `lastLoginAt` | DateTime? | 可空 | **新增** | 登录成功时写入 |
| `failedLoginAttempts` | Int | `@default(0)` | **新增** | 连续失败计数，成功登录时清零 |
| `lockedUntil` | DateTime? | 可空 | **新增** | 暂时锁定到期时间（§5.3） |
| `passwordChangedAt` | DateTime? | 可空 | **新增** | 改密/重置时写入，用于审计与未来密码有效期 |
| ~~`role`~~ | String `@default("admin")` | **下一轮 migration 删除** | 已有 | 决策 28。不转 legacy、不保留列：真实角色以 `UserRoleAssignment` 为准；BA 的 admin 插件不启用，不需要该列 |
| `createdAt` / `updatedAt` | DateTime | 已有 | 已有 | — |

`User.email` 统一小写存储（建号与登录入口都做 `trim().toLowerCase()`）。实测依据：BA 建号会把 email **自动小写**（`MiXeD@…` 存成 `mixed@…`），登录大小写不敏感，但**带空格会被 zod 判为 `INVALID_EMAIL`**（400）。因此在我们这一侧统一 `trim + lowercase`，既保证行为一致，也避免空格导致的 400 与账号枚举差异。

### 3.3 `Account`（新增）

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| `id` | String | PK | 本地账户记录 ID |
| `userId` | String | FK → User，级联删除，索引 | — |
| `accountId` | String | — | 凭据账户下等于用户稳定 ID |
| `providerId` | String | — | V1 只有 `credential` |
| `accessToken` / `refreshToken` / `idToken` / `scope` | String? | 可空 | V1 不使用，仅为官方 schema 完整性 |
| `accessTokenExpiresAt` / `refreshTokenExpiresAt` | DateTime? | 可空 | 同上 |
| **`password`** | String? | 可空 | **密码哈希唯一存放位置**；默认 scrypt，由 Better Auth 计算与校验 |
| `createdAt` / `updatedAt` | DateTime | — | — |

约束：`@@index([userId])`（官方 1.7.6 生成器**只给这一个**索引，未给 `@@unique([providerId, accountId])`；本设计按官方生成器落地，不额外加唯一约束，以免与 BA 的 upsert 语义冲突）。

**`User` 上不新增 `passwordHash`**，也**不在任何代码里直接写 `Account.password`**（决策 1；密码一律经 `auth.api.*` 由 BA 计算哈希）。

### 3.4 `Session`（新增）

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| `id` | String | PK | — |
| `userId` | String | FK → User，级联删除，索引 | 撤销全部会话 = `deleteMany({ where: { userId } })` |
| `token` | String | **唯一** | Cookie 中的不透明会话标识 |
| `expiresAt` | DateTime | 索引 | 过期判定 |
| `ipAddress` | String? | 可空 | Better Auth 自动写入 |
| `userAgent` | String? | 可空 | 同上 |
| `createdAt` / `updatedAt` | DateTime | — | 滚动续期时更新 `expiresAt` |

不使用 `activeOrganizationId` / `impersonatedBy`（未启用 organization、impersonation 能力）。

### 3.5 `Verification`（新增）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | String PK | — |
| `identifier` | String | 验证标识 |
| `value` | String | 验证值 |
| `expiresAt` | DateTime | 过期时间 |
| `createdAt` / `updatedAt` | DateTime | — |

**V1 只建表不开放端点**（无邮件验证、无自助找回）。管理员重置密码若复用 Better Auth 重置链路（§5.7），会短暂使用该表。

### 3.6 `RateLimit`（**本轮结论：暂不建表**）

官方 1.7.6 的真实定义（来源 `@better-auth/core/dist/db/get-tables.mjs`，仅当 `rateLimit.storage === "database"` 时才进 schema；模型名默认 `rateLimit`）：

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| `id` | String | PK | 生成器给出的字段 |
| `key` | String | **unique**, required | 限流键（可通过 `rateLimit.fields.key` 改名） |
| `count` | Int | required | 窗口内请求数 |
| `lastRequest` | BigInt | required，默认 `Date.now()` | 上次请求时间（epoch ms），**`bigint: true`，Prisma 里是 `BigInt`** |

**为什么不建**：内置限速只在 **HTTP 请求入口**（`api/index.mjs` 的 router `onRequest` → `onRequestRateLimit`）生效，实测直接调用 `auth.api.signInEmail` **完全不走限速**（开启 `storage: "database"` 后连 `rateLimit` 表都没有写入）。而本设计不挂载 BA 的 HTTP handler（§2.1），内置限速没有触发路径。

**替代方案（采用）**：登录限速与"暂时锁定"由我们自己在 `/api/auth/login` 里实现（§5.2、§5.3），计数落在 `User.failedLoginAttempts` / `User.lockedUntil`，不额外建表。

**如果将来挂载 BA HTTP 端点**：必须同时启用 `rateLimit.storage = "database"` 并按上表建 `RateLimit` 表，否则多实例部署时限流计数只存在于单进程内存。

### 3.7 `UserRoleAssignment`（新增，多角色）

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| `id` | String | PK | — |
| `tenantId` | String | 非空 FK → Tenant，索引 | 冗余租户，便于按租户统计与隔离查询；必须与 `User.tenantId` 一致 |
| `userId` | String | 非空 FK → User，级联删除，索引 | — |
| `roleKey` | `RoleKey` enum | 见下 | 固定六值之一 |
| `createdAt` | DateTime | `@default(now())` | — |
| `createdByUserId` | String? | 可空 | 分配人，审计用；若建关系必须同样用组合外键防止跨租户引用（见下） |

约束：

- `@@unique([userId, roleKey])` —— 防重复分配。
- `@@index([tenantId, roleKey])` —— 支撑"本租户还有几个启用 owner"的校验。
- **组合外键（决策：已实测通过）**：`User` 增加 `@@unique([tenantId, id])`，`UserRoleAssignment` 的关系写 `user User @relation(fields: [tenantId, userId], references: [tenantId, id], onDelete: Cascade)`。这样 `tenantId` 与 `userId` 必须同时匹配同一用户行，**数据库层面无法给 A 租户的用户挂 B 租户的角色**。实测：跨租户插入报 `Foreign key constraint violated: UserRoleAssignment_tenantId_userId_fkey`；同租户插入正常。
- `createdByUserId` 若建立关系，同样用 `[tenantId, createdByUserId] → User[tenantId, id]` 的组合外键，不单独建单列关系。

`roleKey` 枚举值：`owner` / `admin` / `sales` / `purchasing` / `merchandiser` / `viewer`。

> **为什么用 enum 而不是 String**：决策 15 规定 V1 不允许新增角色，enum 让数据库层直接拒绝脏值。代价是未来加角色需要 migration——在 V1 约束下可接受。若实施时倾向更低摩擦，可退为 `String` + Zod 白名单校验，但必须在同一处常量里维护六值。

### 3.8 `OperationLog`（扩展现有模型）

现有字段：`id / tenantId / userId? / module / action / targetType? / targetId? / detail Json? / ipAddress? / createdAt`。

| 字段 | 类型 | 状态 | 说明 |
| --- | --- | --- | --- |
| `category` | String `@default("business")` | **新增**，索引 | `login_security` / `user_permission` / `business`，与静态原型三类一致 |
| `result` | String `@default("success")` | **新增** | `success` / `failure` |
| `requestId` | String? | **新增**，索引 | 串联同一次请求的多条日志 |
| `userAgent` | String? | **新增** | 设备信息（原型"设备"列） |
| `actorNameSnapshot` | String? | **新增** | 操作当时的姓名快照，用户改名后日志不漂移 |
| `actorEmailSnapshot` | String? | **新增** | 操作当时的邮箱快照 |
| `userId` | String? | **已可空，保持不变** | 登录失败且账号无法识别时为 `null`（§5.2） |
| `targetType` / `targetId` | String? | 已有 | 沿用 |
| `ipAddress` | String? | 已有 | 沿用 |
| `detail` | Json? | 已有 | **禁止**写入密码、密码哈希、Session Token、完整 Cookie、完整请求体（§9） |

新增索引（**优先复合索引，租户在前**）：

- `@@index([tenantId, requestId])` —— 同一次请求的多条日志串联（替代原方案的单列 `requestId` 索引）。
- `@@index([tenantId, userId])` —— 某用户在本租户内的操作流水（替代原方案的单列 `userId` 索引）。
- `@@index([tenantId, category])`、`@@index([tenantId, result])`、`@@index([tenantId, module, action])`、`@@index([tenantId, createdAt])` —— 列表筛选与分页。

不再建全局单列 `@@index([userId])` / `@@index([requestId])`：日志只会按租户维度查询，复合索引已覆盖，单列索引只是额外写放大。

**无角色用户**：`permissions` 为空集合时，除 §5.14 白名单与"仅要求已认证"的接口外，全部业务接口返回 403。Session 有效 ≠ 有权限（决策补充，见 §4.3）。

**日志只增不改不删（决策 20）**：

- 应用层不提供任何 `DELETE` / `PATCH` / `PUT` 日志端点。
- 部署建议：应用数据库账号不授予 `OperationLog` 的 `DELETE` / `UPDATE` 权限。
- 不做日志清理任务（决策 22）。

### 3.9 明确不新增的表

| 不新增 | 原因 |
| --- | --- |
| `Role` / `Permission` / `RolePermission` | 决策 15、16。角色固定六值、权限字典与矩阵是服务端常量；新增可编辑表会直接违反"不允许自定义角色"和"不提供数据库权限编辑器" |
| `PermissionGroup` / 配置组存储 | 权限 key 是代码常量，不是可配置数据；与既有"稳定英文 key + 中文走 `ConfigOption`"原则不同层——`ConfigOption` 管业务枚举，不管权限 |
| 组织架构 / 部门表 | 决策 22 排除 |
| `LoginAttempt` 独立表 | 失败尝试计数放 `User.failedLoginAttempts` / `User.lockedUntil` 即可；完整证据链由 `OperationLog(category = login_security)` 承载 |

> **若未来出现"必须新增 Role 表"的诉求**：那只意味着产品决策 15 已被推翻，必须先回到本文档修改决策基线，不能以技术便利为由绕过。

### 3.10 迁移顺序与数据影响

单一增量 migration（目录名建议 `2026xxxx_add_auth_and_authorization`），顺序：

1. `User` 新增 6 个认证字段（全部可空或有默认值，**不 DROP 任何列**）；`role` 列保留。
2. 删除 `@@unique([tenantId, email])`，新增 `User.email` 全局唯一索引。
3. 新建 `Account` / `Session` / `Verification` / `RateLimit` / `UserRoleAssignment` 五张表。
4. `OperationLog` 新增 5 个字段（全部可空或有默认值）+ 5 个索引。

数据影响（实测基线）：

- `User` 0 行 → 改唯一约束无数据冲突。
- `OperationLog` 69 行 → 新字段走默认值（`category = business`、`result = success`），历史日志的 `requestId` / `userAgent` / 快照字段为 null，UI 显示"—"。
- 现有 `User.role` 数据不存在，无需回填 `UserRoleAssignment`。
- **不回填、不改写、不删除任何历史 migration**（`AGENTS.md` 硬性规则）。

---

## 4. 权限模型

### 4.1 完整权限字典（服务端常量，稳定英文点号 key）

权限字典保存在服务端代码（建议 `src/server/auth/permissions.ts`），**不落库、不经 `ConfigOption`、不提供编辑界面**。

| # | key | 中文含义 | 说明 |
| --- | --- | --- | --- |
| 1 | `dashboard.view` | 查看工作台 | 所有登录用户默认具备 |
| 2 | `fabric.view` | 查看面料库 | — |
| 3 | `fabric.create` | 新增面料 | — |
| 4 | `fabric.edit` | 编辑面料主档 | 含成品参考价编辑 |
| 5 | `fabric.manage_sources` | 管理面料货源 | 新增/维护货源、切换首选 |
| 6 | `purchase_price.view` | 查看采购价格 | **字段级裁剪开关**，见 §4.7 |
| 7 | `purchase_quote.manage` | 管理采购报价 | 新增采购报价快照 |
| 8 | `supplier.view` | 查看供应商与生产单元 | — |
| 9 | `supplier.create` | 新增供应商 | — |
| 10 | `supplier.edit` | 编辑供应商 | — |
| 11 | `supplier.deactivate` | 停用供应商 | 状态改为停用 |
| 12 | `supplier.manage_units` | 管理生产单元 | 新增/编辑/暂停生产单元 |
| 13 | `customer.view` | 查看客户与联系人 | — |
| 14 | `customer.create` | 新增客户 | — |
| 15 | `customer.edit` | 编辑客户与联系人 | 含联系人增删改 |
| 16 | `customer.deactivate` | 停用客户 | — |
| 17 | `sample.view` | 查看寄样 | — |
| 18 | `sample.create` | 新增寄样 | — |
| 19 | `sample.edit` | 编辑寄样与推进状态 | 寄样无独立终态权限，统一走 edit |
| 20 | `sample.record_feedback` | 登记客户反馈 | 明细行反馈 |
| 21 | `customer_quote.view` | 查看客户报价 | — |
| 22 | `customer_quote.create` | 新增客户报价 | — |
| 23 | `customer_quote.edit` | 编辑客户报价 | — |
| 24 | `customer_quote.advance_status` | 推进报价状态 | 草稿 → 已发送 → 已接受/已拒绝 |
| 25 | `sales_order.view` | 查看销售订单 | — |
| 26 | `sales_order.create` | 新增销售订单 | 含从报价转订单 |
| 27 | `sales_order.edit` | 编辑销售订单 | — |
| 28 | `sales_order.advance_status` | 推进订单状态 | 确认 / 备货 / 发货 / 完成 / 取消 |
| 29 | `sales_order.update_fulfillment` | 跟进履约状态 | 登记已交付数量 |
| 30 | `user.view` | 查看用户列表与详情 | — |
| 31 | `user.create` | 新增用户 | owner 全权；admin 受限（§4.4） |
| 32 | `user.edit` | 编辑用户资料与状态 | owner 全权；admin 受限 |
| 33 | `user.deactivate` | 停用用户 | owner 全权；admin 受限 |
| 34 | `user.assign_roles` | 分配/回收角色 | owner 全权；admin 受限 |
| 35 | `user.reset_password` | 重置用户密码 | **owner 可重置 owner 与普通用户；admin 只能重置非 owner**（决策 25） |
| 36 | `role_matrix.view` | 查看角色权限矩阵 | — |
| 37 | `audit_log.view` | 查看操作日志 | **只有查看，无编辑/删除** |
| 38 | `system_settings.view` | 查看系统设置 | — |
| 39 | `system_settings.manage` | 维护系统设置与配置组 | — |

**字典总数：39 项**（此前文档里出现的"32 项"是笔误，已更正）。

**第 28 项 `sales_order.advance_status` 已确认保留（决策 24）**：

- 理由：销售订单状态机是六态（草稿/已确认/备货中/已发货/已完成/已取消），且跟单员（merchandiser）是"**非终态可推进、终态不可推进**"的受限语义。若把它并进 `sales_order.edit`，则无法表达"edit 允许但终态推进受限"这一差异，会直接破坏已冻结静态原型中 merchandiser 的"受限允许"单元格。

**不需要权限 key 的接口**（仅需已认证）：

- 查询自己的会话（`GET /api/auth/session`）
- 退出登录（`POST /api/auth/logout`）
- 修改本人密码（`POST /api/auth/change-password`）
- 读取表单所需配置下拉（`GET /api/config-options`）

理由：这些是任何登录用户完成基本操作所必需的；把它们纳入权限字典会让"无权限用户连退出都做不到"。

### 4.2 六个固定角色的权限矩阵

`A` = 允许，`—` = 不允许。矩阵为服务端常量，与静态原型 `rolePermissionMatrix` 一一对应（对照见 §4.8）。

| key | owner | admin | sales | purchasing | merchandiser | viewer |
| --- | --- | :-: | :-: | :-: | :-: | :-: | :-: |
| `dashboard.view` | A | A | A | A | A | A |
| `fabric.view` | A | A | A | A | A | A |
| `fabric.create` | A | A | — | A | — | — |
| `fabric.edit` | A | A | — | A | — | — |
| `fabric.manage_sources` | A | A | — | A | — | — |
| `purchase_price.view` | A | A | — | A | — | — |
| `purchase_quote.manage` | A | A | — | A | — | — |
| `supplier.view` | A | A | A | A | A | A |
| `supplier.create` | A | A | — | A | — | — |
| `supplier.edit` | A | A | — | A | — | — |
| `supplier.deactivate` | A | A | — | A | — | — |
| `supplier.manage_units` | A | A | — | A | — | — |
| `customer.view` | A | A | A | A | A | A |
| `customer.create` | A | A | A | — | — | — |
| `customer.edit` | A | A | A | — | — | — |
| `customer.deactivate` | A | A | — | — | — | — |
| `sample.view` | A | A | A | A | A | A |
| `sample.create` | A | A | A | — | A | — |
| `sample.edit` | A | A | A | — | A | — |
| `sample.record_feedback` | A | A | A | — | A | — |
| `customer_quote.view` | A | A | A | A | A | A |
| `customer_quote.create` | A | A | A | — | — | — |
| `customer_quote.edit` | A | A | A | — | — | — |
| `customer_quote.advance_status` | A | A | A | — | — | — |
| `sales_order.view` | A | A | A | A | A | A |
| `sales_order.create` | A | A | A | — | — | — |
| `sales_order.edit` | A | A | A | — | A | — |
| `sales_order.advance_status` | A | A | A | — | **受限** | — |
| `sales_order.update_fulfillment` | A | A | A | — | **受限** | — |
| `user.view` | A | A | — | — | — | — |
| `user.create` | A | **受限** | — | — | — | — |
| `user.edit` | A | **受限** | — | — | — | — |
| `user.deactivate` | A | **受限** | — | — | — | — |
| `user.assign_roles` | A | **受限** | — | — | — | — |
| `user.reset_password` | A | **受限** | — | — | — | — |
| `role_matrix.view` | A | A | — | — | — | — |
| `audit_log.view` | A | A | — | — | — | — |
| `system_settings.view` | A | A | — | — | — | — |
| `system_settings.manage` | A | A | — | — | — | — |

**"受限"不是第三种权限值**。权限层只有 `allow` / `deny` 两态；"受限"表示 `allow` + 一条服务端强制的业务前置校验（§4.4）。这样服务端判定是二值且可测试的，UI 仍可沿用静态原型的"受限允许 + 文字说明"展示。

> 静态原型已同步：`admin` 的 `user_management.reset_password` 由"允许"改为"受限允许"，并补充限制说明"只能重置非 owner 账号的密码；owner 账号的密码只能由另一个 owner 重置。"（本轮唯一允许的 UI 改动）。

### 4.3 多角色权限并集规则

```
permissions(user) = ⋃  permissions(role)  for role in user.roles
```

- 只要任一角色 `allow`，结果即 `allow`；**不存在"deny 覆盖 allow"**（不做拒绝优先）。理由：六个固定角色之间没有冲突设计，拒绝优先只会让授权结果难以预测。
- 权限集合在**每次请求**从数据库重新读取 `UserRoleAssignment` 计算，不缓存到 Session 数据里。
- 单次请求内用 React `cache()` 记忆化，避免同一请求重复查库。
- 角色变更生效时机见 §5.10。

### 4.4 owner / admin 的附加业务限制（服务端强制）

权限矩阵通过之后，仍需通过以下业务规则。这些规则在**服务层事务内**执行，前端不做最终判断。

**R1 · admin 不能处置 owner 身份（决策 19）**

| 操作 | admin 行为 |
| --- | --- |
| `user.create` | 可创建普通账号；请求体/结果中不得出现 `owner` 角色，出现即 403 |
| `user.edit` | 目标用户含 owner 角色时，编辑其资料返回 403 |
| `user.deactivate` | 目标用户含 owner 角色时返回 403 |
| `user.assign_roles` | 不得授予或回收 `owner` 角色，涉及即 403 |
| `user.reset_password` | **受限允许**（决策 25）：只能重置**非 owner** 账号；目标用户含 `owner` 角色 → **403**，不走"重置 + 审计"的放宽路线 |

**R2 · 至少一个启用 owner（决策 17、18）**

任何会让"启用状态 owner 数量变为 0"的操作必须被拒绝（HTTP 409 + 明确文案）：

- 停用某个 owner；
- 移除某个用户的 `owner` 角色；
- 把 owner 降级（等价于移除 owner 角色）。

判定口径：

```
活跃 owner 数 = COUNT(UserRoleAssignment WHERE tenantId = :t AND roleKey = 'owner'
                      AND user.status = 'active')
```

**R3 · 并发保护（决策要求：不能只靠前端判断）**

前端禁用按钮只是提示，真正的保证在数据库事务里。方案（**推荐主方案**）：

1. 开启事务，第一件事对租户行加锁，把同租户的用户变更串行化：
   `SELECT id FROM "Tenant" WHERE id = $1 FOR UPDATE`（经 `prisma.$queryRaw`）。
2. 在锁内重新读取目标用户、其角色、以及活跃 owner 计数（**不做任何事务外缓存**）。
3. 校验 R1 / R2；不满足 → 抛 `AppError(409, ...)`，事务回滚。
4. 校验通过 → 写入 `User` / `UserRoleAssignment`（唯一约束 `[userId, roleKey]` 兜底防重复），并在**同一事务**写入 `OperationLog`。
5. 提交。

补充保险：

- 事务隔离级别使用 `Serializable`，并捕获 `40001`（序列化失败）重试最多 2 次。
- `UserRoleAssignment @@unique([userId, roleKey])` 防止并发重复插入产生"看起来有两个同角色"的脏数据。

**为什么不用数据库 CHECK / 部分唯一索引**：PostgreSQL 的 CHECK 约束无法表达跨行聚合（"至少一行满足条件"），部分唯一索引也无法覆盖"停用用户要计入/排除"的逻辑。跨行不变式只能靠**锁 + 事务内重算**。这一点必须在代码注释里写明，避免后来者误以为加个约束就够了。

### 4.5 UI 隐藏按钮 vs 服务端强制授权

| 层 | 职责 | 能否作为安全边界 |
| --- | --- | --- |
| 侧栏隐藏 / 按钮 disabled / 前端重定向 | **仅体验优化**，减少无意义点击 | **不能**。任何人可以直接 curl API |
| `proxy.ts` 乐观重定向 | 检查 Cookie 是否存在后跳登录页 | **不能**。官方明确定位为 optimistic check |
| Route Handler 入口校验 | 解析 Session → 401；校验权限 → 403 | 能，但不够（见下） |
| **服务层 / 数据访问层校验** | 每次查询与写入都带 `tenantId`，资源级校验 | **能，且是主边界** |

硬性要求：

- **不能只完成登录页面就宣称权限系统完成**；现有全部业务 API 完成服务端授权前，系统不得对公网/不受控网络开放（§8）。
- 每个 Route Handler **和**每个服务层函数入口都要重新校验，不能假设"上一层查过了"。
- 资源级校验（IDOR）：详情与更新查询必须同时限定资源 ID 与 `tenantId`，不能只校验"用户已登录"。

### 4.6 HTTP 状态码使用规则

| 场景 | 状态码 | 响应体 |
| --- | --- | --- |
| 未登录 / Session 不存在 / Session 过期 / Session 已被撤销 | **401** | `{ "error": "登录状态已失效，请重新登录。", "code": "UNAUTHENTICATED" }` |
| 已登录但缺少所需权限 | **403** | `{ "error": "没有执行该操作的权限。", "code": "FORBIDDEN", "requiredPermission": "<key>" }` |
| 已登录但 `mustChangePassword = true`，访问非白名单接口 | **403** | `{ "error": "请先修改初始密码。", "code": "PASSWORD_CHANGE_REQUIRED" }` |
| 违反业务规则（最后一个 owner、编号重复、货源重复） | **409** | `{ "error": "<具体文案>", "code": "<KEY>" }` |
| 资源不存在 **或** 属于其他租户 | **404** | `{ "error": "Resource not found." }` |
| 参数/JSON/配置 key 非法 | **400** | 沿用现有 `apiErrorResponse` |
| 触发限速 | **429** | 带 `X-Retry-After` 头 |

关键约束：**跨租户资源统一返回 404，不返回 403**。返回 403 会泄露"该 ID 在别的租户存在"这一事实。

### 4.7 `purchase_price.view` 的字段级影响（不能只隐藏前端）

**原则：无 `purchase_price.view` 时，服务端在序列化阶段直接裁剪字段，价格根本不出现在响应里。** 前端隐藏只是第二道。

受控字段（无权限时**从响应对象中删除该键**，而不是置 null）：

| 位置 | 被裁剪字段 |
| --- | --- |
| `FabricSupplierQuote` | `purchasePriceExclTax`、`purchasePriceInclTax`、`purchaseTaxRate` |
| `GreigeFabric` | `unitPriceExclTax`、`unitPriceInclTax`、`taxRate` |
| `DyeingFinishing` | `unitPriceExclTax`、`unitPriceInclTax`、`taxRate` |
| `PostProcess` | `unitPriceExclTax`、`unitPriceInclTax`、`taxRate` |
| `CustomerQuoteItem` | `costPrice` |
| `SalesOrderItem` | `costPrice` |
| 报价单/订单聚合结果 | `costCny`、`marginCny`、`marginRate` → `null`（沿用现有"缺成本显示 —"逻辑） |

**不受控（仍随 `fabric.view` 返回，决策 26：已拍板）**：`Fabric.finishedReferencePriceExclTax / finishedReferencePriceInclTax / finishedReferenceTaxRate`。理由：成品参考价是**面向客户的销售参考价**，业务员报价时需要它；它不是我方进货成本，不属于"采购价格"范畴。此结论已冻结，不再作为开放议题。

配套响应标志：所有可能含价格的响应统一带 `purchasePriceVisible: boolean`，UI 据此显示"— / 需要采购角色授权"，避免出现"看起来是 0"的误导。

写入侧同样收紧：

| 场景 | 规则 |
| --- | --- |
| 无 `purchase_quote.manage` 提交新增采购报价 | 403 |
| 无 `purchase_price.view` 的用户提交报价单/订单时携带 `costPrice` | 服务端**忽略**该字段（不作为读取价格的旁路），不报错 |
| 无 `purchase_price.view` 的用户编辑面料工艺单价 | 403（避免绕过读取限制通过写入侧间接获得） |

### 4.8 与已冻结静态原型的一致性对照

| 原型（`system-prototype-data.ts`） | 本文正式 key | 一致性 |
| --- | --- | --- |
| `dashboard` / `view` | `dashboard.view` | 一致 |
| `fabric` / `view` `create` `edit` `manage_source` | `fabric.view` `fabric.create` `fabric.edit` `fabric.manage_sources` | 一致（`manage_source` → `manage_sources`，复数形式按已确认清单） |
| `purchase_price` / `view_purchase_price` | `purchase_price.view` | 一致 |
| `purchase_price` / `manage_purchase_quote` | `purchase_quote.manage` | 一致（模块名独立为 `purchase_quote`） |
| `supplier_unit` / `view` `create` `edit` `deactivate` | `supplier.view` `supplier.create` `supplier.edit` `supplier.deactivate` | 一致（模块名收敛为 `supplier`） |
| `supplier_unit` / `manage_production_unit` | `supplier.manage_units` | 一致 |
| `customer` / `view` `create` `edit` `deactivate` | 同名同义 | 一致 |
| `sample` / `view` `create` `edit` `record_feedback` | 同名同义 | 一致 |
| `quote` / `view` `create` `edit` `advance_quote_status` | `customer_quote.*` + `customer_quote.advance_status` | 一致 |
| `order` / `view` `create` `edit` `update_fulfillment` | `sales_order.*` + `sales_order.advance_status`（补充） | 一致 + 1 项补充 |
| `user_management` / `view` `create` `edit` `deactivate` `assign_role` `reset_password` | `user.*` + `user.assign_roles` | 一致 |
| `audit_log` / `view` | `audit_log.view` | 一致；原型中"操作日志"只有查看，本文同样不提供编辑/删除 |
| `system_settings` / `view` `maintain_config` | `system_settings.view` `system_settings.manage` | 一致 |
| `role_matrix` | `role_matrix.view` | 原型未单独列出模块，本文按已确认清单补充 |
| owner 规则 5 条 | §4.4 R1 + R2 | 一致 |

---

## 5. 登录与会话流程

### 5.0 端点形态（重要实现约束）

**浏览器不直接调用 Better Auth 的 `/api/auth/sign-in/email`**，而是走自建薄封装 `POST /api/auth/login`：

```
POST /api/auth/login
  1. 解析 body（email / password），统一 trim + toLowerCase
  2. 前置校验：lockedUntil、status、failedLoginAttempts
  3. 调用 auth.api.signInEmail({ body, headers: request.headers, returnHeaders: true })
  4. 成功：把响应里的 set-cookie 透传到 NextResponse；写成功日志；更新 lastLoginAt；清零 failedLoginAttempts
  5. 失败：failedLoginAttempts + 1、达到阈值则设 lockedUntil；写失败日志；返回统一文案
```

理由：统一失败文案、暂时锁定、停用拦截、审计日志四项都无法通过裸 Better Auth 端点实现。会话本身仍完全由 Better Auth 创建与校验——**没有自建 Session**。

**`Set-Cookie` 透传（已实测，方案确定）**：

```text
const result = await auth.api.signInEmail({
  body: { email, password },
  headers: request.headers,
  returnHeaders: true,          // 实测有效
});
// result = { headers: Headers, response: { token, user, ... } }
// headers 里只有 set-cookie（实测 header 键集合）
const res = NextResponse.json(payload, { status: 200 });
for (const cookie of result.headers.getSetCookie()) {
  res.headers.append("set-cookie", cookie);   // 必须逐个 append
}
```

实测要点（都写进实现约定，避免踩坑）：

- `returnHeaders: true` 时返回 `{ headers, response }`，`headers` 是标准 `Headers` 实例（不是普通对象）。
- **必须用 `headers.getSetCookie()` 而不是 `headers.get("set-cookie")`**。退出登录时 Better Auth 会一次性下发 3 个清除指令（`session_token`、`session_data`、`dont_remember`），`get()` 会把它们用逗号拼成一个非法 Cookie 串；实测 `getSetCookie()` 正确返回 3 条。
- 透传后 `res.headers.has("set-cookie")` 为 true，可被浏览器正常接收。

> **被否决的退路（不再采用）**：让浏览器直接调 `/api/auth/sign-in/email` 再由前端补调 `login-audit`。这条退路会让审计可被绕过，且实测证明 `returnHeaders` 完全可用，因此**禁止**采用。

同样原则下自建的端点：`/api/auth/logout`、`/api/auth/change-password`、`/api/auth/session`。**Better Auth 的 HTTP handler 不挂载**（或用 `disabledPaths` 全量屏蔽），浏览器侧不放开任何 BA 路径。

### 5.1 登录成功流程

1. 校验 `lockedUntil > now` → 返回锁定文案（§5.3），不进入密码校验。
2. 查用户（全局唯一 email）；**用户不存在时返回与密码错误完全一致的文案**（§5.2）。
3. 用户存在但 `status = inactive` → 返回停用文案（§5.4），不校验密码。
4. 调用 Better Auth `signInEmail` 校验密码。
5. 成功 → 建立 Session（12h），写 `lastLoginAt`，`failedLoginAttempts = 0`。
6. 写 `OperationLog`：`category = login_security`、`module = auth`、`action = login`、`result = success`、`userId` 有值、`targetType = "User"`、`targetId = userId`、`ipAddress`、`userAgent`、`requestId`、快照姓名/邮箱。
7. 响应体返回 `{ mustChangePassword, roles, permissions, tenantName, name }`；若 `mustChangePassword = true`，前端跳转 `/change-password`（§5.5）。

### 5.2 登录失败与限速流程

**统一文案**（账号不存在与密码错误完全一致，防账号枚举）：

> 邮箱或密码不正确，请检查后重试。

- 不提示"该邮箱未注册"、不提示剩余重试次数。
- 失败计数：`failedLoginAttempts += 1`（仅当用户存在时记在用户行上；用户不存在时无法记，只能依赖 IP 维度的 Better Auth 限流）。
- 内置限流：`/sign-in/email` 走 `customRules` 严格窗口，超限返回 **429 + `X-Retry-After`**。
- 写 `OperationLog`：`action = login_failed`、`result = failure`。

### 5.3 暂时锁定流程

- 阈值：连续失败 **5 次** → `lockedUntil = now + 15 分钟`，`failedLoginAttempts` 保留（不清零，便于审计）。
- 锁定期间任何登录请求直接返回：

  > 登录尝试过于频繁，请在 15 分钟后重试，或联系系统管理员。

  且**不再增加失败计数**，但仍写 `login_failed` 日志（避免锁定成为"免审计窗口"）。
- 锁定期满自动解锁。
- 管理员重置密码、重新启用账号时清零 `failedLoginAttempts` 与 `lockedUntil`。
- 成功登录后清零 `failedLoginAttempts`。

### 5.4 账号停用流程

1. 管理员调用 `PATCH /api/users/[id]`（`status = inactive`）或专用停用端点，需 `user.deactivate` + 通过 §4.4 校验。
2. 事务内：`User.status = inactive` → 撤销全部 Session（`prisma.session.deleteMany({ where: { userId } })`）→ 写 `OperationLog`（`module = user_management`、`action = deactivate_user`）。
3. 该用户此后登录返回：

   > 账号已停用，请联系系统管理员。

4. 历史 `OperationLog` 与业务数据全部保留，不做删除。

### 5.5 首次登录强制改密流程

- 触发条件：`User.mustChangePassword = true`（新建用户、管理员重置密码后）。
- 登录**允许成功**并建立 Session，但 `AuthContext.mustChangePassword = true`。
- 前端跳转 `/change-password`，侧栏与业务入口隐藏。
- 服务端白名单（§5.14）之外的所有接口返回 **403 + `PASSWORD_CHANGE_REQUIRED`**。
- 改密成功后 `mustChangePassword = false`，写 `OperationLog`，跳回业务页。

### 5.6 修改本人密码流程

`POST /api/auth/change-password`，需已认证（无需权限 key）：

- 入参：`currentPassword`、`newPassword`。
- 校验：新密码长度 ≥ 10（在 Better Auth 默认 8 之上收紧）、不得与当前密码相同、不得等于邮箱或账号名。
- 调用 `auth.api.changePassword({ body: { currentPassword, newPassword, revokeOtherSessions: true }, headers: request.headers })`（实测：带 cookie 的 `Headers` 可正常执行，其它会话被撤销、当前会话保留）。
- 后续：更新 `passwordChangedAt`、`mustChangePassword = false`，写 `OperationLog`（**`action = change_password`**，决策 27；`category = login_security`、`module = auth`、`result = success`，detail 只记"自助修改 / 其他会话已失效"）。
- 调用失败（原密码错误等）按 §5.2 的统一文案处理，并写 `result = failure` 日志。

### 5.7 管理员重置密码流程

`POST /api/users/[id]/reset-password`，需 `user.reset_password` + 通过 §4.4 校验：

1. 服务器生成临时密码：`crypto.randomBytes(12).toString("base64url")`（约 16 字符）。
2. 写入新凭据（**方案已实测定稿**，不采用 Admin 插件，也不碰 `Account.password`）：
   1. 配置 `emailAndPassword.revokeSessionsOnPasswordReset = true` 与 `sendResetPassword`（回调里**只把 token 存到局部变量**，不真的发邮件、不落日志）；
   2. 服务端调用 `auth.api.requestPasswordReset({ body: { email, redirectTo } })`（实测返回通用文案，不泄露账号是否存在）；
   3. 拿到回调里的 token，调用 `auth.api.resetPassword({ body: { token, newPassword: 临时密码 } })`。
   实测结果：旧密码立即失效、新密码可登录、`session` 表行被清空、`verification` 行被消费。全程不经过邮件，也不需要任何管理员会话。
   > 被否决的方案：Admin 插件 `auth.api.setUserPassword` —— 实测无 `headers` 直调返回 401（`use: [adminMiddleware]`），要使用它就必须引入 `user.role` 列与 BA 的 admin 会话，与决策 28、16 冲突（§2.2）。
3. 事务/后续：`mustChangePassword = true`、`passwordChangedAt = now`、`failedLoginAttempts = 0`、`lockedUntil = null`，写 `OperationLog`（**`action = reset_password`**，决策 27；`category = user_permission`、`module = user_management`、`result = success`，detail 记"管理员重置 / 强制改密：是 / 历史会话：已失效"）。
   > 会话撤销由 BA 的 `revokeSessionsOnPasswordReset` 完成，不与我们同事务（§5.10 的补偿规则适用）。
4. 响应体**一次性返回明文临时密码**，服务端不保存明文、不写入日志、不写入任何文件。
5. UI 必须弹窗提示"该密码只显示一次，请复制并线下交付"。

### 5.8 退出登录流程

`POST /api/auth/logout` → 调用 Better Auth `signOut` → 删除当前 Session 行 → 写 `OperationLog`（`action = logout`，detail 可记会话时长与退出方式）→ 前端清本地状态并跳 `/login`。

### 5.9 Session 过期流程

- `getSession` 返回 null → 所有业务接口返回 **401**。
- 前端收到 401 → 清除本地状态 → 跳 `/login`（可带 `redirect` 参数）。
- 活跃用户滚动续期（`updateAge = 1h`），最长不活动 12 小时后过期。
- **不提供"记住我"长期会话**（`dont_remember` 机制不使用）。

### 5.10 角色变更后旧 Session 如何处理

- 权限在**每次请求**重新计算（§4.3），因此普通角色变更**下一个请求即生效**，无需撤销 Session。与静态原型日志中"生效方式：下次请求生效"一致。
- **降权与失效类操作默认同时撤销该用户全部 Session**，立即生效：
  - 停用用户；
  - 移除 `owner` 或 `admin` 角色；
  - 管理员重置密码。
- 撤销后该用户的其他设备立即收到 401，需重新登录。

### 5.11 数据库 Session 建议时长

| 项 | 值 |
| --- | --- |
| `expiresIn` | 12 小时 |
| `updateAge` | 1 小时 |
| `freshAge` | 10 分钟（敏感操作要求较新会话） |
| `cookieCache` | 关闭 |
| 空闲过期 | 12 小时 |

### 5.12 Cookie 要求

| 属性 | 值 | 说明 |
| --- | --- | --- |
| `httpOnly` | `true` | 禁止 JS 读取 |
| `secure` | `true`（生产 / HTTPS） | Better Auth 默认在生产模式启用；局域网 HTTP 部署见下 |
| `sameSite` | `lax` | 允许站内导航携带，缓解 CSRF |
| `path` | `/` | — |
| `domain` | 不设置（默认当前主机） | 不启用跨子域 Cookie |
| 前缀 | `fabric`（`advanced.cookiePrefix`） | 避免与其它应用冲突 |
| Cookie 内容 | 只放不透明 session token | 不放任何业务数据或 PII |

**局域网 HTTP 部署的现实约束**：产品定位先服务局域网协作，若部署环境无 HTTPS，则 `secure` 无法启用（浏览器会丢弃 Cookie）。此时：

- 不强制 `useSecureCookies`；
- 但必须把访问控制限定在受信任内网（网络层隔离），并在文档中标注该部署方式**不允许暴露到公网**；
- 一旦上公网或云端，必须启用 HTTPS 并打开 `useSecureCookies: true`。

### 5.13 统一服务端 `AuthContext`

每次请求在 Route Handler 入口构造（并用 React `cache()` 在单次请求内记忆化）：

| 字段 | 来源 |
| --- | --- |
| `sessionId` | Better Auth Session 行 ID |
| `userId` | Session.userId |
| `tenantId` | **`User.tenantId`**（不是请求参数，不是 Cookie） |
| `email` / `name` / `username` | User 行 |
| `status` | User 行；非 active 直接 401 |
| `mustChangePassword` | User 行 |
| `roles: RoleKey[]` | `UserRoleAssignment` |
| `permissions: Set<string>` | 角色并集（§4.3） |
| `requestId` | 每次请求生成，贯穿日志 |
| `ipAddress` / `userAgent` | 请求头解析（`x-forwarded-for` / `x-real-ip`，注意 `NextRequest.ip` 已移除） |

**`tenantId` 的三条铁律**：

1. 只从已验证 Session → `User.tenantId` 得到；
2. 客户端请求体、查询串、Header 中出现的 `tenantId` 一律忽略（严格模式 Zod 应直接拒绝未知字段）；
3. 服务层函数显式接收 `tenantId` 参数，不允许在服务层内部再次调用全局租户函数。

### 5.14 `mustChangePassword = true` 时的访问拒绝规则

白名单（仅这三个接口可访问）：

- `GET /api/auth/session`
- `POST /api/auth/logout`
- `POST /api/auth/change-password`

**其余全部业务 API 返回 403 + `PASSWORD_CHANGE_REQUIRED`。**

实现要求：拒绝逻辑放在 `AuthContext` 构造之后、权限校验之前的统一中间件函数里，**不允许靠前端重定向实现**。前端跳转只是把用户引导到正确页面。

### 5.15 Better Auth 写入与业务写入**不能共享事务**的补偿策略（实测结论）

**实测事实**：

- `auth.api.*` 没有传入事务客户端的入口（`toAuthEndpoints` 里 `context: authContext` 会覆盖调用方传入的 `context`；端点调用选项只有 `headers / body / query / asResponse / returnHeaders / returnStatus`）。
- `databaseHooks` 的签名是 `(data, ctx: GenericEndpointContext | null)`，**拿不到事务句柄**。
- Prisma 适配器的 `transaction: true` 只是 **Better Auth 自己内部**把 user + account 写入包起来，与我们的 `$transaction` 无关。实测：在我们的 `$transaction` 里调用 `auth.api.signUpEmail`，外层回滚后**用户行依然存在** —— 说明 BA 的写入独立提交。
- 因此：`User` / `Account`（BA 写）与 `UserRoleAssignment` / `OperationLog`（我们写）**分处两个提交单元**，必须设计补偿。

**建号补偿（顺序即安全边界）**：

| 步骤 | 动作 | 失败后的处理 |
| --- | --- | --- |
| 0 | 生成 `requestId`，先查 `OperationLog` 是否已有同 `requestId` 且 `action = create_user`、`result = success` 的记录 | 有 → 直接返回原结果（幂等，不重复建号） |
| 1 | 校验权限、租户、owner 规则、邮箱唯一性（我们自己的查库） | 直接返回 403/409，**不调用 Better Auth** |
| 2 | `auth.api.signUpEmail`（`tenantId` 由 §2.4 的 hook 注入） | 抛错 → 记录 `result = failure` 日志（可写，因为还没产生数据）→ 返回 400/422 的友好文案 |
| 3 | 我们的事务：`UserRoleAssignment` 写入 + 更新业务字段 + `OperationLog` | 事务内任一失败 → 整体回滚 → 重试最多 2 次；仍失败 → 删除第 2 步创建的账号（`prisma.user.delete`，级联清掉 Account/Session），返回 500 并写失败日志 |
| 4 | 孤儿账号清理 | 定义"未完成初始化账号"= `User` 存在但 `UserRoleAssignment` 为空且 `createdAt` 早于 10 分钟；管理员列表标记为"待完成初始化"，提供"补分配角色"或"删除"两个动作；不允许这类账号登录（`AuthContext` 里 roles 为空即无权限，见 §3.8） |

- **重试时邮箱已存在**：因为 `email` 全局唯一，先按 email 精确查用户——命中且属本租户且无角色 → 走第 3 步补写（自动恢复）；命中且已激活 → 409 `USER_EMAIL_EXISTS`。
- **`requestId` 贯穿**：建号请求由前端在打开抽屉时生成并随表单提交（或服务端用 `crypto.randomUUID()` + 幂等键表），日志与重试都以它为准。

**重置密码补偿（禁止回滚到旧密码）**：

| 场景 | 处理 |
| --- | --- |
| 密码已改、Session 未撤销 | BA 的 `revokeSessionsOnPasswordReset` 负责；返回前**再执行一次** `prisma.session.deleteMany({ where: { userId } })` 作为幂等兜底 |
| 密码已改、`OperationLog` 未写 | **不回滚密码**（旧密码已不可恢复）。日志按"必须成功"重试；仍失败则返回 `500` + 明确文案"密码已重置但审计日志写入失败，请联系管理员补记"，并保留 `requestId` 供幂等补写 |
| `mustChangePassword` 更新失败 | **顺序前置**：先在事务里写 `mustChangePassword = true` + 失败计数清零，再调用 BA 改密。这样任何后续失败都停在"必须改密、旧密码仍有效"的安全态，重试即可；绝不会出现"密码已换但用户不知道要改密" |
| 最终状态不变式 | 任一路径结束后必须满足：新临时密码可用 **且** `mustChangePassword = true` **且** 无残留 Session **且** 有对应审计记录（缺失时以失败响应显式暴露，不静默） |

---

## 6. 首个 owner 初始化

**本轮只设计，不创建脚本。**

### 6.1 目标与约束

| 约束 | 满足方式 |
| --- | --- |
| 不依赖公开注册 | 使用独立的一次性 CLI 命令（建议 `npm run auth:bootstrap-owner`），不经过任何 HTTP 注册端点 |
| 真实初始密码不写入 seed / Git / migration / 日志 | 密码只在运行时由 `crypto.randomBytes` 生成，只打印到 stdout |
| 可重复执行但不重复创建 | 事务内先检查是否已存在启用 owner |
| 已存在启用 owner 时安全拒绝 | 输出"已存在启用 owner，跳过"并以退出码 0 结束 |
| 临时密码只显示一次 | 打印后进程结束，服务端不留存明文 |
| 首次登录必须改密 | 创建时 `mustChangePassword = true` |

### 6.2 流程

1. 读取环境变量：`OWNER_EMAIL`、`OWNER_NAME`、`OWNER_USERNAME`（可选，默认取邮箱前缀）、`OWNER_TENANT_CODE`（默认 `default`）、`AUTH_SECRET`（缺失直接报错退出）。
2. 校验 `AUTH_SECRET` 不是占位值（`CHANGE_ME`），否则拒绝执行。
3. 事务开始 → 对 `Tenant` 行加 `FOR UPDATE` 锁。
4. 统计该租户活跃 owner 数：
   - `> 0` → 输出已存在信息，**不创建、不修改任何数据**，退出码 0。
   - `= 0` → 继续。
5. 生成临时密码 `crypto.randomBytes(12).toString("base64url")`。
6. 走 §2.4 的建号路径：`AsyncLocalStorage` 里放入 `{ tenantId }` 后调用服务端 `auth.api.signUpEmail`（`disableSignUp` 必须为 `false`，公开注册靠不挂 HTTP handler / `disabledPaths` 屏蔽，见 §2.1）+ 写 `Account` 凭据；随后在同一租户事务里写 `UserRoleAssignment(owner)` + `OperationLog`（`module = auth`、`action = create_user`、`result = success`）。失败补偿按 §5.15 执行。
7. 提交事务。
8. stdout 打印：

   ```
   已创建首个企业所有者账号：<email>
   临时密码（仅显示一次）：<tempPassword>
   请立即登录并在首次登录时修改密码。
   ```

### 6.3 安全要求

- `.env.example` 中的 `AUTH_SECRET="CHANGE_ME"` 必须替换为强随机值；真实 `.env` 不提交（`AGENTS.md` 已有规则）。
- 初始化命令的输出**不得**被重定向进仓库文件、日志文件 or CI 产物。
- 不把初始化写进 `prisma/seed.mjs`（seed 只做系统级枚举配置，且会被反复执行）。
- 若脚本重复执行且已存在 owner，必须**静默成功**（幂等），不得报错导致部署失败。

---

## 7. 现有 API 改造清单

### 7.1 统计

- Route Handler 文件：**26 个**
- Handler（路径 × 方法）：**42 个**
- 当前租户获取方式：**全部**为 `getServerTenant()`（`src/server/tenant.ts`，临时单租户 upsert），无一处接受客户端 `tenantId`
- 跨租户风险现状：抽查 `src/server/fabrics/read-fabrics.ts`、`samples.ts`、`fabrics/source-quotes.ts`、`customers.ts`、`fabrics/create-fabric.ts`，详情/更新类查询均使用 `id + tenantId` 或复合唯一键（`tenantId_code`）限定，跨租户已按 404 处理。**改造时仍需逐条复核**（下表"复核点"列）。

### 7.2 配置

| 路径 | 方法 | 权限 key | 敏感字段 | 写日志 | 复核点 |
| --- | --- | --- | --- | --- | --- |
| `/api/config-options` | GET | 认证即可 | 否 | 否 | 白名单分组机制保留；未来若新增含敏感业务参数的分组，需升为 `system_settings.view` |

### 7.3 面料

| 路径 | 方法 | 权限 key | 敏感字段 | 写日志 | 复核点 |
| --- | --- | --- | --- | --- | --- |
| `/api/fabrics` | GET | `fabric.view` | **是**：`latestQuote.purchasePrice*` 受 `purchase_price.view` 裁剪 | 否 | 列表查询已带 `tenantId` |
| `/api/fabrics` | POST | `fabric.create`（携带 `initialQuote` 时额外要求 `purchase_quote.manage`） | 是（创建价格） | 是 | 事务内已写日志 |
| `/api/fabrics/[id]` | GET | `fabric.view` | **是**：`quotes[].purchasePrice*`、工艺 `unitPrice*` 受裁剪；`finishedReferencePrice*` 不受裁剪 | 否 | `findFirst({ id, tenantId })` ✅ |
| `/api/fabrics/[id]` | PATCH | `fabric.edit`；含工艺单价时额外要求 `purchase_price.view` | 是 | 是 | 同上 |
| `/api/fabrics/[id]/sources` | POST | `fabric.manage_sources`（携带 `initialQuote` 时额外 `purchase_quote.manage`） | 是 | 是 | 供应商/生产单元需校验同租户 |
| `/api/fabrics/[id]/sources/[sourceId]` | PATCH | `fabric.manage_sources` | 否（不含价格） | 是 | `sourceId` 需同面料 + 同租户 |
| `/api/fabrics/[id]/sources/[sourceId]/quotes` | POST | `purchase_quote.manage` | 是 | 是 | 同上 |

### 7.4 供应商与生产单元

| 路径 | 方法 | 权限 key | 敏感字段 | 写日志 | 复核点 |
| --- | --- | --- | --- | --- | --- |
| `/api/suppliers` | GET | `supplier.view` | 否 | 否 | — |
| `/api/suppliers` | POST | `supplier.create` | 否 | 是 | — |
| `/api/suppliers/[id]` | GET | `supplier.view` | 否 | 否 | — |
| `/api/suppliers/[id]` | PATCH | `supplier.edit`；`status = inactive` 时要求 `supplier.deactivate` | 否 | 是 | — |
| `/api/suppliers/[id]/units` | GET | `supplier.view` | 否 | 否 | 供应商需同租户，否则 404 |
| `/api/suppliers/[id]/units` | POST | `supplier.manage_units` | 否 | 是 | 供应商需启用且同租户 |
| `/api/supplier-units/[id]` | GET | `supplier.view` | 否 | 否 | — |
| `/api/supplier-units/[id]` | PATCH | `supplier.manage_units` | 否 | 是 | 不得通过 PATCH 改归属 |

### 7.5 客户与联系人

| 路径 | 方法 | 权限 key | 敏感字段 | 写日志 | 复核点 |
| --- | --- | --- | --- | --- | --- |
| `/api/customers` | GET | `customer.view` | 否 | 否 | — |
| `/api/customers` | POST | `customer.create` | 否 | 是 | — |
| `/api/customers/[id]` | GET | `customer.view` | 否 | 否 | — |
| `/api/customers/[id]` | PATCH | `customer.edit`；`status = inactive` 时要求 `customer.deactivate` | 否 | 是 | — |
| `/api/customers/[id]/contacts` | GET | `customer.view` | 否 | 否 | — |
| `/api/customers/[id]/contacts` | POST | `customer.edit` | 否 | 是 | 联系人归属客户需同租户 |
| `/api/customers/[id]/contacts/[contactId]` | GET | `customer.view` | 否 | 否 | — |
| `/api/customers/[id]/contacts/[contactId]` | PATCH | `customer.edit` | 否 | 是 | `contactId` 需属该客户 + 同租户 |

### 7.6 寄样

| 路径 | 方法 | 权限 key | 敏感字段 | 写日志 | 复核点 |
| --- | --- | --- | --- | --- | --- |
| `/api/sample-requests` | GET | `sample.view` | 否 | 否 | — |
| `/api/sample-requests` | POST | `sample.create` | 否 | 是 | 客户/联系人/面料需同租户 |
| `/api/sample-requests/[id]` | GET | `sample.view` | 否 | 否 | — |
| `/api/sample-requests/[id]` | PATCH | `sample.edit` | 否 | 是 | — |
| `/api/sample-requests/[id]/status` | PATCH | `sample.edit` | 否 | 是 | 状态 key 走配置校验 |
| `/api/sample-requests/[id]/items/[itemId]/feedback` | PATCH | `sample.record_feedback` | 否 | 是 | `itemId` 需属该寄样 + 同租户（已带 `requestId + tenantId`）|

### 7.7 客户报价单

| 路径 | 方法 | 权限 key | 敏感字段 | 写日志 | 复核点 |
| --- | --- | --- | --- | --- | --- |
| `/api/customer-quotes` | GET | `customer_quote.view` | **是**：`items[].costPrice` 受裁剪 | 否 | — |
| `/api/customer-quotes` | POST | `customer_quote.create` | **是**（无 `purchase_price.view` 时忽略传入 `costPrice`）| 是 | — |
| `/api/customer-quotes/[id]` | GET | `customer_quote.view` | **是**：`costPrice`、聚合 `costCny / marginCny / marginRate` 受裁剪 | 否 | — |
| `/api/customer-quotes/[id]` | PATCH | `customer_quote.edit` | **是** | 是 | — |
| `/api/customer-quotes/[id]/status` | PATCH | `customer_quote.advance_status` | 否 | 是 | 终态不可回退 |

### 7.8 销售订单

| 路径 | 方法 | 权限 key | 敏感字段 | 写日志 | 复核点 |
| --- | --- | --- | --- | --- | --- |
| `/api/sales-orders` | GET | `sales_order.view` | **是**：`costPrice`、成本/毛利聚合受裁剪 | 否 | — |
| `/api/sales-orders` | POST | `sales_order.create` | **是** | 是 | 客户/联系人/面料需同租户 |
| `/api/sales-orders/from-quote` | POST | `sales_order.create` | **是** | 是 | 源报价需同租户 |
| `/api/sales-orders/[id]` | GET | `sales_order.view` | **是** | 否 | — |
| `/api/sales-orders/[id]` | PATCH | `sales_order.edit` | **是** | 是 | — |
| `/api/sales-orders/[id]/status` | PATCH | `sales_order.advance_status`（merchandiser 受限：仅非终态）| 否 | 是 | 终态由 owner/admin 处理 |
| `/api/sales-orders/[id]/delivery` | PATCH | `sales_order.update_fulfillment`（merchandiser 受限）| 否 | 是 | 已交付数量 ≤ 订单数量 |

### 7.9 新增端点草案（不属于现有改造清单，后续阶段实现）

| 路径 | 方法 | 权限 key | 说明 |
| --- | --- | --- | --- |
| `/api/auth/login` | POST | 公开 | §5.0 薄封装 |
| `/api/auth/logout` | POST | 认证即可 | — |
| `/api/auth/session` | GET | 认证即可 | 返回 AuthContext 摘要 |
| `/api/auth/change-password` | POST | 认证即可 | 含 mustChangePassword 场景 |
| `/api/auth/[...all]` | GET/POST | — | Better Auth 处理器挂载点；浏览器侧除上述封装外不直接暴露其它路径 |
| `/api/users` | GET / POST | `user.view` / `user.create` | — |
| `/api/users/[id]` | GET / PATCH | `user.view` / `user.edit` | 含启用/停用 |
| `/api/users/[id]/roles` | PUT | `user.assign_roles` | 全量覆盖式分配，事务内校验 §4.4 |
| `/api/users/[id]/reset-password` | POST | `user.reset_password` | 一次性返回临时密码 |
| `/api/roles/matrix` | GET | `role_matrix.view` | 返回权限字典 + 六角色矩阵（服务端常量） |
| `/api/audit-logs` | GET | `audit_log.view` | **只读**，无写/删端点 |
| `/api/audit-logs/[id]` | GET | `audit_log.view` | 只读详情 |

### 7.10 如何逐步替换 `src/server/tenant.ts`

现状：`getServerTenant()` 读 `DEV_TENANT_CODE`（默认 `default`），不存在则 upsert。它是**唯一**的租户来源，被 8 个服务模块调用。

替换路径（对应 §8 的阶段 5、6）：

| 步骤 | 动作 | 风险 |
| --- | --- | --- |
| 1 | 新增 `src/server/auth/context.ts`：`resolveAuthContext(request)` → `AuthContext`；`requirePermission(ctx, key)`；`requireAuth(ctx)` | 无（纯新增） |
| 2 | 给 `getServerTenant()` 加 `@deprecated` 注释，说明"仅存量代码临时使用，新代码一律接收 `tenantId` 参数" | 无 |
| 3 | 服务层函数签名改造：`readFabrics(query)` → `readFabrics(ctx, query)`，内部不再调用 `getServerTenant()`，`tenantId` 由入参显式传入 | 调用点较多，需同步改测试 |
| 4 | 逐个 Route Handler 接入：入口 `const ctx = await resolveAuthContext(request)` → `requirePermission(ctx, "...")` → 调服务层传 `ctx` | 每个 Handler 独立 commit 更安全 |
| 5 | 全部改造完成后删除 `getServerTenant()`、`DEV_TENANT_CODE` / `DEV_TENANT_NAME` 环境变量；`Tenant` 不再由请求 upsert | 删除前必须确认零引用（`grep -rn getServerTenant src/` 为空） |

**不允许的中间态**：部分 Handler 已接认证、部分仍走 `getServerTenant()` 时，系统**不得**对公网开放。

---

## 8. 实施阶段拆分

每轮一个独立 commit，不 amend；每轮结束给出下一步建议，用户同意后才继续。

| 阶段 | 内容 | 完成判据 |
| --- | --- | --- |
| **1. Prisma 数据模型与增量 migration** | §3 全部字段/表/索引；一条增量 migration；**删除 `User.role`**；dev + test 双库 `migrate deploy`；`prisma generate` | `prisma migrate status` 干净；`npm test` 全绿（存量测试不回归） |
| **2. Better Auth 基础接入与首个 owner 初始化** | `better-auth@1.7.6` **已安装并锁定**（本轮完成）；`src/lib/auth.ts`；§2.4 的三层 tenantId 注入；**不挂载 BA HTTP handler**；`auth:bootstrap-owner` 脚本；登录页真实提交（仅登录，其它页面仍受限） | 能用首个 owner 登录；重复执行初始化脚本幂等；`curl /api/auth/*` 全部 404 |
| **3. 登录、退出、Session、首次改密** | §5.1–5.6、5.8、5.9、5.14；统一失败文案、限速、锁定、停用拦截、审计日志 | §9 中登录相关用例全通过 |
| **4. 用户管理与多角色分配 API** | `/api/users*`；`UserRoleAssignment` 读写；§4.4 的 R1/R2/R3 事务保护；管理员重置密码 | owner 并发用例、admin 不能操作 owner 用例通过 |
| **5. 统一 AuthContext 与权限辅助函数** | `src/server/auth/context.ts`、权限字典常量、角色矩阵常量、`requirePermission`；`purchase_price.view` 字段裁剪工具 | 单元测试覆盖并集与裁剪 |
| **6. 逐个改造现有业务 API** | §7.3–7.8 共 41 个业务 Handler（另有 1 个配置 Handler），按模块分批（面料 → 供应商 → 客户 → 寄样 → 报价 → 订单） | 每个 Handler 都有认证 + 权限 + 租户校验；存量测试改造完成 |
| **7. 系统管理 UI 真实接入** | 用户管理/角色权限/操作日志三页替换演示数据；登录页接真实接口；账号菜单显示真实用户 | 浏览器回归通过 |
| **8. 登录 UI 与全应用访问保护** | `proxy.ts` 仅做乐观重定向；所有页面服务端校验；未登录跳 `/login` | 未登录直接访问任意页面/接口均被拦截 |
| **9. 审计日志真实接入与安全回归** | 全部写操作落 `OperationLog`（category/result/requestId/快照）；日志脱敏；安全回归清单 | 日志不含密码/Token/Cookie 的用例通过 |

**红线（写进阶段 6 的验收标准）**：

> 不能只完成登录页面就宣称权限系统完成。**现有全部业务 API 完成服务端授权之前，系统不得对公网或不受控网络开放。**

---

## 9. 测试与验收设计

### 9.1 必须覆盖的用例

| # | 用例 | 预期 |
| --- | --- | --- |
| 1 | 正常登录与退出 | 200；`lastLoginAt` 更新；Session 行存在；退出后 Session 行消失；两条日志均写入 |
| 2 | 错误账号与错误密码统一响应 | 两者文案完全一致，均为"邮箱或密码不正确，请检查后重试。"，状态码一致 |
| 3 | 登录失败限速与锁定 | 连续 5 次失败后 `lockedUntil` 被设置；第 6 次返回锁定文案；429 场景带 `X-Retry-After` |
| 4 | 停用用户无法登录 | 返回停用文案；即使密码正确也不建立 Session |
| 5 | 首次登录只能访问改密相关接口 | 业务 API 全部 403 + `PASSWORD_CHANGE_REQUIRED`；三个白名单接口可用 |
| 6 | 重置密码撤销全部旧 Session | 重置前建 2 个 Session，重置后两者均失效；`mustChangePassword = true` |
| 7 | 多角色权限取并集 | `purchasing + merchandiser` 同时具备两个角色的全部 allow |
| 8 | sales 无法看到采购价格字段 | 响应 JSON 中**不存在** `purchasePriceExclTax` 等键（不是值为 null）；`purchasePriceVisible = false` |
| 9 | 无权限写操作返回 403 | 响应含 `requiredPermission`；数据库无变更 |
| 10 | 跨租户详情返回 404 | 用租户 B 的 Session 读租户 A 的资源 → 404（不是 403） |
| 11 | admin 不能操作 owner | 创建/编辑/停用/分配 owner 均 403 |
| 12 | 最后一个启用 owner 无法停用或降级 | 409；数据库角色与状态不变 |
| 13 | 并发请求不能同时移除最后一个 owner | 两个并发请求同时移除唯一 owner → 一个成功、一个 409（或都失败），**不会**出现 0 个启用 owner |
| 14 | 登录失败日志 `userId` 为空且标识脱敏 | `userId = null`、`actorName = "未识别账号"`、邮箱形如 `z***@cloth2026.com` |
| 15 | 日志不包含密码、Token 和 Cookie | 全量扫描日志 `detail`：`password` / `token` / `cookie` / `authorization` / `set-cookie` 相关键均不存在 |
| 16 | 既有业务测试改造为带认证上下文 | 见 §9.2 |

补充建议用例：Session 过期返回 401；`mustChangePassword` 改密后恢复访问；owner 可以是多个但至少保留一个；审计日志只读（不存在 DELETE/PATCH 路由）。

### 9.2 既有业务测试如何改造

现状：`tests/fabric-read-api.test.ts`、`fabric-backend.test.ts`、`supplier-api.test.ts` **直接 import Route Handler** 并用 `new Request("http://localhost/api/fabrics?...")` 调用；其余测试直接调用 `src/server/*` 服务函数。181 个用例。

改造方案：

1. **服务层测试**：新增 `tests/helpers/auth.ts`，提供
   - `makeTestContext({ roles, tenantId })` → 构造 `AuthContext`（不依赖 HTTP）
   - `seedTestUser({ tenantId, roles, email })` → 建 User + Account（可选）+ UserRoleAssignment
   服务函数签名改为接收 `ctx` 后，测试显式传入。
2. **Route Handler 测试**：新增 `authRequest(token, url, init)` 辅助
   - 在测试库插入 `Session` 行（手造 `token` 随机串）
   - `new Request(url, { ...init, headers: { cookie: "fabric.session_token=" + token } })`
   - 这也反向验证了 §2.7 的设计要求：Route Handler 必须能从 `request.headers` 解析会话，而不是依赖 `next/headers`。
3. **`getServerTenant()` 的消失**：测试中原有的 `const tenant = await getServerTenant()` 改为显式创建/复用测试租户，并在 `after()` 中清理（测试库专用，`TEST_DATABASE_URL` 必须包含 `test`）。
4. **权限负向用例**：为每个写接口补一条"无权限角色 → 403 且数据未变"的断言。

---

## 10. 风险与开放议题

| # | 议题 | 现状 | 需要谁拍板 |
| --- | --- | --- | --- |
| 1 | ~~`sales_order.advance_status` 是否保留~~ | **已拍板：保留**（决策 24，§4.1） | — |
| 2 | ~~admin 能否重置 owner 密码~~ | **已拍板：admin 不能，仅 owner 可重置 owner**（决策 25，§4.4） | — |
| 3 | ~~`databaseHooks` 能否拿到请求头~~ | **已实测**：第二参数 `ctx` 存在，字段是 **`ctx.headers`**（`Headers` 实例），仅在调用时传了 `headers` 时非空（§12.2） | — |
| 4 | ~~管理员重置密码的服务端 API~~ | **已实测**：不用 Admin 插件；`requestPasswordReset` + `resetPassword` + `revokeSessionsOnPasswordReset`（§12.5） | — |
| 5 | 局域网 HTTP 部署的 Cookie `secure` | 无 HTTPS 时无法启用，必须以网络隔离补偿 | 用户（部署时） |
| 6 | 同邮箱多租户 | V1 全局唯一邮箱（§2.6）。未来若需要，需登录时选租户或外部 IdP | 未来评审 |
| 7 | ~~`User.role` legacy 列~~ | **已拍板：下一轮 migration 直接删除**（决策 28，§3.2） | — |
| 8 | 忘记密码自助找回 | V1 不做（管理员重置）。若后续要做，需引入邮件发送与 `Verification` 流程 | 未来评审 |
| 9 | ~~`finishedReferencePrice*` 是否受 `purchase_price.view` 保护~~ | **已拍板：不受保护**（决策 26，§4.7） | — |
| 10 | 是否挂载 `/api/auth/[...all]` | 本设计倾向**不挂载**。若将来必须挂载（例如引入 OAuth），同步需要 `RateLimit` 表与 `disabledPaths` 白名单 | 实施阶段 2 复核 |
| 11 | Better Auth 写入与业务写入不同事务 | 已接受并设计补偿（§5.15）。若后续官方提供事务桥接，可简化 | 持续跟踪 |

---

## 11. 本轮（兼容性验证轮）做的事与没做的事

**做了**：

- 安装并锁定 `better-auth@1.7.6`（`package.json` 精确版本 + lock 更新）。
- 用已安装包 + 临时 PostgreSQL 沙箱库完成 §12 的全部实测，并据此修正了 §2.1、§2.2、§2.4、§3.2、§3.6、§5.0、§5.6、§5.7、§5.15 等技术结论。
- 用官方 CLI（`auth@1.7.6`，与 `better-auth` 同版本）在**系统临时目录**生成 Prisma schema 做字段对照，临时文件已删除。
- 静态原型仅改一处：admin 的 `reset_password` 权限与限制说明（决策 25）。

**没做**：

- 未编写认证代码、未接入真实登录、未写生产 Route Handler。
- 未修改 `prisma/schema.prisma`、未创建/运行任何 migration、未改 `prisma/seed.mjs`。
- **未修改项目数据库**：沙箱验证用的是临时库 `fabric_auth_probe`，验证结束后已 `DROP DATABASE`，`fabric_trade_dev` / `fabric_trade_test` 未做任何写入。
- 未新增或修改任何业务 API、未修改 `src/server/tenant.ts`。
- 除 admin 重置密码规则说明外，未调整其它 UI（`/login`、`src/components/system/` 其余部分保持冻结）。
- 未启用 Admin 插件；未写自制密码哈希；未直接写 `Account.password`。
- 未恢复历史作废文档 `docs/DESIGN_USER_MODULE.md`，未采用其自建 Cookie Session / 自写哈希 / 单角色 / 自定义角色 / `AUTH_ENABLED` 方案。
- 未修改 `docs/DATA_MODEL.md`、`docs/API_CONTRACTS.md`、`docs/DEV_LOG.md`。

---

## 12. Better Auth 实测合同（版本 `1.7.6`）

> 本章记录"用什么方式验证、看到什么结果、最终采用什么"。完整证据与原始输出见 `docs/BETTER_AUTH_COMPATIBILITY_REPORT.md`。
>
> **验证环境**：`better-auth@1.7.6`（`package.json` 精确锁定）+ `better-auth/adapters/memory`（无库行为验证）+ 临时 PostgreSQL 沙箱库 `fabric_auth_probe`（Prisma 7.10 + `@prisma/adapter-pg` 真实链路，验证结束后已删除）。所有验证脚本与生成的临时 schema 都放在系统临时目录，**未进入仓库**。

### 12.1 版本与安装

| 项 | 实测值 |
| --- | --- |
| 安装命令 | `npm install better-auth@1.7.6 --save-exact` |
| `npm ls better-auth` | `better-auth@1.7.6` |
| `package.json` | `"better-auth": "1.7.6"`（无 `^`，精确锁定） |
| 直接依赖 | `@better-auth/core@1.7.6`、`@better-auth/prisma-adapter@1.7.6`、`@better-auth/memory-adapter@1.7.6` 等 |
| Prisma peer | `@prisma/client: ^5 || ^6 || ^7` —— 与本项目 7.10 兼容 |
| 未安装 | Admin 插件是 `better-auth/plugins` 的内置导出，不需要额外包；本轮仅临时装了官方 CLI `auth@1.7.6`（`--no-save`，已卸载，未写入 `package.json`） |

### 12.2 验证项与结果汇总

| # | 验证项 | 方式 | 实测结果 | 采用结论 |
| --- | --- | --- | --- | --- |
| A | `disableSignUp: true` 时服务端能否建号 | `auth.api.signUpEmail`（带/不带 headers 各一次） | **均失败**：`APIError 400`，body `{ message: "Email and password sign up is not enabled", code: "EMAIL_PASSWORD_SIGN_UP_DISABLED" }`，hook 调用次数 0 | **否决** `disableSignUp: true`；改用 `disabledPaths` 屏蔽 HTTP |
| B1 | `tenantId` 配 `required: true, input: false` | `signUpEmail` | **失败**：400 `MISSING_FIELD: tenantId is required`，**hook 未被调用** | 改为 `required: false, input: false` |
| B2 | body 里强塞 `tenantId` | `signUpEmail({ body: { ..., tenantId } })` | **被拒**：400 `FIELD_NOT_ALLOWED: tenantId is not allowed to be set` | `input: false` 有效，客户端无法伪造租户 |
| B3 | `ctx.headers` 是否存在 | hook 第二参数打点 | 调用时**传了 `headers`**：`ctx` 非 null，`ctx.headers` 是 `Headers` 实例（含 `cookie`、`x-forwarded-for`），`ctx.path = "/sign-up/email"`，`ctx.request` 为 falsy | 字段名是 **`ctx.headers`**；可作为回退来源 |
| B4 | 纯服务端直调（不传 headers） | `signUpEmail` 不带 headers | `ctx` 非 null 但 `ctx.headers` 为 **null**，`ctx.request` 为 falsy | **不能只依赖 `ctx.headers`**，必须有 ALS 主通道 |
| B5 | hook 注入是否生效 | `required: false` + hook 返回 `{ data: { ...user, tenantId } }` | **成功**：落库 `tenantId: "tenant-default"` | 主方案可行 |
| B6 | hook 不注入 | hook 直接 return | 内存库里 `tenantId` 为 null（内存库无约束） | 必须 fail-closed |
| B7 | hook 抛错 | hook 内 `throw new Error(...)` | BA 包装为 **422 `FAILED_TO_CREATE_USER`**，无任何落库 | 采用：hook 抛错即 fail-closed |
| B8 | 真实库上 hook 不注入 | PostgreSQL 沙箱 | **Prisma 校验错误**：`Argument 'tenant' is missing` → 422，用户行未落库 | NOT NULL + 外键是有效兜底 |
| C | `AsyncLocalStorage` 跨 BA 调用链 | `als.run({ tenantId }, () => auth.api.signUpEmail(...))` | **成功**：hook 内读到 `tenantId`，落库正确；ALS 之外调用则被 fail-closed 拒绝 | **主通道定为 ALS**（不依赖 headers） |
| D | Admin 插件方法名 | 读 `plugins/admin/routes.mjs` + 运行时枚举 `auth.api` | `createUser` / `setUserPassword` / `revokeUserSessions` / `revokeUserSession` / `setRole` / `banUser` / `adminUpdateUser` …；对应 16 个 `/admin/*` HTTP 端点 | 见 12.4 |
| E | Admin `createUser` 无 headers 直调 | `auth.api.createUser({ body })` | **成功且跳过权限校验**（源码：`if (!session && (ctx.request \|\| ctx.headers)) throw UNAUTHORIZED`） | 能力可用，但不需要（见 12.4） |
| F | Admin `setUserPassword` / `revokeUserSessions` 无 headers 直调 | 同上 | **均失败**：401 `UNAUTHORIZED`（`use: [adminMiddleware]`） | 否决 Admin 插件的关键证据 |
| G | `disabledPaths` 的作用范围 | 同一实例：HTTP 调 `/admin/create-user` + 服务端 `auth.api.createUser` | HTTP → **404 Not Found**；`auth.api.*` → **照常成功** | 采用：屏蔽 HTTP 不影响服务端 |
| H | 不配 `disabledPaths` 时 HTTP 打 admin 端点 | `POST /api/auth/admin/create-user`（无会话） | **401**（有 BA admin 会话即可执行） | 必须屏蔽或干脆不挂载 |
| I | 无 Admin 插件的重置密码链路 | `requestPasswordReset` → 回调取 token → `resetPassword`，配 `revokeSessionsOnPasswordReset: true` | **成功**：session 数 2 → 0；旧密码失效、新密码可登录；`verification` 行被消费 | **采用**（§5.7） |
| J | 本人改密 | `changePassword({ revokeOtherSessions: true }, headers)` | **成功**：其它会话被撤销，当前会话保留（session 数 3 → 1） | 采用 |
| K | 事务共享 | 在我们的 `$transaction` 内调 `auth.api.signUpEmail`，外层 `throw` 回滚 | **用户行仍存在**（BA 独立提交）；`auth.api.signUpEmail` 上无 `transaction` 选项；hook 无事务句柄 | **无法共享事务**，按 §5.15 补偿 |
| L | 限速作用范围 | `rateLimit: { enabled: true, storage: "database" }` 后直调 `auth.api.signInEmail` 4 次 | 未产生任何 `rateLimit` 行；源码显示只在 router `onRequest` 生效 | 不启用内置限速，自建锁定 |
| M | 邮箱大小写 / 空格 | 建号 `MiXeD@…`；登录分别用全小写 / 原样 / 带空格 | 建号**自动小写**；小写与原样均可登录；带空格 → 400 `INVALID_EMAIL` | 我们侧统一 `trim().toLowerCase()` |
| N | `returnHeaders` / Set-Cookie | `signInEmail({ returnHeaders: true })` | 返回 `{ headers, response }`，`headers` 键集合只有 `set-cookie`；`getSetCookie()` 正确返回多条 | 采用，逐个 `append` |
| O | Cookie 前缀与属性 | `advanced.cookiePrefix = "fabric"` | `fabric.session_token=…; Max-Age=43200; Path=/; HttpOnly; SameSite=Lax`（`expiresIn` 已设为 12h） | 采用 |
| P | `signOut` | `auth.api.signOut({ headers, returnHeaders: true })` | 返回 `{ success: true }` + **3 条** `set-cookie` 清除指令；session 行数减 1 | 必须用 `getSetCookie()` |
| Q | 组合外键跨租户防护 | `UserRoleAssignment` 用 `[tenantId, userId] → User[tenantId, id]`，插入 `tenantId = B` / `userId ∈ A` | **拒绝**：`Foreign key constraint violated: UserRoleAssignment_tenantId_userId_fkey`；同租户插入正常 | 采用（§3.7） |
| R | Prisma 7 全链路 | 沙箱库 `db push` + `prisma-client` generator + `prismaAdapter` | 建号 / 登录 / `getSession` / 改密 / 重置全部成功 | 与现有技术栈兼容 |

### 12.3 最终用户创建方案（定稿）

```text
POST /api/users（我们的 Route Handler）
  1. resolveAuthContext(request)            → 权限校验 user.create + §4.4 R1
  2. 校验租户、邮箱唯一、owner 规则             → 不通过直接 403/409，不调 BA
  3. AsyncLocalStorage.run({ tenantId }, …)
       auth.api.signUpEmail({ body: { email, name, password, username }, headers: request.headers })
           └─ databaseHooks.user.create.before: 注入 tenantId（ALS → ctx.headers → 抛错）
  4. 我们的事务：UserRoleAssignment + 业务字段 + OperationLog
  5. 失败补偿按 §5.15
```

关键点：`disableSignUp` 必须保持 `false`；公开注册靠"不挂载 BA HTTP handler"（或 `disabledPaths: ["/sign-up/email"]`）阻断，实测两者都能让 HTTP 侧 404，而服务端 `auth.api.signUpEmail` 继续可用。

### 12.4 Admin 插件：不采用（附完整理由）

| 维度 | 实测事实 | 后果 |
| --- | --- | --- |
| schema | 新增 `user.role / banned / banReason / banExpires`、`session.impersonatedBy` | 与决策 28（删除 `User.role`）直接冲突 |
| 权限判定 | `hasPermission({ userId, role: session.user.role, ... })` | 等于引入第二套角色来源，与决策 16 冲突 |
| `setUserPassword` | 无 headers 直调 → 401 | 必须使用就得发 BA admin 会话 |
| `revokeUserSessions` | 无 headers 直调 → 401 | 同上 |
| HTTP 面 | 16 个 `/admin/*` 端点默认可达（无会话 401，有 BA admin 会话可执行） | 需要 `disabledPaths` 全量屏蔽才安全 |
| 租户 | `createUser` 不写 `tenantId`（需靠 `data` 传入，`data` 会绕过 `input: false`） | 需要额外校验，容易漏 |

**结论**：只为"建号 / 改密"引入一整套必须屏蔽的管理端点不划算。实测证明 §12.3 与 §12.5 的无插件路径完全可行，因此**不采用 Admin 插件**。

### 12.5 最终管理员重置密码方案（定稿）

```text
配置：emailAndPassword.revokeSessionsOnPasswordReset = true
      emailAndPassword.sendResetPassword = async ({ user, url, token }) => { 局部变量保存 token，不发信、不落日志 }

POST /api/users/[id]/reset-password
  1. 权限 user.reset_password + §4.4 R1（owner 目标 → 403，除非操作者本人是 owner）
  2. 我们的事务：mustChangePassword = true、failedLoginAttempts = 0、lockedUntil = null  （顺序前置）
  3. auth.api.requestPasswordReset({ body: { email, redirectTo } })
  4. auth.api.resetPassword({ body: { token, newPassword: 临时密码 } })
  5. 兜底 prisma.session.deleteMany({ where: { userId } })
  6. 写 OperationLog（action = reset_password）；日志失败按 §5.15 处理，绝不回滚密码
```

### 12.6 被否决方案清单

| 方案 | 否决原因（实测） |
| --- | --- |
| `emailAndPassword.disableSignUp = true` | 连服务端 `auth.api.signUpEmail` 一起拒（400 `EMAIL_PASSWORD_SIGN_UP_DISABLED`） |
| `tenantId` 配 `required: true` 由 hook 注入 | 校验在 hook 之前，hook 根本不执行（400 `MISSING_FIELD`） |
| 只靠 `ctx.headers` 解析调用者 | 纯服务端直调时 `ctx.headers` 为 null |
| 只靠 NOT NULL 兜底（hook 静默失败） | 错误形态是 BA 的 422 `FAILED_TO_CREATE_USER`，对调用方不可解释；必须 hook 主动抛错 |
| `tenantId` 改可空 + 巡检脚本 | 实测 NOT NULL + 外键足以挡住，无需牺牲约束 |
| Admin 插件 `createUser` / `setUserPassword` | 见 §12.4 |
| 浏览器直调 `/api/auth/sign-in/email` + 前端补调 `login-audit` | 审计可被绕过；且实测 `returnHeaders` 可用，无必要 |
| 内置限速（`rateLimit.storage = "database"`） | 只在 HTTP 层生效，我们无 HTTP 面；还会额外要求 `RateLimit` 表 |
| `headers.get("set-cookie")` 单条透传 | 退出登录有 3 条清除指令，`get()` 会拼成非法串；必须用 `getSetCookie()` |

### 12.7 仍未解决 / 需持续关注的风险

1. **BA 写入与业务写入不同事务**（§5.15）：建号存在"账号已建但角色/日志没写"的短窗口。缓解：无角色账号无任何权限且被标记"未完成初始化"；仍需运维关注孤儿账号。
2. **Bootstrap owner 脚本同样受此限制**：脚本必须按 §5.15 的补偿顺序执行，否则可能留下无角色的 owner。
3. **`ctx.headers` 在纯服务端调用下为 null**：若将来有人改成只从 headers 解析租户，会在 bootstrap 路径上静默失效。代码注释必须写明这一点。
4. **不挂载 BA HTTP handler 是安全前提**：一旦挂载而未配 `disabledPaths`，公开注册与管理端点会重新暴露。实施阶段 2 必须有回归用例断言 `/api/auth/sign-up/email` 返回 404。
5. **Better Auth 版本升级可能改变 hook 行为**：`databaseHooks` 属于官方 API 但未承诺不变更；升级时需重跑本轮的验证脚本（建议把关键断言固化成集成测试）。

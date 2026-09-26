# Better Auth 兼容性验证报告（`better-auth@1.7.6`）

> **状态：验证已完成。本文是验证证据与结论记录，不代表代码已实现。**
>
> 配套文档：`docs/DESIGN_AUTHORIZATION_AND_LOGIN.md`（§12「Better Auth 实测合同」是本文的摘要）。
> 本轮只做验证：未改 Prisma schema、未建 migration、未改 seed / API / UI / 业务库。

---

## 1. 验证目标与方法

上一轮设计（`8147019`）里有 4 处关键技术假设未经验证：

1. `emailAndPassword.disableSignUp = true` 时，服务端 `auth.api.signUpEmail` 是否仍可用于管理员建号；
2. `databaseHooks.user.create.before` 能否拿到请求头、能否注入 `tenantId`；
3. Admin 插件能否安全地只作为服务端凭据管理工具；
4. Better Auth 的写入能否与项目现有的 `OperationLog` 写入共享数据库事务。

验证手段：

| 手段 | 用途 |
| --- | --- |
| 读 `node_modules/better-auth/dist/**` 与 `@better-auth/core/dist/**` 的类型与实现 | 确认字段、签名、端点路径、开关作用范围 |
| `better-auth/adapters/memory` 运行时实例 | 无需数据库的行为验证（hook、错误码、Cookie、端点暴露） |
| 临时 PostgreSQL 库 `fabric_auth_probe` + Prisma 7.10 + `@prisma/adapter-pg` | 真实链路验证（建号、登录、改密、重置、NOT NULL 兜底、组合外键） |
| 官方 CLI `auth@1.7.6` 生成 Prisma schema（输出到系统临时目录） | 字段级对照 |

**所有验证脚本、临时 schema、临时数据库均在验证后删除。** 项目库 `fabric_trade_dev` / `fabric_trade_test` 未做任何写入。

---

## 2. 版本

| 项 | 值 |
| --- | --- |
| 安装命令 | `npm install better-auth@1.7.6 --save-exact` |
| 实际版本 | `better-auth@1.7.6`（`npm ls` 复核） |
| `package.json` | `"better-auth": "1.7.6"`（精确锁定，无 `^`） |
| 核心子包 | `@better-auth/core@1.7.6`、`@better-auth/prisma-adapter@1.7.6`、`@better-auth/memory-adapter@1.7.6` |
| Prisma peer 范围 | `@prisma/client: ^5 \|\| ^6 \|\| ^7` → 与项目 7.10 兼容 |
| 临时安装 | 官方 CLI `auth@1.7.6`（`--no-save`，已卸载，未写入 `package.json` / lock） |
| 未安装 | 无额外插件（Admin 是 `better-auth/plugins` 内置导出，不需要独立包） |

---

## 3. 逐项验证结果

### 3.1 `disableSignUp` 与服务端建号（结论：**否决 `disableSignUp: true`**）

| 配置 | 调用 | 结果 |
| --- | --- | --- |
| `disableSignUp: true` | `auth.api.signUpEmail({ body, headers })` | 抛 `APIError`，**400**，`body = { message: "Email and password sign up is not enabled", code: "EMAIL_PASSWORD_SIGN_UP_DISABLED" }`；`databaseHooks` 调用次数 **0** |
| `disableSignUp: true` | `auth.api.signUpEmail({ body })`（无 headers） | 同上 |
| `disableSignUp: false` + `disabledPaths: ["/sign-up/email"]` | HTTP `POST /api/auth/sign-up/email` | **404 Not Found** |
| 同一实例 | `auth.api.signUpEmail`（服务端直调） | **成功**，用户落库 |

依据：`disabledPaths` 只在 router 的 `onRequest`（`better-auth/dist/api/index.mjs`）里生效，返回 `new Response("Not Found", { status: 404 })`；`auth.api.*` 走 `toAuthEndpoints`，不经过该检查。

> **采用**：`disableSignUp: false` + `disabledPaths: ["/sign-up/email"]`（首选方案是干脆不挂载 BA 的 HTTP handler）。

### 3.2 `tenantId` 注入与 `databaseHooks`（结论：**字段名是 `ctx.headers`；`required` 必须 false；主通道用 AsyncLocalStorage**）

hook 签名（`@better-auth/core/dist/types/init-options.d.mts`）：

```ts
before?: (user: User & Record<string, unknown>,
          context: GenericEndpointContext | null) => Promise<boolean | void | { data: ... }>;
```

| 场景 | 结果 |
| --- | --- |
| `tenantId: { required: true, input: false }` | **400 `MISSING_FIELD: tenantId is required`**，hook **未被调用**（校验先于 hook） |
| body 里强塞 `tenantId` | **400 `FIELD_NOT_ALLOWED: tenantId is not allowed to be set`**（`input: false` 生效） |
| `required: false, input: false` + hook 注入 | **成功**，落库 `tenantId` 正确 |
| 调用时传 `headers` | `ctx` 非 null；`ctx.headers instanceof Headers === true`（含 `cookie`、`x-forwarded-for`）；`ctx.path = "/sign-up/email"`；`ctx.request` 为 falsy |
| 纯服务端调用（不传 headers） | `ctx` 非 null，但 **`ctx.headers` 为 null**，`ctx.request` 为 falsy |
| hook 不注入（内存库） | 用户行 `tenantId = null` —— 内存库无约束，说明**必须 fail-closed** |
| hook 抛错 | BA 包装为 **422 `FAILED_TO_CREATE_USER`**，数据库零写入 |
| hook 不注入（真实 PostgreSQL） | **Prisma 校验错误** `Argument 'tenant' is missing` → 422，用户行未落库 |
| `AsyncLocalStorage.run({ tenantId }, () => auth.api.signUpEmail(...))` | **hook 内可读到**，落库正确；ALS 之外调用被 fail-closed 拒绝 |

> **采用**：`additionalFields.tenantId = { type: "string", required: false, input: false }`；hook 内按 **ALS → `ctx.headers` → 抛错** 三级解析；`User.tenantId` 保持 NOT NULL + 外键作为兜底。
> **不再保留**"`tenantId` 改可空 + 巡检脚本"的退路，实测证明约束足以挡住。

### 3.3 Admin 插件（结论：**不采用**）

方法名与端点（读 `plugins/admin/routes.mjs` + 运行时枚举 `auth.api` 复核）：

| 服务端 API | HTTP 端点 |
| --- | --- |
| `auth.api.createUser` | `POST /admin/create-user` |
| `auth.api.setUserPassword` | `POST /admin/set-user-password` |
| `auth.api.revokeUserSessions` | `POST /admin/revoke-user-sessions` |
| `auth.api.revokeUserSession` | `POST /admin/revoke-user-session` |
| `auth.api.setRole` | `POST /admin/set-role` |
| `auth.api.banUser` / `unbanUser` / `adminUpdateUser` / `removeUser` / `impersonateUser` / `listUsers` / `listUserSessions` / `getUser` / `userHasPermission` | 对应 `/admin/*`（共 **16** 个端点） |

额外要求的字段（`plugins/admin/schema.mjs`，已用 CLI 生成的 schema 复核）：

```prisma
// user 表
role        String?
banned      Boolean?  @default(false)
banReason   String?
banExpires  DateTime?
// session 表
impersonatedBy String?
```

运行时行为：

| 调用 | 结果 |
| --- | --- |
| `auth.api.createUser({ body: { email, password, name, data: { tenantId } } })`（无 headers） | **成功**，跳过权限校验（源码：`if (!session && (ctx.request \|\| ctx.headers)) throw UNAUTHORIZED`）；`data` 会绕过 `input: false` 写入 `tenantId` |
| `auth.api.setUserPassword({ body })`（无 headers） | **401 UNAUTHORIZED**（`use: [adminMiddleware]`） |
| `auth.api.revokeUserSessions({ body })`（无 headers） | **401 UNAUTHORIZED** |
| HTTP `POST /api/auth/admin/create-user`，未配 `disabledPaths`，无会话 | **401** |
| HTTP 同上，配了 `disabledPaths` | **404** |
| 配 `disabledPaths` 的实例上 `auth.api.createUser` | **照常成功** |

否决理由：

1. 需要 `user.role` 列，与"下一轮删除 `User.role`"直接冲突；
2. `setUserPassword` / `revokeUserSessions` 必须带 BA 管理员会话，用起来等于引入第二套角色来源；
3. 16 个管理端点默认暴露，必须全量 `disabledPaths` 才安全；
4. 实测无插件路径（§3.5、§3.6）已能满足需求，不值得引入。

### 3.4 schema generator 对照

生成命令（`auth@1.7.6`，输出到系统临时目录，**未覆盖项目 schema**）：

```
auth generate --config <临时 auth 配置> --output <临时 schema.prisma> --adapter prisma --dialect postgresql -y
```

生成结果（核心部分）：

```prisma
model User {
  id            String    @id
  name          String
  email         String
  emailVerified Boolean   @default(false)
  image         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  sessions      Session[]
  accounts      Account[]
  @@unique([email])     // ← 全局唯一，证实 §2.6 结论
  @@map("user")
}

model Session {
  id        String   @id
  expiresAt DateTime
  token     String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  ipAddress String?
  userAgent String?
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([token])
  @@index([userId])
  @@map("session")
}

model Account {
  id                    String    @id
  accountId             String
  providerId            String
  userId                String
  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  accessToken           String?
  refreshToken          String?
  idToken               String?
  accessTokenExpiresAt  DateTime?
  refreshTokenExpiresAt DateTime?
  scope                 String?
  password              String?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
  @@index([userId])               // ← 官方没有给 @@unique([providerId, accountId])
  @@map("account")
}

model Verification {
  id         String   @id
  identifier String
  value      String
  expiresAt  DateTime
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  @@index([identifier])
  @@map("verification")
}

model RateLimit {                 // 仅当 rateLimit.storage === "database"
  id          String @id
  key         String
  count       Int
  lastRequest BigInt
  @@unique([key])
  @@map("rateLimit")
}
```

与设计的差异（已回填到设计文档 §3）：

| 项 | 生成器 | 上一轮设计 | 处理 |
| --- | --- | --- | --- |
| `Account` 唯一约束 | 只有 `@@index([userId])` | 写了 `@@unique([providerId, accountId])` | **按官方落地**，不额外加唯一键 |
| `Session` 索引 | `@@unique([token])`、`@@index([userId])` | 另写了 `expiresAt` 索引 | 保留官方两项；`expiresAt` 索引作为可选优化，不自创约束 |
| `Verification` 索引 | 有 `@@index([identifier])` | 未写 | 补上 |
| `RateLimit` | `id + key(unique) + count(Int) + lastRequest(BigInt)` | `key / count / lastRequest`（无 id） | 按官方补全（本轮结论是不建该表，见 §3.7） |
| `@@map` | 全部映射到小写表名 | 项目 schema 无 `@@map` | 项目沿用现有风格（表名即模型名），不引入 `@@map` |
| Admin 插件字段 | `role / banned / banReason / banExpires / impersonatedBy` | — | 不采用插件，不需要 |

Prisma 7 相关实测：

- `prisma-client` generator + `datasource` **不带 `url`**（Prisma 7 已在 schema 里禁用 `url`，连接串搬到 `prisma.config.ts`）→ 沙箱库上 `db push` + `generate` 成功；
- `prismaAdapter(prisma, { provider: "postgresql", transaction: true })` 与 `new PrismaClient({ adapter: new PrismaPg({ connectionString }) })` 组合可用；
- 组合外键 `UserRoleAssignment([tenantId, userId] → User[tenantId, id])`（依赖 `User @@unique([tenantId, id])`）通过 `validate` 与 `db push`。

### 3.5 重置密码（结论：**无 Admin 插件方案可行**）

| 步骤 | 结果 |
| --- | --- |
| 配置 `revokeSessionsOnPasswordReset: true` + `sendResetPassword` 回调保存 token | — |
| `auth.api.requestPasswordReset({ body: { email, redirectTo } })` | 成功，返回通用文案（不泄露账号是否存在）；`verification` 表写入一行（`identifier = "reset-password:<token>"`） |
| `auth.api.resetPassword({ body: { token, newPassword } })` | 成功；`session` 行数 **2 → 0**；旧密码登录失败、新密码登录成功；`verification` 行被消费 |

对比：Admin 插件的 `setUserPassword` 在无 headers 时直接 401，且要求 `user.role` 列——因此**采用无插件方案**。

### 3.6 本人改密

`auth.api.changePassword({ body: { currentPassword, newPassword, revokeOtherSessions: true }, headers })`：成功，其它会话被撤销、当前会话保留（实测 `session` 数 3 → 1）。

### 3.7 事务边界（结论：**无法共享事务**）

| 检查 | 结果 |
| --- | --- |
| `auth.api.*` 是否接受事务客户端 | 否。调用选项只有 `headers / body / query / asResponse / returnHeaders / returnStatus`；`toAuthEndpoints` 里 `context: authContext` 会覆盖调用方传入的 `context` |
| `databaseHooks` 是否给事务句柄 | 否，签名只有 `(data, ctx)` |
| Prisma 适配器 `transaction: true` | 只是 BA 自己内部把多步写入包起来，与我们的 `$transaction` 无关 |
| 实测：在我们的 `$transaction` 内调 `auth.api.signUpEmail`，外层抛错回滚 | **用户行依然存在** → BA 写入独立提交 |

补偿方案已写入设计文档 §5.15（建号四步 + 孤儿账号清理；重置密码"顺序前置 + 不回滚旧密码"）。

### 3.8 限速

开启 `rateLimit: { enabled: true, storage: "database", window: 10, max: 5 }` 后连续直调 `auth.api.signInEmail` 4 次：

- 未产生任何 `rateLimit` 行（内存库表键仍只有 `user / account / session / verification`）；
- 源码依据：`onRequestRateLimit` 只在 router 的 `onRequest` 里调用。

→ 内置限速只对 HTTP 生效。本设计不挂载 BA HTTP handler，因此**不启用内置限速、不建 `RateLimit` 表**，改为自建 `failedLoginAttempts` + `lockedUntil`。

### 3.9 Cookie 与服务端调用合同

| 项 | 实测 |
| --- | --- |
| `signInEmail({ returnHeaders: true })` | 返回 `{ headers, response }`；`headers` 是 `Headers` 实例，键集合只有 `set-cookie` |
| Cookie 名（默认） | `better-auth.session_token` |
| Cookie 名（`advanced.cookiePrefix = "fabric"`） | `fabric.session_token` |
| Cookie 属性 | `Max-Age=43200; Path=/; HttpOnly; SameSite=Lax`（`expiresIn` 设为 12h 时）；未启用 `Secure`（非 HTTPS 环境） |
| `signOut({ returnHeaders: true })` | 返回 `{ success: true }` + **3 条** `set-cookie` 清除指令（`session_token`、`session_data`、`dont_remember`） |
| `headers.get("set-cookie")` | 会把 3 条用 `, ` 拼成一个**非法** Cookie 串 |
| `headers.getSetCookie()` | 正确返回 3 条独立字符串 |
| 透传到自建响应 | `res.headers.append("set-cookie", cookie)` 逐条追加，实测可正常读取 |
| `getSession({ headers })` | 用 `set-cookie` 里的 `名=值` 作为 `cookie` 头即可通过；返回的 `user` 含 `additionalFields`（`tenantId`、`username` 等） |

会话行字段实测：`{ id, expiresAt, token, createdAt, updatedAt, ipAddress, userAgent, userId }`，`ipAddress` / `userAgent` 由请求头自动写入（`x-forwarded-for`、`user-agent`）。

### 3.10 邮箱规范化

| 输入 | 结果 |
| --- | --- |
| 建号 `MiXeD@Cloth2026.com` | 落库为 **`mixed@cloth2026.com`**（BA 自动小写） |
| 登录 `mixed@cloth2026.com` | 成功 |
| 登录 `MiXeD@Cloth2026.com` | 成功 |
| 登录 `" MiXeD@Cloth2026.com "` | **400 `INVALID_EMAIL`** |

→ 项目侧在所有入口统一 `trim().toLowerCase()`（决策：邮箱全局唯一 + 统一规范化）。

---

## 4. 最终采用方案（一句话版）

| 议题 | 结论 |
| --- | --- |
| 用户创建 | `disableSignUp: false` + `disabledPaths: ["/sign-up/email"]`（不挂 BA HTTP handler）；服务端 `auth.api.signUpEmail`；`tenantId` 由 `databaseHooks.user.create.before` 注入（ALS 主通道，`ctx.headers` 回退，无解则抛错） |
| 管理员重置密码 | `requestPasswordReset` → `sendResetPassword` 回调取 token → `resetPassword`，配 `revokeSessionsOnPasswordReset: true`；**不用 Admin 插件、不写 `Account.password`** |
| 本人改密 | `auth.api.changePassword({ revokeOtherSessions: true })` |
| 事务 | **不能共享**；按设计文档 §5.15 的顺序与补偿执行 |
| Admin 插件 | **不采用** |
| 限速 | **不启用内置**；自建 `failedLoginAttempts` + `lockedUntil`；不建 `RateLimit` 表 |
| Set-Cookie 透传 | `returnHeaders: true` + `getSetCookie()` 逐条 `append` |
| 邮箱 | 全局唯一 + 全入口 `trim().toLowerCase()` |
| 无角色用户 | 权限集合为空 → 仅能访问白名单，业务接口一律 403 |

---

## 5. 被否决方案（含原因）

| 方案 | 否决原因 |
| --- | --- |
| `disableSignUp: true` | 连服务端建号一起禁用（400 `EMAIL_PASSWORD_SIGN_UP_DISABLED`） |
| `tenantId` `required: true` + hook 注入 | 校验先于 hook，hook 不执行 |
| 仅靠 `ctx.headers` 解析租户 | 纯服务端调用时为 null |
| 仅靠 NOT NULL 兜底 | 错误不可解释（422 `FAILED_TO_CREATE_USER`），且依赖 hook 一定执行 |
| `tenantId` 改可空 + 巡检 | 实测约束足以挡住，无需牺牲 |
| Admin 插件 `createUser` / `setUserPassword` | 需要 `user.role` 列、需要 BA admin 会话、16 个端点需屏蔽 |
| 浏览器直调 BA 登录端点 + 前端补审计 | 审计可绕过；`returnHeaders` 已够用 |
| 内置限速 + `RateLimit` 表 | 只在 HTTP 层生效，本设计无 HTTP 面 |
| `headers.get("set-cookie")` 透传 | 多 Cookie 会被拼成非法串 |

---

## 6. 遗留风险

1. **建号/重置与业务写入不同事务**，存在短窗口孤儿账号（无角色 → 无权限，需"未完成初始化"标记与清理入口）。
2. **`ctx.headers` 在纯服务端调用下为 null**，若后续改造忘记 ALS 通道会在 bootstrap 路径静默失效。
3. **不挂载 BA HTTP handler 是安全前提**，挂载时必须同步 `disabledPaths`（建议加回归用例断言 `/api/auth/sign-up/email` 返回 404）。
4. **`databaseHooks` 属官方 API 但可能随版本变化**，升级 Better Auth 时需重跑本轮验证（建议把关键断言固化为集成测试）。
5. **局域网 HTTP 部署无法启用 `Secure`**，必须以网络隔离补偿，不得暴露公网。

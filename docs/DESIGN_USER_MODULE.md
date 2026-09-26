# 系统用户模块 · 产品设计

> 状态：**草稿，待确认**（2026-09-26）。按 `AGENTS.md`「产品设计先确认，再实现数据库、API 和真实 UI」，本文档只做字段表、权限字典、API 草案与界面线框，**不含 Prisma 代码，也未改动 schema / migration / 配置组**。§0 的议题逐条拍板后，本文档冻结，再按 §11 的阶段推进实现。
>
> 本文档由只读调研得出，现状依据：`prisma/schema.prisma`、`src/server/tenant.ts`、`src/app/page.tsx`、24 处 `operationLog.create` 调用点、15 个测试文件。

---

## 0. 待拍板议题（含推荐结论）

| # | 议题 | 推荐结论 | 备选 |
| --- | --- | --- | --- |
| 1 | 登录形态 | **自建账号密码 + 数据库会话**（不用 NextAuth、不引 OAuth） | 半成品 JWT 无状态方案；第三方 SSO（成本过高，不做） |
| 2 | 会话载体 | **`UserSession` 表 + HttpOnly Cookie**（Cookie 存随机 token，库里存 sha256 摘要） | JWT 自包含 Cookie（无法即时踢下线） |
| 3 | 密码哈希 | **`node:crypto` 的 scrypt + 每用户随机盐 + `timingSafeEqual`**（零新增依赖） | bcryptjs（要装包，收益相同） |
| 4 | 权限怎么存 | **权限字典写死在代码常量，角色只存 `permissions String[]` 数组**（见 §6.2） | 建 `Permission` + `RolePermission` 两张表 |
| 5 | 内置角色 | **4 个**：超级管理员 / 业务主管 / 业务员 / 只读；**允许自定义角色**；内置角色的 code 保留不可占用 | 只做 2 个（管理员 / 普通），后续再扩 |
| 6 | 生效开关 | **加 `AUTH_ENABLED` 开关**。默认 `false` = 本地免登录（维持今天的行为、现有 181 个测试零改动）；置 `true` 才强制登录鉴权 | 一步到位强制鉴权（会让现有测试与全部 API 调用同时失效，风险高） |
| 7 | 登录守卫方式 | **不用 Next middleware**（Edge 运行时连不了 Prisma）；前端启动时请求 `/api/auth/session`，未登录渲染登录页；每个 API 自己做会话校验 | middleware 做重定向（要绕 Edge 限制，复杂度高） |
| 8 | 用户删除 | **不提供删除，只停用**（`OperationLog.userId` 是可选外键，删用户会把历史日志的操作人清空） | 允许删除并保留日志（需额外快照字段，收益低） |
| 9 | 密码强度 | **≥ 8 位且含字母与数字**；连错 5 次锁 15 分钟；**首次登录必须改密码** | ≥ 6 位、无限次重试（内部系统可接受，但不推荐） |
| 10 | 会话时长 | **12 小时滑动续期**；退出即删会话记录；不提供「记住我」 | 8 小时固定 / 记住我 7 天 |
| 11 | 日志策略 | **沿用 `OperationLog`，不新增表**；补齐 `userId` / `ipAddress` / 操作人快照；新增 login / logout / 登录失败 / 越权被拒 4 类安全事件 | 另建 `AuthLog` 表（功能重复，不推荐） |
| 12 | 日志清理 | **本期不自动清理**，只做列表筛选与详情；清理脚本留到需要时再做 | 保留 180 天定时清理（需要调度能力，本期无） |
| 13 | 数据范围权限 | **本期不做**（不做「只能看自己创建的客户/报价」这类行级权限） | 按创建人隔离（工作量大且易误伤，建议以后单独评审） |
| 14 | 多租户自助 | **不做**：一个用户只属于一个租户；不开自助注册；不开租户自助开通 | 支持一个用户跨多租户切换（超出小团队使用场景） |

---

## 1. 背景与现状（调研结论）

| 现状 | 事实 |
| --- | --- |
| 认证 | **完全没有**：无 `src/middleware.ts`、无 `src/app/api/auth/**`、无 `src/lib/auth*`、无 bcrypt/jose/next-auth 依赖 |
| 租户解析 | `src/server/tenant.ts` 的 `getServerTenant()` 按环境变量 `DEV_TENANT_CODE`（默认 `default`）**upsert 出一个临时租户**，不读 header、不读 cookie |
| User 表 | 已存在，但**无 `passwordHash`**；`role` 是字符串默认值 `admin`；当前 **0 行数据** |
| OperationLog 表 | 已存在，字段为 `tenantId / userId? / module / action / targetType / targetId / detail? / ipAddress? / createdAt`；当前 **69 行，userId 全为空**（历史上没有「谁操作的」） |
| 日志写入点 | 24 处 `tx.operationLog.create`，分布在 8 个文件；**没有统一辅助函数，**全部不填 userId 与 ipAddress |
| 前端 | `src/app/page.tsx` 是单页壳（`"use client"`），侧边栏菜单：工作台 / 面料库 / 供应商 / 客户 / 寄样 / 报价 / 订单；**无任何当前用户展示或退出入口** |
| 配置 | 已有 18 个配置组，但**只有只读 API**（`GET /api/config-options`），没有配置组管理 UI，本次也不做 |

关键结论：**这是一个完全「无登录状态」的系统**。加登录真正的风险不在登录本身，而在于：一旦强制鉴权，现有的全部 API 调用、181 个测试和已跑通的业务流程会**同时失效**。所以用 §0-6 的双模式开关做缓冲，是本设计的核心。

---

## 2. 范围

**本次做**

- 登录页、登出、修改本人密码、首次登录强制改密。
- 用户管理：列表（搜索 + 角色/状态筛选）、新建、编辑、重置他人密码、停用/启用。
- 角色管理：列表、新建、编辑名称与权限勾选矩阵、停用/删除自定义角色。
- 权限管理：31 个权限码字典、按模块分组展示、服务端强制校验。
- 日志管理：列表（时间/模块/动作/操作人/目标筛选）、详情抽屉（含 JSON detail）。
- 安全事件入日志：登录成功、退出、登录失败、越权被拒。

**本次不做**

- 第三方登录 / SSO / 企业微信集成、短信/邮箱验证码、忘记密码自助找回（由管理员重置）。
- 多因素认证（MFA）、设备指纹、IP 白名单。
- 行级数据权限、字段级权限、组织架构 / 部门 / 岗位。
- 审批流（此前已定为永久暂缓）、自定义角色之外的多角色叠加（一人一角）。
- 配置组管理 UI、租户自助开通、MFA、密码历史、定期清理任务、日志导出。

---

## 3. 关键概念

| 概念 | 含义 |
| --- | --- |
| 用户 User | 能登录系统的人，属于**唯一**一个租户，绑定**唯一**一个角色 |
| 角色 Role | 权限集合，租户级数据；内置角色的 code 保留，可停用、不可删除系统内置的 `owner` |
| 权限码 | `模块:动作` 形式的稳定英文串，如 `quote:update`；**真正的校验依据是代码里的常量**，数据库只存勾选结果 |
| 会话 Session | 登录后发放的一次性凭据，存 Cookie + 数据库，可即时失效 |
| 操作日志 OperationLog | 谁在什么时候对哪个对象做了什么；安全类事件与业务类事件共用一张表 |
| 越权 | 有会话但缺权限码 → `403`；无会话 → `401` |

---

## 4. 登录与会话

### 4.1 凭证与哈希

- 登录名：`username`（租户内唯一），大小写**不敏感**（统一转小写后再查）。
- 密码：`User.passwordHash` 存 `scrypt$<salt-hex>$<hash-hex>`，每用户 16 字节随机盐；校验用 `crypto.timingSafeEqual`。
- 强度校验：≥ 8 位，必须同时含字母与数字；不得与 `username` 相同。
- 重置他人密码时由管理员填新密码，并置 `mustChangePassword = true`。

### 4.2 会话流程

```
浏览器                        服务端
  │ POST /api/auth/login {username,password}
  │──────────────────────────▶│ ① 查用户（租户 status / user status 校验）
  │                           │ ② scrypt 校验密码
  │                           │ ③ 失败计数 +1；≥5 次锁 15 分钟
  │                           │ ④ 生成 32 字节随机 token → sha256 入库
  │◀──────────────────────────│ ⑤ Set-Cookie: fts_session=<token>; HttpOnly; SameSite=Lax; Path=/; Max-Age=43200
  │ GET /api/auth/session     │
  │──────────────────────────▶│ ⑥ 取 Cookie → 摘要查 Session → 校验过期 → 返回用户+角色+权限
```

退出生效：删掉这条 Session 记录 + 清 Cookie。**同一个账号允许多处登录**（每个会话各自一条记录）；本期只做「登出踢自己」，不做管理员踢人。

### 4.3 首次引导

由一次性脚本/bootstrap 逻辑创建首个租户与首个超级管理员账号：

- 账号名取 `BOOTSTRAP_ADMIN_USERNAME`（默认 `admin`），初始密码取 `BOOTSTRAP_ADMIN_PASSWORD`（未设置则随机生成并打印到控制台一次）。
- 该账号 `mustChangePassword = true`，首次登录后必须改密码才能进入系统。

### 4.4 双模式开关

| `AUTH_ENABLED` | 行为 |
| --- | --- |
| `false`（默认） | 所有请求沿用「本地免登录」：租户仍取环境变量那份；操作人身份 = 虚拟超级管理员；所有权限校验直接放行；前端左上角显示「本地免登录模式」标签；**现有 181 个测试与已跑通流程完全不变** |
| `true` | 会话校验全量生效：无会话 401、无权限 403；页面未登录跳登录页 |

开关只在一个地方读（`src/server/auth/config.ts`），不允许散落到各处判断。

---

## 5. 权限模型

### 5.1 权限码字典（31 个，按模块分组）

| 模块 | 权限码 | 中文 | 说明 |
| --- | --- | --- | --- |
| 工作台 | `dashboard:view` | 查看工作台 | 统计卡片与快捷入口 |
| 面料库 | `fabric:view` | 查看面料 | 列表 + 详情 |
| 面料库 | `fabric:create` | 新增面料 | 新增面料主档 |
| 面料库 | `fabric:update` | 编辑面料 | 主档、工艺明细 |
| 面料库 | `fabric:source:manage` | 管理货源与采购报价 | 新增/修改货源与报价（含拿到的采购价） |
| 供应商 | `supplier:view` / `supplier:create` / `supplier:update` / `supplier:deactivate` | 查看 / 新增 / 编辑 / 停用 | |
| 客户 | `customer:view` / `customer:create` / `customer:update` / `customer:deactivate` | 查看 / 新增 / 编辑 / 停用 | |
| 寄样 | `sample:view` / `sample:create` / `sample:update` / `sample:feedback` | 查看 / 新增 / 编辑 / 登记客户反馈 | |
| 报价 | `quote:view` / `quote:create` / `quote:update` / `quote:status` | 查看 / 新增 / 编辑 / 标记状态 | 标记接受、拒绝、过期 |
| 订单 | `order:view` / `order:create` / `order:update` / `order:deliver` | 查看 / 新增 / 编辑 / 登记交付 | |
| 系统 | `system:user:view` | 查看用户 | |
| 系统 | `system:user:manage` | 管理用户 | 增删改、重置密码、停用 |
| 系统 | `system:role:view` | 查看角色 | |
| 系统 | `system:role:manage` | 管理角色与权限 | 建改角色、勾选权限 |
| 系统 | `system:log:view` | 查看操作日志 | |
| 系统 | `system:config:manage` | 管理配置组 | **本期定义但不启用**（配置组 UI 未做） |

### 5.2 内置角色（4 个）

| code | 名称 | 权限 | 说明 |
| --- | --- | --- | --- |
| `owner` | 超级管理员 | **全部 31 个** | 不可删除、不可编辑权限、最后一个启用状态不可停用 |
| `manager` | 业务主管 | 全部业务权限 + `system:user:*` + `system:log:view`；**不含** `system:role:manage`、`system:config:manage` | 能管人、查日志，但不能自己提权 |
| `staff` | 业务员 | 各模块 `view` + `create` + `update` + `quote:status` + `order:deliver`；**不含** `*:deactivate`、`fabric:source:manage`、全部 `system:*` | 日常干活的人 |
| `viewer` | 只读 | 全部 `view` + `dashboard:view` | 只看不写 |

自定义角色：租户内可新建，名称自定义、权限自由勾选；`code` 自动避开四个保留值；可停用、**无用户引用时才可删除**。

### 5.3 校验位置（三道）

1. **UI 层**：按返回的权限数组渲染菜单（无权限的菜单直接不显示）；无写权限时隐藏/禁用「新增、编辑、停用」等按钮 —— **仅为体验，不做安全依据**。
2. **API 层（真实防线）**：每个 route handler 用统一的 `requirePermission('code')` 包一层，缺权限返回 `403`、无会话返回 `401`；统一错误结构 `{ error: { code, message } }`。
3. **日志层**：写操作一律由服务端记 `OperationLog`（含 userId、IP），**不在前端拼日志内容**。

### 5.4 防越权硬规则

- 不能修改**自己**的角色权限组合（含通过改自己的角色实现提权）。
- 不能停用、删除**自己**；最后一个启用中的 `owner` 不可停用。
- 不能把自己的角色改成比自己权限更多的角色（例如 `manager` 不能自建一个含 `system:role:manage` 的角色并套给自己）。**实现方式：新建/编辑角色时，勾选的权限必须是「当前操作人已拥有权限」的子集。**
- 每次角色权限变更后，已登录用户的会话在下次请求时重新读取权限（不做缓存），即时生效。

---

## 6. 数据模型变更（字段表，不贴 Prisma 代码）

### 6.1 `User` 表（已存在，扩展）

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `passwordHash` | String | 是 | `scrypt$盐$摘要` 格式串 |
| `mustChangePassword` | Boolean | 否，默认 false | 下次登录必须改密 |
| `failedLoginAttempts` | Int | 否，默认 0 | 登录成功后清零 |
| `lockedUntil` | DateTime? | 否 | 锁定截止时刻 |
| `lastLoginAt` | DateTime? | 否 | |
| `lastLoginIp` | String? | 否 | |
| `roleId` | String? | 否 | 指向 `Role.id`，**替换**现有 `role` 字符串字段 |
| `passwordUpdatedAt` | DateTime? | 否 | 便于将来做密码有效期 |

`role` 字符串字段**废弃并删除**（当前用户表 0 行，无历史包袱）。 `status`、`username`、`email`、`name`、`tenantId` 保持原样。新索引：保留现有 `[tenantId]`、`[tenantId,email]`、`[tenantId,username]`，新增 `[roleId]`。

### 6.2 `Role` 表（新增）

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | cuid | 是 | |
| `tenantId` | String | 是 | 租户隔离 |
| `code` | String | 是 | 英文稳定键；四个内置值保留 |
| `name` | String | 是 | 中文名，可改 |
| `description` | String? | 否 | |
| `permissions` | String[] | 是，默认为空数组 | 权限码数组（Postgres 数组，不在 Prisma 里用 JSON） |
| `isBuiltIn` | Boolean | 否，默认 false | 内置角色：不可删除、不可改 code |
| `status` | 角色状态枚举（active / inactive） | 是，默认 active | |
| `createdAt` / `updatedAt` | DateTime | 是 | |

唯一约束：`[tenantId, code]`；索引：`[tenantId]`、`[tenantId, status]`。**不使用 `ConfigOption` 承载角色**——角色带权限与状态、且关系复杂，配置组是给下拉选项用的。

### 6.3 `UserSession` 表（新增）

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | cuid | 是 | |
| `tenantId` | String | 是 | |
| `userId` | String | 是 | 用户删除时级联删除 |
| `tokenHash` | String | 是 | Cookie 中 token 的 sha256 摘要，**不存明文** |
| `expiresAt` | DateTime | 是 | 12 小时 |
| `lastSeenAt` | DateTime | 是，默认 now | 滑动续期依据 |
| `ipAddress` | String? | 否 | 登录时 IP |
| `userAgent` | String? | 否 | |
| `createdAt` | DateTime | 是 | |

唯一约束：`[tokenHash]`；索引：`[tenantId, userId]`、`[expiresAt]`。

### 6.4 `OperationLog` 表（已存在，补充用法 + 加索引）

- 结构**不动**，补齐三个此前从不填的字段：`userId`（有了会话后必填，系统事件除外）、`ipAddress`、`detail` 中增加 `actorLabel`（操作人姓名快照，避免用户改名/停用时日志「失忆」）。
- 新增索引：`[tenantId, userId]`、`[tenantId, createdAt]` 已在，另补 `[tenantId, action]` 供日志筛选。
- 历史 69 行日志的 `userId` 为空：**保留原样**，UI 上把操作人显示为「—（历史数据）」。

### 6.5 迁移策略

- `User` 表当前 **0 行** → 新增 `passwordHash` 必填列可以直接加（无需默认值也无数据冲突）；如需稳妥，先加可空列、写数据、再收紧。
- `role` → `roleId` 属于「旧列改名 + 新增列」场景，**按既有教训必须手写 migration.sql**（`prisma migrate dev` 会 DROP 旧列）；由于用户表为空，本例直接删除 `role` 列、新增 `roleId` 列即可，仍需手写 SQL 保证双库一致。
- 迁移必须 dev + test 双库 `prisma migrate deploy` + `prisma generate`；**不改写任何已应用的 migration**。

---

## 7. API 草案

统一约定：所有响应带 `tenantId` 隔离；金额/时间以外字段尽量直出；错误体 `{ error: { code, message } }`。

### 7.1 认证

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| POST | `/api/auth/login` | 公开 | `{username, password}` → 设 Cookie + 返回精简用户/权限；失败计数与锁定在此体现（错误码统一为 `INVALID_CREDENTIALS`，不区分「用户不存在」与「密码错」，返回剩余重试次数） |
| POST | `/api/auth/logout` | 需会话 | 删会话 + 清 Cookie |
| GET | `/api/auth/session` | 需会话 | 返回 `{ mode, user:{id,name,username,avatarLabel,tenantName}, role:{code,name}, permissions:string[], mustChangePassword }`；未登录返回 401 |
| PATCH | `/api/auth/password` | 需会话 | `{currentPassword, newPassword}` 改本人密码；成功后保持当前会话登录状态，并把 `mustChangePassword` 置 false（**不踢掉自己的其他会话**） |
| GET | `/api/auth/permissions` | 需会话 | 返回 31 个权限码字典（按模块分组、含中文名），供角色编辑页渲染 |

### 7.2 用户管理

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/users` | `system:user:view` | 支持 `keyword`（用户名/姓名/邮箱）、`roleId`、`status` 筛选 + 分页 |
| POST | `/api/users` | `system:user:manage` | 新建；`username`/`email` 租户内唯一；初始密码由管理员填并置 `mustChangePassword=true` |
| GET | `/api/users/[id]` | `system:user:view` | |
| PATCH | `/api/users/[id]` | `system:user:manage` | 改姓名/邮箱/角色/状态；不能改自己（除非只改自己的姓名邮箱）；不能停用最后一个 owner |
| POST | `/api/users/[id]/reset-password` | `system:user:manage` | `{newPassword}`，置 `mustChangePassword=true`、`failedLoginAttempts=0`、清锁定 |
| PATCH | `/api/users/[id]/status` | `system:user:manage` | 停用/启用；停用后该用户全部会话立即失效 |

### 7.3 角色与权限

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/roles` | `system:role:view` | 含每个角色的人数统计（是否可删的依据） |
| POST | `/api/roles` | `system:role:manage` | 校验：勾选权限必须是操作人已拥有权限的子集；code 不得占用保留值 |
| PATCH | `/api/roles/[id]` | `system:role:manage` | 内置角色只允许改名称与描述；改权限会即时影响所有持有者 |
| DELETE | `/api/roles/[id]` | `system:role:manage` | 内置角色、仍有人引用的角色不可删 |
| GET | `/api/permissions` | `system:role:view` | 权限字典（同 `/api/auth/permissions`，供无会话限制的前端角落复用） |

### 7.4 日志

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/operation-logs` | `system:log:view` | 筛选：`from`/`to`（默认近 30 天）、`module`、`action`、`userId`、`targetType`、`targetId`、`keyword`（命中 targetId / actorLabel）；游标或分页 |
| GET | `/api/operation-logs/[id]` | `system:log:view` | 详情含完整 `detail` JSON |
| GET | `/api/operation-logs/modules` | `system:log:view` | 当前存在的 module / action 取值列表，用于下拉筛选 |

> **业务 API 改造**：现有 24 处日志写入抽成统一函数 `recordOperationLog(tx, {...})`，一次改掉 8 个文件里的重复写法；然后逐步给写操作加权限码。

---

## 8. 界面线框（静态原型，待确认后再实现）

**登录页**（未登录时全屏渲染，替换掉整个应用壳）

```
┌──────────────────────────────────────────────┐
│                面料贸易管理系统              │
│   ┌──────────────────────────────────────┐   │
│   │  用户名  [________________________]  │   │
│   │  密  码  [________________________]  │   │
│   │            [ 登  录 ]                │   │
│   │  ⚠ 用户名或密码错误，还可重试 3 次   │   │
│   └──────────────────────────────────────┘   │
│      忘记密码请联系系统管理员重置            │
└──────────────────────────────────────────────┘
```

**首次登录强制改密**：登录后若 `mustChangePassword`，弹出不可关闭的对话框，只填「新密码 / 确认新密码」。

**应用壳改造**：侧边栏底部固定当前用户区

```
│ …现有菜单…                                  │
│                                             │
│ ─────────────────────────────────────────── │
│  ◯ 张小明                                   │
│    业务主管 · Default Tenant                │
│    [修改密码]  [退出登录]                   │
└─────────────────────────────────────────────┘
```

侧边栏新增「**系统**」分组（无 `system:*` 权限时不显示）：
`用户管理` / `角色权限` / `操作日志`。

**用户列表**

```
搜索[__________]  角色[全部▾]  状态[全部▾]        [+ 新增用户]
┌────────┬──────┬───────────────┬────────┬──────────┬────────┬────────┐
│ 用户名 │ 姓名 │ 邮箱          │ 角色   │ 最近登录 │ 状态   │ 操作   │
├────────┼──────┼───────────────┼────────┼──────────┼────────┼────────┤
│ zhangxm│ 张小明│ z@cloth.com   │ 业务主管│ 09-26 09:12│ 启用 │编辑 停用│
│ lisi   │ 李四 │ l@cloth.com   │ 业务员 │ 09-25 18:40│ 停用 │编辑 启用│
└────────┴──────┴───────────────┴────────┴──────────┴────────┴────────┘
```

新增/编辑抽屉字段：用户名（新建必填，编辑不可改）、姓名、邮箱、角色（下拉）、初始/新密码（仅新建显示；编辑时在「重置密码」按钮里填）、状态。

**角色权限矩阵**（核心界面）

```
◀ 角色列表 │ 业务主管（manager）           [保存] [放弃修改]
─────────────────────────────────────────────────────────
 角色名称 [业务主管______]   说明 [________________]
 当前使用人数：2
─────────────────────────────────────────────────────────
 模块      权限                                    内置 owner 不可改
 工作台    ☑ 查看工作台
 面料库    ☑ 查看  ☑ 新增  ☑ 编辑  ☑ 管理货源报价
 供应商    ☑ 查看  ☑ 新增  ☑ 编辑  ☐ 停用
 客户      ☑ 查看  ☑ 新增  ☑ 编辑  ☐ 停用
 寄样      ☑ 查看  ☑ 新增  ☑ 编辑  ☑ 登记反馈
 报价      ☑ 查看  ☑ 新增  ☑ 编辑  ☑ 标记状态
 订单      ☑ 查看  ☑ 新增  ☑ 编辑  ☑ 登记交付
 系统      ☑ 查看用户 ☑ 管理用户  ☐ 管理角色  ☑ 查看日志  ☐ 管理配置
─────────────────────────────────────────────────────────
 超出你自身权限的项显示为禁用并标注「不可用」
```

**操作日志列表**

```
时间范围[近30天▾] 模块[全部▾] 操作人[全部▾] 动作[全部▾] 关键字[________]
┌─────────────────┬────────┬────────┬──────────┬──────────────┬──────┐
│ 时间            │ 操作人 │ 模块   │ 动作     │ 目标         │ 详情 │
├─────────────────┼────────┼────────┼──────────┼──────────────┼──────┤
│ 09-26 09:12:03  │ 张小明 │ 面料库 │ update   │ Fabric:SDD-1 │ 查看 │
│ 09-26 08:59:41  │ 系统   │ 认证   │ login    │ User:zhangxm │ 查看 │
│ 09-25 17:20:10  │ —      │ 客户   │ create   │ Customer:C9  │ 查看 │
└─────────────────┴────────┴────────┴──────────┴──────────────┴──────┘
```

详情抽屉：目标对象 + 完整 `detail` JSON + IP + User-Agent（安全类事件才显示后两者）。

---

## 9. 日志管理细则

| 项 | 规则 |
| --- | --- |
| module 取值（新增） | `auth`（登录/退出/失败/改密/越权）、`user_management`、`role_management`；原有业务模块取值不变 |
| action 取值（新增） | `login` / `logout` / `login_failed` / `password_changed` / `access_denied` / `reset_password` / `deactivate` / `activate` / `permissions_updated` |
| 必填 | `tenantId`、`module`、`action`、`createdAt`；业务写入时补 `userId`、`ipAddress`、`targetType`、`targetId`、`detail.actorLabel` |
| 谁不记 | 列表类 GET 查询不记（只记写操作与安全事件）；查看日志页面本身不产生日志 |
| 保留期 | 本期无自动清理；超过 10 万行时在列表顶部提示联系管理员清理 |

**改造要求**：把现有 24 处散落写法收敛成 `recordOperationLog()` 一个入口（先不改日志语义，只统一写法），再在此基础上补齐 userId 与 IP。

---

## 10. 兼容与切换策略（重要）

| 阶段 | `AUTH_ENABLED` | 状态 |
| --- | --- | --- |
| P1–P3 | `false` | 新表已建、服务端与 API 已好，但仍免登录；**现有 181 个测试一个都不用改** |
| P4 | `false` | 新增测试用 `loginAs(...)` helper 显式拿 Cookie 后走 API，验证鉴权链路；测试自建的角色/用户用完即清理 |
| P5 | `false` | 前端全部接好，仍免登录，浏览器回归先跑一遍 |
| P6 | `true` | 用户确认后再切换：先 bootstrap 管理员账号 → 用真实账号登录 → 浏览器回归在两种模式下各跑一遍 |

`src/server/tenant.ts` 保持可用：`getServerTenant()` 继续返回租户对象（内部改为优先取会话租户、退回环境变量租户），并**新增 `getServerActor()`** 返回 `{ tenantId, user, role, permissions }`，新代码一律用它。这样老调用点（含测试）零改动。

---

## 11. 实施阶段

| 阶段 | 内容 | 产出 |
| --- | --- | --- |
| P1 | 数据模型 + 手写迁移 + 双库 deploy + generate | `User` 扩字段、`Role`、`UserSession` 建表、日志索引补齐 |
| P2 | 服务端基础设施 | `src/server/auth/*`（密码哈希、会话、权限字典、`requirePermission`、`getServerActor`）、统一 `recordOperationLog` 收敛 24 处 |
| P3 | 认证与日志 API | `/api/auth/*`、`/api/operation-logs*`，并给现有写接口逐个加权限码 |
| P4 | 用户 / 角色 API | `/api/users*`、`/api/roles*`、`/api/permissions` |
| P5 | 前端接入 | 登录页、强制改密、壳内用户区、系统分组三个页面（用户 / 角色权限矩阵 / 日志） |
| P6 | 验收 | 测试 + 浏览器回归（两种模式下各跑一遍） |

每阶段一个独立 commit，不 amend。

---

## 12. 测试计划（预计新增 22–26 个用例）

| 面 | 用例 |
| --- | --- |
| 密码与登录 | 正确凭证拿 Cookie；错误凭证计数；连错 5 次锁定；用户名大小写不敏感；停用用户不能登录 |
| 会话 | 无会话 401；过期会话失效；登出后 Cookie 失效；会话 token 不明文库 |
| 权限 | 无权限 403；权限子集限制（不能创建比自身权限大的角色）；改自己权限被拒；最后一个 owner 不可停用 |
| 用户 | 新建重复用户名 409；停用后会话立即失效；不提供删除接口（或删接口一律 405） |
| 角色 | 内置角色不可删；有人引用的角色不可删；改权限后已登录用户下次请求即生效 |
| 日志 | 业务写入补齐 userId / IP / actorLabel；越权被拒写入 `auth/access_denied`；历史无 userId 的记录可查且显示「—」 |
| 兼容 | `AUTH_ENABLED=false` 时全部旧用例仍绿（此项体现在**不改动**现有 181 个测试） |

---

## 13. 已知限制与风险

- 上线前必须 bootstrap 出至少一个可用管理员，否则打开 `AUTH_ENABLED=true` 会把自己锁在系统外；**设计上要求 bootstrap 脚本在缺管理员时给出明确报错**，而不是静默失败。
- 同一个账号允许多会话并存，本期没有「踢掉其他会话」的 UI。
- 没有行级数据权限：只要有 `order:view`，就能看到本租户全部订单。这符合小团队协作定位，但要在验收时和用户确认是否可接受。
- `system:config:manage` 本期定义但不启用（配置组管理 UI 尚未实现）。
- 历史 69 条日志无法追溯操作人（当时没有用户体系），UI 上明确标注为「—（历史数据）」，不做伪造。

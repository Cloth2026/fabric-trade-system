import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, before, describe, test } from "node:test";
import { prisma } from "../src/lib/prisma";

// Data-model level tests for the authentication / authorization foundation.
// Everything here creates its own rows and deletes them again, so the suite
// never depends on leftover database state.

const testId = `${Date.now().toString()}-${Math.random().toString(36).slice(2, 8)}`;
const email = `auth-model-${testId}@example.test`;
const provisioningRequestId = `prov-req-${testId}`;
const throttleKeyHash = `hmac-${testId}`;

let tenantAId = "";
let tenantBId = "";

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}

function isForeignKeyConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2003"
  );
}

async function indexExists(table: string, indexName: string) {
  const rows = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT count(*)::bigint AS count
    FROM pg_indexes
    WHERE tablename = ${table} AND indexname = ${indexName}
  `;
  return Number(rows[0]?.count ?? 0) === 1;
}

async function columnExists(table: string, column: string) {
  const rows = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT count(*)::bigint AS count
    FROM information_schema.columns
    WHERE table_name = ${table} AND column_name = ${column}
  `;
  return Number(rows[0]?.count ?? 0) > 0;
}

async function tableExists(table: string) {
  const rows = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT count(*)::bigint AS count
    FROM pg_tables
    WHERE schemaname = 'public' AND lower(tablename) = lower(${table})
  `;
  return Number(rows[0]?.count ?? 0) > 0;
}

async function createUser(tenantId: string, overrides: Record<string, unknown> = {}) {
  return prisma.user.create({
    data: {
      tenantId,
      email: `auth-model-${testId}-${Math.random().toString(36).slice(2)}@example.test`,
      username: `user-${testId}-${Math.random().toString(36).slice(2)}`,
      name: "Auth Model User",
      ...overrides,
    },
  });
}

before(async () => {
  const [tenantA, tenantB] = await Promise.all([
    prisma.tenant.create({ data: { code: `auth-model-a-${testId}`, name: "Auth Model Tenant A" } }),
    prisma.tenant.create({ data: { code: `auth-model-b-${testId}`, name: "Auth Model Tenant B" } }),
  ]);
  tenantAId = tenantA.id;
  tenantBId = tenantB.id;
});

after(async () => {
  // Children first: UserRoleAssignment / Account / Session cascade from User,
  // but OperationLog and Tenant are Restrict.
  await prisma.userRoleAssignment.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
  await prisma.authLoginThrottle.deleteMany({ where: { keyHash: { startsWith: `hmac-${testId}` } } });
  await prisma.user.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
  await prisma.operationLog.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
  await prisma.tenant.deleteMany({ where: { id: { in: [tenantAId, tenantBId] } } });
});

describe("认证与权限数据模型", () => {
  test("User.email 是全局唯一的，两个不同租户不能用同一个邮箱", async () => {
    await createUser(tenantAId, { email });

    await assert.rejects(
      () => createUser(tenantBId, { email }),
      (error: unknown) => {
        assert.equal(isUniqueConstraintError(error), true, `期望 P2002，实际: ${String(error)}`);
        return true;
      },
    );

    await prisma.user.deleteMany({ where: { email } });
  });

  test("User 存在 tenantId + id 复合唯一约束（复合外键的基础）", async () => {
    assert.equal(await indexExists("User", "User_tenantId_id_key"), true);
  });

  test("新用户默认 provisioningStatus = pending", async () => {
    const user = await createUser(tenantAId);
    assert.equal(user.provisioningStatus, "pending");
    assert.equal(user.mustChangePassword, false);
    assert.equal(user.failedLoginAttempts, 0);
    assert.equal(user.emailVerified, false);
    await prisma.user.delete({ where: { id: user.id } });
  });

  test("UserRoleAssignment 不能关联其他租户的 User", async () => {
    const user = await createUser(tenantAId);

    await assert.rejects(
      () =>
        prisma.userRoleAssignment.create({
          data: { tenantId: tenantBId, userId: user.id, roleKey: "owner" },
        }),
      (error: unknown) => {
        assert.equal(isForeignKeyConstraintError(error), true, `期望 P2003，实际: ${String(error)}`);
        return true;
      },
    );

    await prisma.user.delete({ where: { id: user.id } });
  });

  test("同一用户可以拥有多个不同角色，但不能重复同一 roleKey", async () => {
    const user = await createUser(tenantAId);

    const owner = await prisma.userRoleAssignment.create({
      data: { tenantId: tenantAId, userId: user.id, roleKey: "owner", createdByUserId: null },
    });
    const sales = await prisma.userRoleAssignment.create({
      data: { tenantId: tenantAId, userId: user.id, roleKey: "sales" },
    });

    assert.equal(owner.roleKey, "owner");
    assert.equal(sales.roleKey, "sales");

    await assert.rejects(
      () =>
        prisma.userRoleAssignment.create({
          data: { tenantId: tenantAId, userId: user.id, roleKey: "owner" },
        }),
      (error: unknown) => {
        assert.equal(isUniqueConstraintError(error), true, `期望 P2002，实际: ${String(error)}`);
        return true;
      },
    );

    await prisma.userRoleAssignment.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  });

  test("provisioningRequestId 全局唯一（建号幂等的持久化依据）", async () => {
    const first = await createUser(tenantAId, { provisioningRequestId });

    await assert.rejects(
      () => createUser(tenantBId, { provisioningRequestId }),
      (error: unknown) => {
        assert.equal(isUniqueConstraintError(error), true, `期望 P2002，实际: ${String(error)}`);
        return true;
      },
    );

    await prisma.user.delete({ where: { id: first.id } });
  });

  test("AuthLoginThrottle 的 (scope, keyHash) 唯一约束生效，且同 key 不同 scope 允许共存", async () => {
    await prisma.authLoginThrottle.create({
      data: { scope: "login_ip", keyHash: throttleKeyHash, attemptCount: 1 },
    });
    await prisma.authLoginThrottle.create({
      data: { scope: "login_identifier", keyHash: throttleKeyHash, attemptCount: 1 },
    });

    await assert.rejects(
      () => prisma.authLoginThrottle.create({ data: { scope: "login_ip", keyHash: throttleKeyHash } }),
      (error: unknown) => {
        assert.equal(isUniqueConstraintError(error), true, `期望 P2002，实际: ${String(error)}`);
        return true;
      },
    );

    assert.equal(await indexExists("AuthLoginThrottle", "AuthLoginThrottle_blockedUntil_idx"), true);
    await prisma.authLoginThrottle.deleteMany({ where: { keyHash: throttleKeyHash } });
  });

  test("删除 User 会级联删除 Account 与 Session", async () => {
    const user = await createUser(tenantAId);
    await prisma.account.create({
      data: { userId: user.id, accountId: user.id, providerId: "credential", password: null },
    });
    await prisma.session.create({
      data: { userId: user.id, token: `session-token-${testId}`, expiresAt: new Date(Date.now() + 60_000) },
    });

    assert.equal(await prisma.account.count({ where: { userId: user.id } }), 1);
    assert.equal(await prisma.session.count({ where: { userId: user.id } }), 1);

    await prisma.user.delete({ where: { id: user.id } });

    assert.equal(await prisma.account.count({ where: { userId: user.id } }), 0);
    assert.equal(await prisma.session.count({ where: { userId: user.id } }), 0);
  });

  test("OperationLog 具备以 tenantId 为前缀的复合索引", async () => {
    assert.equal(await indexExists("OperationLog", "OperationLog_tenantId_createdAt_idx"), true);
    assert.equal(await indexExists("OperationLog", "OperationLog_tenantId_userId_createdAt_idx"), true);
    assert.equal(await indexExists("OperationLog", "OperationLog_tenantId_category_createdAt_idx"), true);
    assert.equal(await indexExists("OperationLog", "OperationLog_tenantId_module_createdAt_idx"), true);
    assert.equal(await indexExists("OperationLog", "OperationLog_tenantId_requestId_idx"), true);
  });

  test("OperationLog 新字段可用，且 category / result 有默认值", async () => {
    const user = await createUser(tenantAId);
    const log = await prisma.operationLog.create({
      data: {
        tenantId: tenantAId,
        userId: user.id,
        actorNameSnapshot: user.name,
        actorEmailSnapshot: user.email,
        category: "login_security",
        module: "auth",
        action: "login",
        targetLabel: user.email,
        result: "failure",
        requestId: `req-${testId}`,
        userAgent: "node:test",
      },
    });

    assert.equal(log.category, "login_security");
    assert.equal(log.result, "failure");
    assert.equal(log.actorNameSnapshot, user.name);

    await prisma.operationLog.delete({ where: { id: log.id } });
    await prisma.user.delete({ where: { id: user.id } });
  });

  test("User 不再有 role 字段，也不存在 passwordHash 字段", async () => {
    assert.equal(await columnExists("User", "role"), false);
    assert.equal(await columnExists("User", "passwordHash"), false);

    const schema = readFileSync("prisma/schema.prisma", "utf8");
    const userBlock = schema.slice(schema.indexOf("model User {"), schema.indexOf("model ConfigOption {"));
    assert.equal(/\brole\s+String/.test(userBlock), false);
    assert.equal(/passwordHash/.test(schema), false);
  });

  test("不存在 Role / Permission / RolePermission 数据表", async () => {
    assert.equal(await tableExists("Role"), false);
    assert.equal(await tableExists("Roles"), false);
    assert.equal(await tableExists("Permission"), false);
    assert.equal(await tableExists("Permissions"), false);
    assert.equal(await tableExists("RolePermission"), false);
  });

  test("Better Auth 基础设施表已建立且不带 tenantId", async () => {
    assert.equal(await tableExists("Account"), true);
    assert.equal(await tableExists("Session"), true);
    assert.equal(await tableExists("Verification"), true);
    assert.equal(await tableExists("UserRoleAssignment"), true);
    assert.equal(await tableExists("AuthLoginThrottle"), true);

    assert.equal(await columnExists("Session", "tenantId"), false);
    assert.equal(await columnExists("Verification", "tenantId"), false);
    assert.equal(await columnExists("AuthLoginThrottle", "tenantId"), false);
  });
});

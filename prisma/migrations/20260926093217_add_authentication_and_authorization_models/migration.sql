-- Precondition guard.
-- This migration DROPS "User"."role" and re-scopes the email uniqueness from
-- (tenantId, email) to (email). Both are only lossless while "User" is empty.
-- Verified before release: fabric_trade_dev = 0 rows, fabric_trade_test = 0 rows.
DO $$
BEGIN
  IF (SELECT count(*) FROM "User") > 0 THEN
    RAISE EXCEPTION
      'add_authentication_and_authorization_models requires an empty "User" table, found % row(s). Refusing to drop "User"."role".',
      (SELECT count(*) FROM "User");
  END IF;
END $$;

-- CreateEnum
CREATE TYPE "UserProvisioningStatus" AS ENUM ('pending', 'ready', 'failed');

-- CreateEnum
CREATE TYPE "RoleKey" AS ENUM ('owner', 'admin', 'sales', 'purchasing', 'merchandiser', 'viewer');

-- CreateEnum
CREATE TYPE "AuthThrottleScope" AS ENUM ('login_ip', 'login_identifier');

-- CreateEnum
CREATE TYPE "OperationLogCategory" AS ENUM ('login_security', 'user_permission', 'business');

-- CreateEnum
CREATE TYPE "OperationLogResult" AS ENUM ('success', 'failure');

-- DropIndex
DROP INDEX "User_tenantId_email_key";

-- AlterTable
-- Existing rows (69 in dev / 563 in test at release time) are all business
-- operations, so NOT NULL columns carry defaults instead of a backfill step:
-- PostgreSQL applies ADD COLUMN ... DEFAULT to every existing row, and both
-- defaults match what those historical rows actually are.
ALTER TABLE "OperationLog" ADD COLUMN     "actorEmailSnapshot" TEXT,
ADD COLUMN     "actorNameSnapshot" TEXT,
ADD COLUMN     "category" "OperationLogCategory" NOT NULL DEFAULT 'business',
ADD COLUMN     "requestId" TEXT,
ADD COLUMN     "result" "OperationLogResult" NOT NULL DEFAULT 'success',
ADD COLUMN     "targetLabel" TEXT,
ADD COLUMN     "userAgent" TEXT;

-- AlterTable
-- "role" is dropped on purpose: real roles now live in UserRoleAssignment.
-- Guarded above by the empty-"User" check.
ALTER TABLE "User" DROP COLUMN "role",
ADD COLUMN     "emailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "image" TEXT,
ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "lockedUntil" TIMESTAMP(3),
ADD COLUMN     "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "passwordChangedAt" TIMESTAMP(3),
ADD COLUMN     "provisionedAt" TIMESTAMP(3),
ADD COLUMN     "provisioningRequestId" TEXT,
ADD COLUMN     "provisioningStatus" "UserProvisioningStatus" NOT NULL DEFAULT 'pending';

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRoleAssignment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleKey" "RoleKey" NOT NULL,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserRoleAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthLoginThrottle" (
    "id" TEXT NOT NULL,
    "scope" "AuthThrottleScope" NOT NULL,
    "keyHash" TEXT NOT NULL,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "windowStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "blockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthLoginThrottle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Verification_identifier_idx" ON "Verification"("identifier");

-- CreateIndex
CREATE INDEX "UserRoleAssignment_tenantId_roleKey_idx" ON "UserRoleAssignment"("tenantId", "roleKey");

-- CreateIndex
CREATE UNIQUE INDEX "UserRoleAssignment_userId_roleKey_key" ON "UserRoleAssignment"("userId", "roleKey");

-- CreateIndex
CREATE INDEX "AuthLoginThrottle_blockedUntil_idx" ON "AuthLoginThrottle"("blockedUntil");

-- CreateIndex
CREATE INDEX "AuthLoginThrottle_scope_windowStartedAt_idx" ON "AuthLoginThrottle"("scope", "windowStartedAt");

-- CreateIndex
CREATE UNIQUE INDEX "AuthLoginThrottle_scope_keyHash_key" ON "AuthLoginThrottle"("scope", "keyHash");

-- CreateIndex
CREATE INDEX "OperationLog_tenantId_userId_createdAt_idx" ON "OperationLog"("tenantId", "userId", "createdAt");

-- CreateIndex
CREATE INDEX "OperationLog_tenantId_category_createdAt_idx" ON "OperationLog"("tenantId", "category", "createdAt");

-- CreateIndex
CREATE INDEX "OperationLog_tenantId_module_createdAt_idx" ON "OperationLog"("tenantId", "module", "createdAt");

-- CreateIndex
CREATE INDEX "OperationLog_tenantId_module_action_idx" ON "OperationLog"("tenantId", "module", "action");

-- CreateIndex
CREATE INDEX "OperationLog_tenantId_result_idx" ON "OperationLog"("tenantId", "result");

-- CreateIndex
CREATE INDEX "OperationLog_tenantId_requestId_idx" ON "OperationLog"("tenantId", "requestId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_provisioningRequestId_key" ON "User"("provisioningRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "User_tenantId_id_key" ON "User"("tenantId", "id");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRoleAssignment" ADD CONSTRAINT "UserRoleAssignment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
-- Composite foreign key: (tenantId, userId) must resolve to a single User row,
-- so a tenant can never assign a role to another tenant's user.
ALTER TABLE "UserRoleAssignment" ADD CONSTRAINT "UserRoleAssignment_tenantId_userId_fkey" FOREIGN KEY ("tenantId", "userId") REFERENCES "User"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

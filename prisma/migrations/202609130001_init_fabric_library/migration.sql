-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "FabricType" AS ENUM ('knitted', 'woven');

-- CreateEnum
CREATE TYPE "PricingUnit" AS ENUM ('kg', 'meter');

-- CreateEnum
CREATE TYPE "ConfigScope" AS ENUM ('system', 'tenant');

-- CreateEnum
CREATE TYPE "ProcessInfoStatus" AS ENUM ('none', 'pending', 'available');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "TenantStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "status" "UserStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfigOption" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "ownerKey" TEXT NOT NULL DEFAULT 'system',
    "scope" "ConfigScope" NOT NULL DEFAULT 'system',
    "group" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfigOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "contactName" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fabric" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "englishName" TEXT,
    "name" TEXT NOT NULL,
    "fabricType" "FabricType" NOT NULL,
    "pricingUnit" "PricingUnit" NOT NULL,
    "developmentSource" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'incomplete',
    "composition" TEXT NOT NULL,
    "weight" TEXT NOT NULL,
    "width" TEXT NOT NULL,
    "yarnCount" TEXT,
    "warpWeftDensity" TEXT,
    "category" TEXT,
    "structure" TEXT,
    "tags" TEXT[],
    "usageOptionKeys" TEXT[],
    "seasonOptionKeys" TEXT[],
    "certificationOptionKeys" TEXT[],
    "elasticity" TEXT,
    "supplierId" TEXT,
    "sourceContact" TEXT,
    "sourceDate" TIMESTAMP(3),
    "finishedReferencePrice" DECIMAL(12,2),
    "supplierQuote" DECIMAL(12,2),
    "minimumOrderQty" TEXT,
    "repurchaseStatus" TEXT,
    "tubeWeight" TEXT,
    "tolerance" TEXT,
    "greigeStatus" "ProcessInfoStatus" NOT NULL DEFAULT 'pending',
    "dyeingStatus" "ProcessInfoStatus" NOT NULL DEFAULT 'pending',
    "postProcessStatus" "ProcessInfoStatus" NOT NULL DEFAULT 'pending',
    "colorFastness" TEXT,
    "pilling" TEXT,
    "inspectionConclusion" TEXT,
    "handFeel" TEXT,
    "remarks" TEXT,
    "completenessPercent" INTEGER NOT NULL DEFAULT 0,
    "missingInfoFlags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Fabric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GreigeFabric" (
    "id" TEXT NOT NULL,
    "fabricId" TEXT NOT NULL,
    "supplierId" TEXT,
    "code" TEXT,
    "name" TEXT,
    "composition" TEXT,
    "weight" TEXT,
    "width" TEXT,
    "yarnOrDensity" TEXT,
    "unitPrice" DECIMAL(12,2),
    "lossRate" TEXT,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GreigeFabric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DyeingFinishing" (
    "id" TEXT NOT NULL,
    "fabricId" TEXT NOT NULL,
    "processType" TEXT,
    "factoryId" TEXT,
    "unitPrice" DECIMAL(12,2),
    "lossRate" TEXT,
    "leadTime" TEXT,
    "cautions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DyeingFinishing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostProcess" (
    "id" TEXT NOT NULL,
    "fabricId" TEXT NOT NULL,
    "processType" TEXT,
    "factoryId" TEXT,
    "effectDescription" TEXT,
    "unitPrice" DECIMAL(12,2),
    "lossRate" TEXT,
    "minimumOrderQty" TEXT,
    "leadTime" TEXT,
    "riskNotes" TEXT,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PostProcess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FabricStockInBatch" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "fabricId" TEXT NOT NULL,
    "batchNo" TEXT NOT NULL,
    "stockInSource" TEXT NOT NULL,
    "supplierId" TEXT,
    "quantity" DECIMAL(14,3) NOT NULL,
    "unit" "PricingUnit" NOT NULL,
    "unitPrice" DECIMAL(12,2),
    "totalAmount" DECIMAL(14,2),
    "vatOrLotNo" TEXT,
    "storageLocation" TEXT,
    "swatchQuantity" INTEGER NOT NULL DEFAULT 0,
    "sampleQuantity" INTEGER NOT NULL DEFAULT 0,
    "imageUrls" TEXT[],
    "isDataComplete" BOOLEAN NOT NULL DEFAULT false,
    "missingInfoFlags" TEXT[],
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FabricStockInBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperationLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "module" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "detail" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OperationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_code_key" ON "Tenant"("code");

-- CreateIndex
CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "User_tenantId_email_key" ON "User"("tenantId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "User_tenantId_username_key" ON "User"("tenantId", "username");

-- CreateIndex
CREATE INDEX "ConfigOption_tenantId_idx" ON "ConfigOption"("tenantId");

-- CreateIndex
CREATE INDEX "ConfigOption_ownerKey_idx" ON "ConfigOption"("ownerKey");

-- CreateIndex
CREATE INDEX "ConfigOption_group_enabled_idx" ON "ConfigOption"("group", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "ConfigOption_ownerKey_group_key_key" ON "ConfigOption"("ownerKey", "group", "key");

-- CreateIndex
CREATE INDEX "Supplier_tenantId_idx" ON "Supplier"("tenantId");

-- CreateIndex
CREATE INDEX "Supplier_tenantId_name_idx" ON "Supplier"("tenantId", "name");

-- CreateIndex
CREATE INDEX "Supplier_tenantId_type_idx" ON "Supplier"("tenantId", "type");

-- CreateIndex
CREATE INDEX "Fabric_tenantId_idx" ON "Fabric"("tenantId");

-- CreateIndex
CREATE INDEX "Fabric_tenantId_fabricType_idx" ON "Fabric"("tenantId", "fabricType");

-- CreateIndex
CREATE INDEX "Fabric_tenantId_developmentSource_idx" ON "Fabric"("tenantId", "developmentSource");

-- CreateIndex
CREATE INDEX "Fabric_tenantId_status_idx" ON "Fabric"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Fabric_tenantId_supplierId_idx" ON "Fabric"("tenantId", "supplierId");

-- CreateIndex
CREATE UNIQUE INDEX "Fabric_tenantId_code_key" ON "Fabric"("tenantId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "GreigeFabric_fabricId_key" ON "GreigeFabric"("fabricId");

-- CreateIndex
CREATE INDEX "GreigeFabric_supplierId_idx" ON "GreigeFabric"("supplierId");

-- CreateIndex
CREATE UNIQUE INDEX "DyeingFinishing_fabricId_key" ON "DyeingFinishing"("fabricId");

-- CreateIndex
CREATE INDEX "DyeingFinishing_factoryId_idx" ON "DyeingFinishing"("factoryId");

-- CreateIndex
CREATE INDEX "PostProcess_fabricId_idx" ON "PostProcess"("fabricId");

-- CreateIndex
CREATE INDEX "PostProcess_factoryId_idx" ON "PostProcess"("factoryId");

-- CreateIndex
CREATE INDEX "FabricStockInBatch_tenantId_idx" ON "FabricStockInBatch"("tenantId");

-- CreateIndex
CREATE INDEX "FabricStockInBatch_fabricId_idx" ON "FabricStockInBatch"("fabricId");

-- CreateIndex
CREATE INDEX "FabricStockInBatch_supplierId_idx" ON "FabricStockInBatch"("supplierId");

-- CreateIndex
CREATE UNIQUE INDEX "FabricStockInBatch_tenantId_batchNo_key" ON "FabricStockInBatch"("tenantId", "batchNo");

-- CreateIndex
CREATE INDEX "OperationLog_tenantId_idx" ON "OperationLog"("tenantId");

-- CreateIndex
CREATE INDEX "OperationLog_tenantId_module_idx" ON "OperationLog"("tenantId", "module");

-- CreateIndex
CREATE INDEX "OperationLog_tenantId_createdAt_idx" ON "OperationLog"("tenantId", "createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfigOption" ADD CONSTRAINT "ConfigOption_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fabric" ADD CONSTRAINT "Fabric_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fabric" ADD CONSTRAINT "Fabric_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GreigeFabric" ADD CONSTRAINT "GreigeFabric_fabricId_fkey" FOREIGN KEY ("fabricId") REFERENCES "Fabric"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GreigeFabric" ADD CONSTRAINT "GreigeFabric_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DyeingFinishing" ADD CONSTRAINT "DyeingFinishing_fabricId_fkey" FOREIGN KEY ("fabricId") REFERENCES "Fabric"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DyeingFinishing" ADD CONSTRAINT "DyeingFinishing_factoryId_fkey" FOREIGN KEY ("factoryId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostProcess" ADD CONSTRAINT "PostProcess_fabricId_fkey" FOREIGN KEY ("fabricId") REFERENCES "Fabric"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostProcess" ADD CONSTRAINT "PostProcess_factoryId_fkey" FOREIGN KEY ("factoryId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FabricStockInBatch" ADD CONSTRAINT "FabricStockInBatch_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FabricStockInBatch" ADD CONSTRAINT "FabricStockInBatch_fabricId_fkey" FOREIGN KEY ("fabricId") REFERENCES "Fabric"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FabricStockInBatch" ADD CONSTRAINT "FabricStockInBatch_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationLog" ADD CONSTRAINT "OperationLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationLog" ADD CONSTRAINT "OperationLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

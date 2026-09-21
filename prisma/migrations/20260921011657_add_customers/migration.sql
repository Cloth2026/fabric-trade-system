-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "level" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "country" TEXT,
    "city" TEXT,
    "address" TEXT,
    "contactName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "socialContact" TEXT,
    "mainProducts" TEXT,
    "cooperationBrands" TEXT,
    "paymentTerms" TEXT,
    "defaultCurrency" TEXT,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerContact" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "department" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "socialContact" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'active',
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerContact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Customer_tenantId_idx" ON "Customer"("tenantId");

-- CreateIndex
CREATE INDEX "Customer_tenantId_name_idx" ON "Customer"("tenantId", "name");

-- CreateIndex
CREATE INDEX "Customer_tenantId_type_idx" ON "Customer"("tenantId", "type");

-- CreateIndex
CREATE INDEX "Customer_tenantId_level_idx" ON "Customer"("tenantId", "level");

-- CreateIndex
CREATE INDEX "Customer_tenantId_status_idx" ON "Customer"("tenantId", "status");

-- CreateIndex
CREATE INDEX "CustomerContact_tenantId_idx" ON "CustomerContact"("tenantId");

-- CreateIndex
CREATE INDEX "CustomerContact_tenantId_customerId_idx" ON "CustomerContact"("tenantId", "customerId");

-- CreateIndex
CREATE INDEX "CustomerContact_tenantId_status_idx" ON "CustomerContact"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerContact_tenantId_customerId_name_key" ON "CustomerContact"("tenantId", "customerId", "name");

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerContact" ADD CONSTRAINT "CustomerContact_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerContact" ADD CONSTRAINT "CustomerContact_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

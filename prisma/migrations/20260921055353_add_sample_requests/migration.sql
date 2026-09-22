-- CreateTable
CREATE TABLE "SampleRequest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "customerId" TEXT NOT NULL,
    "contactId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'preparing',
    "sentAt" TIMESTAMP(3),
    "expectedReturnAt" TIMESTAMP(3),
    "returnedAt" TIMESTAMP(3),
    "carrier" TEXT,
    "trackingNo" TEXT,
    "receiverName" TEXT,
    "receiverPhone" TEXT,
    "receiverAddress" TEXT,
    "purpose" TEXT,
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SampleRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SampleRequestItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "fabricId" TEXT NOT NULL,
    "unit" TEXT,
    "quantity" DECIMAL(12,3),
    "colorOrRemark" TEXT,
    "feedback" TEXT,
    "feedbackResult" TEXT,
    "feedbackAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SampleRequestItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SampleRequest_tenantId_status_idx" ON "SampleRequest"("tenantId", "status");

-- CreateIndex
CREATE INDEX "SampleRequest_tenantId_customerId_idx" ON "SampleRequest"("tenantId", "customerId");

-- CreateIndex
CREATE INDEX "SampleRequest_tenantId_contactId_idx" ON "SampleRequest"("tenantId", "contactId");

-- CreateIndex
CREATE INDEX "SampleRequest_tenantId_createdAt_idx" ON "SampleRequest"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SampleRequest_tenantId_code_key" ON "SampleRequest"("tenantId", "code");

-- CreateIndex
CREATE INDEX "SampleRequestItem_tenantId_requestId_idx" ON "SampleRequestItem"("tenantId", "requestId");

-- CreateIndex
CREATE INDEX "SampleRequestItem_tenantId_fabricId_idx" ON "SampleRequestItem"("tenantId", "fabricId");

-- AddForeignKey
ALTER TABLE "SampleRequest" ADD CONSTRAINT "SampleRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SampleRequest" ADD CONSTRAINT "SampleRequest_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SampleRequest" ADD CONSTRAINT "SampleRequest_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "CustomerContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SampleRequestItem" ADD CONSTRAINT "SampleRequestItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SampleRequestItem" ADD CONSTRAINT "SampleRequestItem_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "SampleRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SampleRequestItem" ADD CONSTRAINT "SampleRequestItem_fabricId_fkey" FOREIGN KEY ("fabricId") REFERENCES "Fabric"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

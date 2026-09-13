/*
  Warnings:

  - You are about to drop the column `contactName` on the `FabricSupplier` table. All the data in the column will be lost.
  - You are about to drop the column `currency` on the `FabricSupplier` table. All the data in the column will be lost.
  - You are about to drop the column `leadTime` on the `FabricSupplier` table. All the data in the column will be lost.
  - You are about to drop the column `minimumOrderQty` on the `FabricSupplier` table. All the data in the column will be lost.
  - You are about to drop the column `pricingUnit` on the `FabricSupplier` table. All the data in the column will be lost.
  - You are about to drop the column `purchasePrice` on the `FabricSupplier` table. All the data in the column will be lost.
  - You are about to drop the column `quoteDate` on the `FabricSupplier` table. All the data in the column will be lost.
  - You are about to drop the column `fabricId` on the `FabricSupplierQuote` table. All the data in the column will be lost.
  - You are about to drop the column `supplierFabricCode` on the `FabricSupplierQuote` table. All the data in the column will be lost.
  - You are about to drop the column `supplierId` on the `FabricSupplierQuote` table. All the data in the column will be lost.
  - Made the column `purchasePrice` on table `FabricSupplierQuote` required. This step will fail if there are existing NULL values in that column.
  - Made the column `quoteDate` on table `FabricSupplierQuote` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "FabricSupplierQuote" DROP CONSTRAINT "FabricSupplierQuote_fabricId_fkey";

-- DropForeignKey
ALTER TABLE "FabricSupplierQuote" DROP CONSTRAINT "FabricSupplierQuote_supplierId_fkey";

-- DropIndex
DROP INDEX "FabricSupplierQuote_tenantId_fabricId_idx";

-- DropIndex
DROP INDEX "FabricSupplierQuote_tenantId_supplierId_idx";

-- AlterTable
ALTER TABLE "FabricSupplier" DROP COLUMN "contactName",
DROP COLUMN "currency",
DROP COLUMN "leadTime",
DROP COLUMN "minimumOrderQty",
DROP COLUMN "pricingUnit",
DROP COLUMN "purchasePrice",
DROP COLUMN "quoteDate";

-- AlterTable
ALTER TABLE "FabricSupplierQuote" DROP COLUMN "fabricId",
DROP COLUMN "supplierFabricCode",
DROP COLUMN "supplierId",
ALTER COLUMN "purchasePrice" SET NOT NULL,
ALTER COLUMN "quoteDate" SET NOT NULL,
ALTER COLUMN "quoteDate" SET DEFAULT CURRENT_TIMESTAMP;

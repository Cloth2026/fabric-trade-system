/*
  Warnings:

  - You are about to drop the column `currency` on the `CustomerQuoteItem` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "CustomerQuote" ADD COLUMN     "exchangeRate" DECIMAL(14,6) NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "CustomerQuoteItem" DROP COLUMN "currency";

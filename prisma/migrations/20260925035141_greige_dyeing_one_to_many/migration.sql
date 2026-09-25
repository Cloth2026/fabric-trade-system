-- DropIndex
DROP INDEX "DyeingFinishing_fabricId_key";

-- DropIndex
DROP INDEX "GreigeFabric_fabricId_key";

-- CreateIndex
CREATE INDEX "DyeingFinishing_fabricId_idx" ON "DyeingFinishing"("fabricId");

-- CreateIndex
CREATE INDEX "GreigeFabric_fabricId_idx" ON "GreigeFabric"("fabricId");

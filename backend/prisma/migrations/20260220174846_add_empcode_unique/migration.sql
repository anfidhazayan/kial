/*
  Warnings:

  - A unique constraint covering the columns `[empCode]` on the table `Staff` will be added. If there are existing duplicate values, this will fail.

*/
-- CleanupData: Convert empty empCode to NULL (unique allows multiple NULLs)
UPDATE "Staff" SET "empCode" = NULL WHERE "empCode" = '';

-- CreateIndex
CREATE UNIQUE INDEX "Staff_empCode_key" ON "Staff"("empCode");

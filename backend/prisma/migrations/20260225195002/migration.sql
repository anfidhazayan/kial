/*
  Warnings:

  - Changed the type of `type` on the `Certificate` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CertificateType" ADD VALUE 'KIAL_INTERNAL';
ALTER TYPE "CertificateType" ADD VALUE 'AVSEC';
ALTER TYPE "CertificateType" ADD VALUE 'POLICE_CLEARANCE';
ALTER TYPE "CertificateType" ADD VALUE 'BCAS';
ALTER TYPE "CertificateType" ADD VALUE 'OTHER';

-- AlterTable
ALTER TABLE "Certificate" ADD COLUMN     "department" TEXT,
DROP COLUMN "type",
ADD COLUMN     "type" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Entity" ADD COLUMN     "password" TEXT,
ADD COLUMN     "status" "ApprovalStatus" NOT NULL DEFAULT 'APPROVED';

-- AlterTable
ALTER TABLE "Staff" ADD COLUMN     "status" "ApprovalStatus" NOT NULL DEFAULT 'APPROVED';

-- CreateTable
CREATE TABLE "ApprovalRequest" (
    "id" SERIAL NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "payload" JSONB,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "requestedBy" INTEGER NOT NULL,
    "reviewedBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfiguredCertificateType" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "applicableTo" TEXT NOT NULL DEFAULT 'ALL',
    "department" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfiguredCertificateType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ApprovalRequest_status_idx" ON "ApprovalRequest"("status");

-- CreateIndex
CREATE INDEX "ApprovalRequest_entityType_entityId_idx" ON "ApprovalRequest"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "ConfiguredCertificateType_name_key" ON "ConfiguredCertificateType"("name");

-- CreateIndex
CREATE INDEX "ConfiguredCertificateType_applicableTo_idx" ON "ConfiguredCertificateType"("applicableTo");

-- CreateIndex
CREATE INDEX "Certificate_type_idx" ON "Certificate"("type");

-- AddForeignKey
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

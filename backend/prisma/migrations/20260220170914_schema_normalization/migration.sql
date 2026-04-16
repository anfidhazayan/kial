/*
  Warnings:

  - You are about to drop the column `aepValidFrom` on the `Staff` table. All the data in the column will be lost.
  - You are about to drop the column `aepValidTo` on the `Staff` table. All the data in the column will be lost.
  - You are about to drop the column `avsecCourses` on the `Staff` table. All the data in the column will be lost.
  - You are about to drop the column `avsecTrainingValidity` on the `Staff` table. All the data in the column will be lost.
  - You are about to drop the column `medicalFitnessValidity` on the `Staff` table. All the data in the column will be lost.
  - You are about to drop the column `pccValidity` on the `Staff` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[externalEntityCode]` on the table `Entity` will be added. If there are existing duplicate values, this will fail.
  - Changed the type of `type` on the `Certificate` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "CertificateType" AS ENUM ('AVSEC_BASIC', 'PCC', 'AEP', 'MEDICAL');

-- DropIndex
DROP INDEX "idx_staff_aep_validity";

-- DropIndex
DROP INDEX "idx_staff_avsec_validity";

-- DropIndex
DROP INDEX "idx_staff_medical_validity";

-- DropIndex
DROP INDEX "idx_staff_pcc_validity";

-- AlterTable: Add issuedDate first
ALTER TABLE "Certificate" ADD COLUMN "issuedDate" TIMESTAMP(3);

-- SafeCast: Convert existing type values to enum using a mapping
-- First, normalize any existing string values to match enum values
UPDATE "Certificate" SET "type" = 'AVSEC_BASIC' WHERE "type" IN ('AVSEC', 'AVSEC_BASIC', 'AvSec', 'avsec');
UPDATE "Certificate" SET "type" = 'PCC' WHERE "type" IN ('PCC', 'pcc', 'Police Clearance');
UPDATE "Certificate" SET "type" = 'AEP' WHERE "type" IN ('AEP', 'aep', 'Airport Entry Permit');
UPDATE "Certificate" SET "type" = 'MEDICAL' WHERE "type" IN ('MEDICAL', 'medical', 'Medical Fitness');

-- Now cast the column type safely
ALTER TABLE "Certificate" ALTER COLUMN "type" TYPE "CertificateType" USING "type"::"CertificateType";

-- Migrate data: Create Certificate records from Staff date fields before dropping them
INSERT INTO "Certificate" ("type", "validTo", "staffId", "status")
SELECT 'AVSEC_BASIC', "avsecTrainingValidity", "id", 'APPROVED'
FROM "Staff" WHERE "avsecTrainingValidity" IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO "Certificate" ("type", "validTo", "staffId", "status")
SELECT 'PCC', "pccValidity", "id", 'APPROVED'
FROM "Staff" WHERE "pccValidity" IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO "Certificate" ("type", "validFrom", "validTo", "staffId", "status")
SELECT 'AEP', "aepValidFrom", "aepValidTo", "id", 'APPROVED'
FROM "Staff" WHERE "aepValidTo" IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO "Certificate" ("type", "validTo", "staffId", "status")
SELECT 'MEDICAL', "medicalFitnessValidity", "id", 'APPROVED'
FROM "Staff" WHERE "medicalFitnessValidity" IS NOT NULL
ON CONFLICT DO NOTHING;

-- AlterTable: Entity new fields
ALTER TABLE "Entity" ADD COLUMN     "externalEntityCode" TEXT,
ADD COLUMN     "qcpValidTo" TIMESTAMP(3),
ADD COLUMN     "securityClearanceValidTo" TIMESTAMP(3),
ADD COLUMN     "securityProgramValidTo" TIMESTAMP(3);

-- AlterTable: Now safe to drop old Staff columns
ALTER TABLE "Staff" DROP COLUMN "aepValidFrom",
DROP COLUMN "aepValidTo",
DROP COLUMN "avsecCourses",
DROP COLUMN "avsecTrainingValidity",
DROP COLUMN "medicalFitnessValidity",
DROP COLUMN "pccValidity";

-- CreateIndex
CREATE INDEX "Certificate_validTo_idx" ON "Certificate"("validTo");

-- CreateIndex
CREATE INDEX "Certificate_type_idx" ON "Certificate"("type");

-- CreateIndex
CREATE UNIQUE INDEX "Entity_externalEntityCode_key" ON "Entity"("externalEntityCode");

-- CreateIndex
CREATE INDEX "EntityCertificate_validTo_idx" ON "EntityCertificate"("validTo");

-- RenameIndex
ALTER INDEX "idx_audit_log_timestamp" RENAME TO "AuditLog_timestamp_idx";

-- RenameIndex
ALTER INDEX "idx_audit_log_user" RENAME TO "AuditLog_userId_idx";

-- RenameIndex
ALTER INDEX "idx_certificate_staff" RENAME TO "Certificate_staffId_idx";

-- RenameIndex
ALTER INDEX "idx_certificate_status" RENAME TO "Certificate_status_idx";

-- RenameIndex
ALTER INDEX "idx_entity_contract_expiry" RENAME TO "Entity_contractValidTo_idx";

-- RenameIndex
ALTER INDEX "idx_entity_name" RENAME TO "Entity_name_idx";

-- RenameIndex
ALTER INDEX "idx_entity_certificate_entity" RENAME TO "EntityCertificate_entityId_idx";

-- RenameIndex
ALTER INDEX "idx_entity_certificate_status" RENAME TO "EntityCertificate_status_idx";

-- RenameIndex
ALTER INDEX "idx_staff_entity" RENAME TO "Staff_entityId_idx";

-- RenameIndex
ALTER INDEX "idx_staff_name" RENAME TO "Staff_fullName_idx";

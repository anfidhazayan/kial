-- CreateIndex: Add performance indexes for production
-- These indexes significantly improve query performance for expiry checks and common lookups

-- Certificate indexes
CREATE INDEX IF NOT EXISTS "idx_certificate_expiry" ON "Certificate"("validTo") WHERE status = 'APPROVED';
CREATE INDEX IF NOT EXISTS "idx_certificate_status" ON "Certificate"("status");
CREATE INDEX IF NOT EXISTS "idx_certificate_staff" ON "Certificate"("staffId");

-- EntityCertificate indexes
CREATE INDEX IF NOT EXISTS "idx_entity_certificate_expiry" ON "EntityCertificate"("validTo") WHERE status = 'APPROVED';
CREATE INDEX IF NOT EXISTS "idx_entity_certificate_status" ON "EntityCertificate"("status");
CREATE INDEX IF NOT EXISTS "idx_entity_certificate_entity" ON "EntityCertificate"("entityId");

-- Staff indexes for expiry checks
CREATE INDEX IF NOT EXISTS "idx_staff_avsec_validity" ON "Staff"("avsecTrainingValidity");
CREATE INDEX IF NOT EXISTS "idx_staff_pcc_validity" ON "Staff"("pccValidity");
CREATE INDEX IF NOT EXISTS "idx_staff_medical_validity" ON "Staff"("medicalFitnessValidity");
CREATE INDEX IF NOT EXISTS "idx_staff_aep_validity" ON "Staff"("aepValidTo");
CREATE INDEX IF NOT EXISTS "idx_staff_entity" ON "Staff"("entityId");
CREATE INDEX IF NOT EXISTS "idx_staff_name" ON "Staff"("fullName");

-- Entity indexes
CREATE INDEX IF NOT EXISTS "idx_entity_name" ON "Entity"("name");
CREATE INDEX IF NOT EXISTS "idx_entity_contract_expiry" ON "Entity"("contractValidTo");

-- Audit log index
CREATE INDEX IF NOT EXISTS "idx_audit_log_timestamp" ON "AuditLog"("timestamp" DESC);
CREATE INDEX IF NOT EXISTS "idx_audit_log_user" ON "AuditLog"("userId");

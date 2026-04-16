-- CreateTable
CREATE TABLE "EntityCertificate" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "validFrom" TIMESTAMP(3),
    "validTo" TIMESTAMP(3),
    "docUrl" TEXT,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'APPROVED',
    "entityId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EntityCertificate_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "EntityCertificate" ADD CONSTRAINT "EntityCertificate_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CSO', 'ENTITY_HEAD', 'STAFF');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entity" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "securityClearanceStatus" TEXT,
    "securityProgramStatus" TEXT,
    "qcpStatus" TEXT,
    "qcpSubmissionDate" TIMESTAMP(3),
    "contractValidFrom" TIMESTAMP(3),
    "contractValidTo" TIMESTAMP(3),
    "ascoUserId" INTEGER,
    "ascoName" TEXT,
    "ascoContactNo" TEXT,
    "ascoEmail" TEXT,
    "ascoTrainingValidFrom" TIMESTAMP(3),
    "ascoTrainingValidTo" TIMESTAMP(3),
    "kialPocName" TEXT,
    "kialPocNumber" TEXT,
    "kialPocEmail" TEXT,

    CONSTRAINT "Entity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Staff" (
    "id" SERIAL NOT NULL,
    "fullName" TEXT NOT NULL,
    "designation" TEXT,
    "aadhaarNumber" TEXT,
    "isKialStaff" BOOLEAN NOT NULL DEFAULT false,
    "empCode" TEXT,
    "department" TEXT,
    "dateOfSuperannuation" TIMESTAMP(3),
    "entityId" INTEGER,
    "userId" INTEGER,
    "aepNumber" TEXT,
    "aepValidFrom" TIMESTAMP(3),
    "aepValidTo" TIMESTAMP(3),
    "terminals" TEXT,
    "airportsGiven" TEXT,
    "zones" TEXT[],

    CONSTRAINT "Staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Certificate" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "validFrom" TIMESTAMP(3),
    "validTo" TIMESTAMP(3),
    "docUrl" TEXT,
    "proposedValidFrom" TIMESTAMP(3),
    "proposedValidTo" TIMESTAMP(3),
    "proposedDocUrl" TEXT,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'APPROVED',
    "staffId" INTEGER NOT NULL,

    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "action" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Entity_ascoUserId_key" ON "Entity"("ascoUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Staff_userId_key" ON "Staff"("userId");

-- AddForeignKey
ALTER TABLE "Entity" ADD CONSTRAINT "Entity_ascoUserId_fkey" FOREIGN KEY ("ascoUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

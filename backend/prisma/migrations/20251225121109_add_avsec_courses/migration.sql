-- AlterTable
ALTER TABLE "Staff" ADD COLUMN     "avsecCourses" TEXT[],
ADD COLUMN     "avsecTrainingValidity" TIMESTAMP(3),
ADD COLUMN     "medicalFitnessValidity" TIMESTAMP(3),
ADD COLUMN     "pccValidity" TIMESTAMP(3),
ADD COLUMN     "phoneNumber" TEXT;

-- CreateEnum
CREATE TYPE "TransferenceStatus" AS ENUM ('ACCEPTED', 'PENDING', 'REJECTED');

-- CreateTable
CREATE TABLE "Transference" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Credit" (
    "transference_id" UUID NOT NULL,
    "reviewer_id" UUID,
    "reviewed_date" TIMESTAMP(3) NOT NULL,
    "receipt" TEXT NOT NULL,
    "status" "TransferenceStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "Credit_pkey" PRIMARY KEY ("transference_id")
);

-- AddForeignKey
ALTER TABLE "Credit" ADD CONSTRAINT "Credit_transference_id_fkey" FOREIGN KEY ("transference_id") REFERENCES "Transference"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

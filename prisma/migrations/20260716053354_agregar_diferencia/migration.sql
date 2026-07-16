/*
  Warnings:

  - Added the required column `diferencia` to the `fillrate_records` table without a default value. This is not possible if the table is not empty.
  - Added the required column `diferencia` to the `mezcla_records` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "fillrate_records" ADD COLUMN     "diferencia" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "mezcla_records" ADD COLUMN     "diferencia" INTEGER NOT NULL;

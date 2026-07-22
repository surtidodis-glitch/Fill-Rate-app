/*
  Warnings:

  - Added the required column `anio` to the `fillrate_records` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "fillrate_records" ADD COLUMN     "anio" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "app_config" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "titulo" TEXT NOT NULL DEFAULT 'Fill Rate Analytics',

    CONSTRAINT "app_config_pkey" PRIMARY KEY ("id")
);

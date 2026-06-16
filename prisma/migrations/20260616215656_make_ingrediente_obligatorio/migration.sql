/*
  Warnings:

  - Made the column `ingrediente` on table `Producto` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Producto" ALTER COLUMN "ingrediente" SET NOT NULL;

/*
  Warnings:

  - Made the column `concentracion` on table `VarianteProducto` required. This step will fail if there are existing NULL values in that column.
  - Made the column `ranking` on table `VarianteProducto` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "VarianteProducto" ALTER COLUMN "concentracion" SET NOT NULL,
ALTER COLUMN "ranking" SET NOT NULL;

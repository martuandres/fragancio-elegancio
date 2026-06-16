/*
  Warnings:

  - Made the column `direccion_envio` on table `Comprador` required. This step will fail if there are existing NULL values in that column.
  - Made the column `telefono` on table `Comprador` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Comprador" ALTER COLUMN "direccion_envio" SET NOT NULL,
ALTER COLUMN "telefono" SET NOT NULL;

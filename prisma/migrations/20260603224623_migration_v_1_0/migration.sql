/*
  Warnings:

  - You are about to drop the column `direccion_envio` on the `Envio` table. All the data in the column will be lost.
  - You are about to drop the column `fecha_emision` on the `Pago` table. All the data in the column will be lost.
  - You are about to drop the column `total` on the `Pago` table. All the data in the column will be lost.
  - You are about to drop the column `ingredientes` on the `Producto` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Envio" DROP COLUMN "direccion_envio";

-- AlterTable
ALTER TABLE "Pago" DROP COLUMN "fecha_emision",
DROP COLUMN "total";

-- AlterTable
ALTER TABLE "Producto" DROP COLUMN "ingredientes",
ADD COLUMN     "ingrediente" TEXT;

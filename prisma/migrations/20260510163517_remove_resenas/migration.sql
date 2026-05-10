/*
  Warnings:

  - You are about to drop the column `rating_global` on the `Producto` table. All the data in the column will be lost.
  - You are about to drop the `Resena` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Resena" DROP CONSTRAINT "Resena_id_producto_fkey";

-- AlterTable
ALTER TABLE "Producto" DROP COLUMN "rating_global";

-- DropTable
DROP TABLE "Resena";

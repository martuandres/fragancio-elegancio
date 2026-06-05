/*
  Warnings:

  - You are about to drop the column `id_producto` on the `VarianteProducto` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "VarianteProducto" DROP CONSTRAINT "VarianteProducto_id_producto_fkey";

-- AlterTable
ALTER TABLE "VarianteProducto" DROP COLUMN "id_producto";

-- CreateTable
CREATE TABLE "ProductoVarianteProducto" (
    "id_variante_producto" INTEGER NOT NULL,
    "id_producto" INTEGER NOT NULL,
    "ranking" INTEGER,

    CONSTRAINT "ProductoVarianteProducto_pkey" PRIMARY KEY ("id_variante_producto","id_producto")
);

-- AddForeignKey
ALTER TABLE "ProductoVarianteProducto" ADD CONSTRAINT "ProductoVarianteProducto_id_variante_producto_fkey" FOREIGN KEY ("id_variante_producto") REFERENCES "VarianteProducto"("id_variante_producto") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductoVarianteProducto" ADD CONSTRAINT "ProductoVarianteProducto_id_producto_fkey" FOREIGN KEY ("id_producto") REFERENCES "Producto"("id_producto") ON DELETE RESTRICT ON UPDATE CASCADE;

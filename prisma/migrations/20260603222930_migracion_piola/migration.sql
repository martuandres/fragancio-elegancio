/*
  Warnings:

  - You are about to drop the column `id_usuario` on the `Carrito` table. All the data in the column will be lost.
  - You are about to drop the column `nombre` on the `Categoria` table. All the data in the column will be lost.
  - The primary key for the `Comprador` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `saldo` on the `Comprador` table. All the data in the column will be lost.
  - You are about to drop the column `id_pedido` on the `Envio` table. All the data in the column will be lost.
  - You are about to drop the column `id_pedido` on the `Factura` table. All the data in the column will be lost.
  - You are about to drop the column `id_pedido` on the `Pago` table. All the data in the column will be lost.
  - You are about to drop the column `concentracion` on the `Producto` table. All the data in the column will be lost.
  - You are about to drop the column `precio` on the `Producto` table. All the data in the column will be lost.
  - The primary key for the `ProveedorProducto` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id_usuario` on the `ProveedorProducto` table. All the data in the column will be lost.
  - You are about to drop the column `telefono` on the `Usuario` table. All the data in the column will be lost.
  - You are about to drop the column `stock` on the `VarianteProducto` table. All the data in the column will be lost.
  - The primary key for the `Vendedor` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `email_contacto` on the `Vendedor` table. All the data in the column will be lost.
  - You are about to drop the `OrdenCompra` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProductoOrden` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[id_usuario]` on the table `Comprador` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id_carrito]` on the table `Envio` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id_carrito]` on the table `Pago` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id_usuario]` on the table `Vendedor` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `legajo` to the `Carrito` table without a default value. This is not possible if the table is not empty.
  - Added the required column `legajo` to the `Comprador` table without a default value. This is not possible if the table is not empty.
  - Added the required column `id_carrito` to the `Envio` table without a default value. This is not possible if the table is not empty.
  - Added the required column `id_carrito` to the `Pago` table without a default value. This is not possible if the table is not empty.
  - Added the required column `marca` to the `ProveedorProducto` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Carrito" DROP CONSTRAINT "Carrito_id_usuario_fkey";

-- DropForeignKey
ALTER TABLE "Envio" DROP CONSTRAINT "Envio_id_pedido_fkey";

-- DropForeignKey
ALTER TABLE "OrdenCompra" DROP CONSTRAINT "OrdenCompra_id_carrito_fkey";

-- DropForeignKey
ALTER TABLE "Pago" DROP CONSTRAINT "Pago_id_pedido_fkey";

-- DropForeignKey
ALTER TABLE "ProductoOrden" DROP CONSTRAINT "ProductoOrden_id_pedido_fkey";

-- DropForeignKey
ALTER TABLE "ProductoOrden" DROP CONSTRAINT "ProductoOrden_id_producto_fkey";

-- DropForeignKey
ALTER TABLE "ProveedorProducto" DROP CONSTRAINT "ProveedorProducto_id_usuario_fkey";

-- DropIndex
DROP INDEX "Envio_id_pedido_key";

-- DropIndex
DROP INDEX "Pago_id_pedido_key";

-- DropIndex
DROP INDEX "Vendedor_legajo_key";

-- AlterTable
ALTER TABLE "Carrito" DROP COLUMN "id_usuario",
ADD COLUMN     "legajo" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Categoria" DROP COLUMN "nombre";

-- AlterTable
ALTER TABLE "Comprador" DROP CONSTRAINT "Comprador_pkey",
DROP COLUMN "saldo",
ADD COLUMN     "legajo" TEXT NOT NULL,
ADD COLUMN     "telefono" TEXT,
ADD CONSTRAINT "Comprador_pkey" PRIMARY KEY ("legajo");

-- AlterTable
ALTER TABLE "Envio" DROP COLUMN "id_pedido",
ADD COLUMN     "id_carrito" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Factura" DROP COLUMN "id_pedido";

-- AlterTable
ALTER TABLE "Pago" DROP COLUMN "id_pedido",
ADD COLUMN     "id_carrito" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Producto" DROP COLUMN "concentracion",
DROP COLUMN "precio";

-- AlterTable
ALTER TABLE "ProveedorProducto" DROP CONSTRAINT "ProveedorProducto_pkey",
DROP COLUMN "id_usuario",
ADD COLUMN     "marca" TEXT NOT NULL,
ADD CONSTRAINT "ProveedorProducto_pkey" PRIMARY KEY ("marca", "id_producto");

-- AlterTable
ALTER TABLE "Usuario" DROP COLUMN "telefono";

-- AlterTable
ALTER TABLE "VarianteProducto" DROP COLUMN "stock",
ADD COLUMN     "concentracion" TEXT;

-- AlterTable
ALTER TABLE "Vendedor" DROP CONSTRAINT "Vendedor_pkey",
DROP COLUMN "email_contacto",
ADD COLUMN     "saldo" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD CONSTRAINT "Vendedor_pkey" PRIMARY KEY ("legajo");

-- DropTable
DROP TABLE "OrdenCompra";

-- DropTable
DROP TABLE "ProductoOrden";

-- CreateTable
CREATE TABLE "Proveedor" (
    "marca" TEXT NOT NULL,
    "telefono" TEXT,
    "email_contacto" TEXT NOT NULL,

    CONSTRAINT "Proveedor_pkey" PRIMARY KEY ("marca")
);

-- CreateIndex
CREATE UNIQUE INDEX "Comprador_id_usuario_key" ON "Comprador"("id_usuario");

-- CreateIndex
CREATE UNIQUE INDEX "Envio_id_carrito_key" ON "Envio"("id_carrito");

-- CreateIndex
CREATE UNIQUE INDEX "Pago_id_carrito_key" ON "Pago"("id_carrito");

-- CreateIndex
CREATE UNIQUE INDEX "Vendedor_id_usuario_key" ON "Vendedor"("id_usuario");

-- AddForeignKey
ALTER TABLE "ProveedorProducto" ADD CONSTRAINT "ProveedorProducto_marca_fkey" FOREIGN KEY ("marca") REFERENCES "Proveedor"("marca") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Carrito" ADD CONSTRAINT "Carrito_legajo_fkey" FOREIGN KEY ("legajo") REFERENCES "Comprador"("legajo") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pago" ADD CONSTRAINT "Pago_id_carrito_fkey" FOREIGN KEY ("id_carrito") REFERENCES "Carrito"("id_carrito") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Envio" ADD CONSTRAINT "Envio_id_carrito_fkey" FOREIGN KEY ("id_carrito") REFERENCES "Carrito"("id_carrito") ON DELETE RESTRICT ON UPDATE CASCADE;

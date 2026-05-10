/*
  Warnings:

  - A unique constraint covering the columns `[nombre,marca]` on the table `Producto` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Producto" ADD COLUMN     "imagen_url" TEXT,
ADD COLUMN     "rating_global" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "Resena" (
    "id" SERIAL NOT NULL,
    "id_producto" INTEGER NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "puntuacion" INTEGER NOT NULL,
    "comentario" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Resena_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Producto_nombre_marca_key" ON "Producto"("nombre", "marca");

-- AddForeignKey
ALTER TABLE "Resena" ADD CONSTRAINT "Resena_id_producto_fkey" FOREIGN KEY ("id_producto") REFERENCES "Producto"("id_producto") ON DELETE RESTRICT ON UPDATE CASCADE;

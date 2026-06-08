-- Propuesta A: entidades independientes
-- Vendedor y Comprador dejan de heredar de Usuario.
-- Se migran datos de ProductoVarianteProducto → VarianteProducto antes de eliminar la junction.
-- Usuario tiene 1 fila que se pierde (dato de desarrollo).

-- ----------------------------------------------------------------
-- 1. Restaurar id_producto y ranking en VarianteProducto
--    migrando los datos desde ProductoVarianteProducto
-- ----------------------------------------------------------------
ALTER TABLE "VarianteProducto" ADD COLUMN "id_producto" INTEGER;
ALTER TABLE "VarianteProducto" ADD COLUMN "ranking"     INTEGER;

UPDATE "VarianteProducto" v
SET "id_producto" = pvp."id_producto",
    "ranking"     = pvp."ranking"
FROM "ProductoVarianteProducto" pvp
WHERE v."id_variante_producto" = pvp."id_variante_producto";

ALTER TABLE "VarianteProducto" ALTER COLUMN "id_producto" SET NOT NULL;

-- ----------------------------------------------------------------
-- 2. Eliminar ProductoVarianteProducto
-- ----------------------------------------------------------------
ALTER TABLE "ProductoVarianteProducto" DROP CONSTRAINT "ProductoVarianteProducto_id_variante_producto_fkey";
ALTER TABLE "ProductoVarianteProducto" DROP CONSTRAINT "ProductoVarianteProducto_id_producto_fkey";
DROP TABLE "ProductoVarianteProducto";

-- ----------------------------------------------------------------
-- 3. Agregar FK de VarianteProducto → Producto
-- ----------------------------------------------------------------
ALTER TABLE "VarianteProducto"
  ADD CONSTRAINT "VarianteProducto_id_producto_fkey"
  FOREIGN KEY ("id_producto") REFERENCES "Producto"("id_producto")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- ----------------------------------------------------------------
-- 4. Modificar Comprador: quitar id_usuario, agregar email y nombre
--    (tabla vacía — ningún dato se pierde)
-- ----------------------------------------------------------------
ALTER TABLE "Comprador" DROP CONSTRAINT "Comprador_id_usuario_fkey";
DROP INDEX "Comprador_id_usuario_key";
ALTER TABLE "Comprador" DROP COLUMN "id_usuario";
ALTER TABLE "Comprador" ADD COLUMN "email"  TEXT NOT NULL DEFAULT '';
ALTER TABLE "Comprador" ADD COLUMN "nombre" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Comprador" ALTER COLUMN "email"  DROP DEFAULT;
ALTER TABLE "Comprador" ALTER COLUMN "nombre" DROP DEFAULT;
CREATE UNIQUE INDEX "Comprador_email_key" ON "Comprador"("email");

-- ----------------------------------------------------------------
-- 5. Modificar Vendedor: quitar legajo PK e id_usuario,
--    agregar id_vendedor como nueva PK, email y nombre
--    (tabla vacía — ningún dato se pierde)
-- ----------------------------------------------------------------
ALTER TABLE "Vendedor" DROP CONSTRAINT "Vendedor_id_usuario_fkey";
DROP INDEX "Vendedor_id_usuario_key";
ALTER TABLE "Vendedor" DROP CONSTRAINT "Vendedor_pkey";
ALTER TABLE "Vendedor" DROP COLUMN "id_usuario";
ALTER TABLE "Vendedor" DROP COLUMN "legajo";
ALTER TABLE "Vendedor" ADD COLUMN "id_vendedor" SERIAL;
ALTER TABLE "Vendedor" ADD COLUMN "email"        TEXT NOT NULL DEFAULT '';
ALTER TABLE "Vendedor" ADD COLUMN "nombre"       TEXT NOT NULL DEFAULT '';
ALTER TABLE "Vendedor" ALTER COLUMN "email"  DROP DEFAULT;
ALTER TABLE "Vendedor" ALTER COLUMN "nombre" DROP DEFAULT;
ALTER TABLE "Vendedor" ADD CONSTRAINT "Vendedor_pkey" PRIMARY KEY ("id_vendedor");
CREATE UNIQUE INDEX "Vendedor_email_key" ON "Vendedor"("email");

-- ----------------------------------------------------------------
-- 6. Eliminar Usuario (1 fila de desarrollo — dato perdido)
-- ----------------------------------------------------------------
DROP TABLE "Usuario";

-- ----------------------------------------------------------------
-- 7. Crear tabla de unión VendedorProducto
-- ----------------------------------------------------------------
CREATE TABLE "VendedorProducto" (
    "id_vendedor" INTEGER NOT NULL,
    "id_producto" INTEGER NOT NULL,
    CONSTRAINT "VendedorProducto_pkey" PRIMARY KEY ("id_vendedor", "id_producto")
);

ALTER TABLE "VendedorProducto"
  ADD CONSTRAINT "VendedorProducto_id_vendedor_fkey"
  FOREIGN KEY ("id_vendedor") REFERENCES "Vendedor"("id_vendedor")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "VendedorProducto"
  ADD CONSTRAINT "VendedorProducto_id_producto_fkey"
  FOREIGN KEY ("id_producto") REFERENCES "Producto"("id_producto")
  ON DELETE RESTRICT ON UPDATE CASCADE;

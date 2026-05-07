-- CreateTable
CREATE TABLE "Usuario" (
    "id_usuario" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "contrasena" TEXT NOT NULL,
    "telefono" TEXT,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id_usuario")
);

-- CreateTable
CREATE TABLE "Comprador" (
    "id_usuario" INTEGER NOT NULL,
    "saldo" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "direccion_envio" TEXT,

    CONSTRAINT "Comprador_pkey" PRIMARY KEY ("id_usuario")
);

-- CreateTable
CREATE TABLE "Vendedor" (
    "id_usuario" INTEGER NOT NULL,
    "legajo" TEXT NOT NULL,
    "cbu" TEXT NOT NULL,
    "email_contacto" TEXT NOT NULL,
    "reputacion" DECIMAL(65,30) NOT NULL DEFAULT 0,

    CONSTRAINT "Vendedor_pkey" PRIMARY KEY ("id_usuario")
);

-- CreateTable
CREATE TABLE "Producto" (
    "id_producto" SERIAL NOT NULL,
    "marca" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "precio" DECIMAL(65,30) NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "concentracion" TEXT,
    "ingredientes" TEXT,
    "notas_salida" TEXT,
    "notas_corazon" TEXT,
    "notas_fondo" TEXT,

    CONSTRAINT "Producto_pkey" PRIMARY KEY ("id_producto")
);

-- CreateTable
CREATE TABLE "VarianteProducto" (
    "id_variante_producto" SERIAL NOT NULL,
    "id_producto" INTEGER NOT NULL,
    "volumen" DECIMAL(65,30) NOT NULL,
    "precio" DECIMAL(65,30) NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "VarianteProducto_pkey" PRIMARY KEY ("id_variante_producto")
);

-- CreateTable
CREATE TABLE "Categoria" (
    "id_categoria" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "criterio" TEXT,

    CONSTRAINT "Categoria_pkey" PRIMARY KEY ("id_categoria")
);

-- CreateTable
CREATE TABLE "ProductoCategoria" (
    "id_producto" INTEGER NOT NULL,
    "id_categoria" INTEGER NOT NULL,

    CONSTRAINT "ProductoCategoria_pkey" PRIMARY KEY ("id_producto","id_categoria")
);

-- CreateTable
CREATE TABLE "ProveedorProducto" (
    "id_usuario" INTEGER NOT NULL,
    "id_producto" INTEGER NOT NULL,

    CONSTRAINT "ProveedorProducto_pkey" PRIMARY KEY ("id_usuario","id_producto")
);

-- CreateTable
CREATE TABLE "Carrito" (
    "id_carrito" SERIAL NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "fecha_creada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" TEXT NOT NULL DEFAULT 'activo',

    CONSTRAINT "Carrito_pkey" PRIMARY KEY ("id_carrito")
);

-- CreateTable
CREATE TABLE "CarritoProducto" (
    "id_carrito" INTEGER NOT NULL,
    "id_producto" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL,

    CONSTRAINT "CarritoProducto_pkey" PRIMARY KEY ("id_carrito","id_producto")
);

-- CreateTable
CREATE TABLE "OrdenCompra" (
    "id_pedido" SERIAL NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "id_carrito" INTEGER NOT NULL,
    "fecha_creada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "importe_total" DECIMAL(65,30) NOT NULL,
    "enviado" BOOLEAN NOT NULL DEFAULT false,
    "direccion_envio" TEXT NOT NULL,

    CONSTRAINT "OrdenCompra_pkey" PRIMARY KEY ("id_pedido")
);

-- CreateTable
CREATE TABLE "ProductoOrden" (
    "id_pedido" INTEGER NOT NULL,
    "id_producto" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precio" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "ProductoOrden_pkey" PRIMARY KEY ("id_pedido","id_producto")
);

-- CreateTable
CREATE TABLE "Pago" (
    "id_pago" SERIAL NOT NULL,
    "id_pedido" INTEGER NOT NULL,
    "total" DECIMAL(65,30) NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "fecha_emision" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pago_pkey" PRIMARY KEY ("id_pago")
);

-- CreateTable
CREATE TABLE "Factura" (
    "nro_factura" TEXT NOT NULL,
    "id_pago" INTEGER NOT NULL,
    "id_pedido" INTEGER NOT NULL,
    "fecha_emision" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "importe_total" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "Factura_pkey" PRIMARY KEY ("nro_factura")
);

-- CreateTable
CREATE TABLE "Envio" (
    "id_envio" SERIAL NOT NULL,
    "id_pedido" INTEGER NOT NULL,
    "track_code" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'preparando',
    "direccion_envio" TEXT NOT NULL,

    CONSTRAINT "Envio_pkey" PRIMARY KEY ("id_envio")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Vendedor_legajo_key" ON "Vendedor"("legajo");

-- CreateIndex
CREATE UNIQUE INDEX "OrdenCompra_id_carrito_key" ON "OrdenCompra"("id_carrito");

-- CreateIndex
CREATE UNIQUE INDEX "Pago_id_pedido_key" ON "Pago"("id_pedido");

-- CreateIndex
CREATE UNIQUE INDEX "Factura_id_pago_key" ON "Factura"("id_pago");

-- CreateIndex
CREATE UNIQUE INDEX "Envio_id_pedido_key" ON "Envio"("id_pedido");

-- AddForeignKey
ALTER TABLE "Comprador" ADD CONSTRAINT "Comprador_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vendedor" ADD CONSTRAINT "Vendedor_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VarianteProducto" ADD CONSTRAINT "VarianteProducto_id_producto_fkey" FOREIGN KEY ("id_producto") REFERENCES "Producto"("id_producto") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductoCategoria" ADD CONSTRAINT "ProductoCategoria_id_producto_fkey" FOREIGN KEY ("id_producto") REFERENCES "Producto"("id_producto") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductoCategoria" ADD CONSTRAINT "ProductoCategoria_id_categoria_fkey" FOREIGN KEY ("id_categoria") REFERENCES "Categoria"("id_categoria") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProveedorProducto" ADD CONSTRAINT "ProveedorProducto_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Vendedor"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProveedorProducto" ADD CONSTRAINT "ProveedorProducto_id_producto_fkey" FOREIGN KEY ("id_producto") REFERENCES "Producto"("id_producto") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Carrito" ADD CONSTRAINT "Carrito_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Comprador"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarritoProducto" ADD CONSTRAINT "CarritoProducto_id_carrito_fkey" FOREIGN KEY ("id_carrito") REFERENCES "Carrito"("id_carrito") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarritoProducto" ADD CONSTRAINT "CarritoProducto_id_producto_fkey" FOREIGN KEY ("id_producto") REFERENCES "Producto"("id_producto") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdenCompra" ADD CONSTRAINT "OrdenCompra_id_carrito_fkey" FOREIGN KEY ("id_carrito") REFERENCES "Carrito"("id_carrito") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductoOrden" ADD CONSTRAINT "ProductoOrden_id_pedido_fkey" FOREIGN KEY ("id_pedido") REFERENCES "OrdenCompra"("id_pedido") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductoOrden" ADD CONSTRAINT "ProductoOrden_id_producto_fkey" FOREIGN KEY ("id_producto") REFERENCES "Producto"("id_producto") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pago" ADD CONSTRAINT "Pago_id_pedido_fkey" FOREIGN KEY ("id_pedido") REFERENCES "OrdenCompra"("id_pedido") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Factura" ADD CONSTRAINT "Factura_id_pago_fkey" FOREIGN KEY ("id_pago") REFERENCES "Pago"("id_pago") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Envio" ADD CONSTRAINT "Envio_id_pedido_fkey" FOREIGN KEY ("id_pedido") REFERENCES "OrdenCompra"("id_pedido") ON DELETE RESTRICT ON UPDATE CASCADE;

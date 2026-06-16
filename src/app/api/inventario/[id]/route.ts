import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";
import { NextRequest } from "next/server";
import type { Prisma } from "@/generated/prisma/client";

async function resolveVendedor() {
  const { userId } = await auth();
  if (!userId) return null;

  const clerk = await clerkClient();
  const clerkUser = await clerk.users.getUser(userId);
  const role = (clerkUser.publicMetadata as { role?: string } | undefined)?.role;
  if (role !== "vendedor" && role !== "admin") return null;

  const email = clerkUser.emailAddresses[0]?.emailAddress;
  if (!email) return null;

  const vendedor = await prisma.vendedor.findFirst({
    where: { email },
    select: { id_vendedor: true },
  });

  return vendedor ? { ...vendedor, email } : null;
}

async function resolveProductoDelVendedor(id_vendedor: number, id_producto: number) {
  return prisma.producto.findFirst({
    where: {
      id_producto,
      vendedores: { some: { id_vendedor } },
    },
    select: {
      id_producto: true,
      nombre: true,
      marca: true,
      stock: true,
      imagen_url: true,
      ingrediente: true,
      notas_salida: true,
      notas_corazon: true,
      notas_fondo: true,
      variante: {
        orderBy: { ranking: "asc" as const },
        select: { id_variante_producto: true, volumen: true, precio: true, concentracion: true, ranking: true },
      },
    },
  });
}

// GET /api/inventario/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const vendedor = await resolveVendedor();
  if (!vendedor)
    return apiError("NO_AUTENTICADO", "Autenticación requerida. Solo vendedores pueden acceder al inventario.", 401);

  const { id } = await params;
  const id_producto = parseInt(id, 10);
  if (!Number.isInteger(id_producto) || id_producto <= 0)
    return apiError("ID_INVALIDO", "El ID del producto debe ser un entero positivo.", 400);

  const producto = await resolveProductoDelVendedor(vendedor.id_vendedor, id_producto);

  if (!producto) {
    const existe = await prisma.producto.findUnique({ where: { id_producto }, select: { id_producto: true } });
    if (!existe)
      return apiError("PRODUCTO_NO_ENCONTRADO", `No existe un producto con id ${id_producto}.`, 404);
    return apiError("ACCESO_DENEGADO", "Este producto no pertenece a tu inventario.", 403);
  }

  const v = producto.variante[0];
  return Response.json({
    ...producto,
    variante: undefined,
    precio: Number(v?.precio ?? 0),
    concentracion: v?.concentracion ?? null,
    variantes: producto.variante.map((pv) => ({
      ...pv,
      precio: Number(pv.precio),
      volumen: Number(pv.volumen),
    })),
  });
}

// PUT /api/inventario/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const vendedor = await resolveVendedor();
  if (!vendedor)
    return apiError("NO_AUTENTICADO", "Autenticación requerida. Solo vendedores pueden modificar el inventario.", 401);

  const { id } = await params;
  const id_producto = parseInt(id, 10);
  if (!Number.isInteger(id_producto) || id_producto <= 0)
    return apiError("ID_INVALIDO", "El ID del producto debe ser un entero positivo.", 400);

  const existente = await resolveProductoDelVendedor(vendedor.id_vendedor, id_producto);
  if (!existente) {
    const existe = await prisma.producto.findUnique({ where: { id_producto }, select: { id_producto: true } });
    if (!existe)
      return apiError("PRODUCTO_NO_ENCONTRADO", `No existe un producto con id ${id_producto}.`, 404);
    return apiError("ACCESO_DENEGADO", "Este producto no pertenece a tu inventario.", 403);
  }

  const body = (await req.json()) as Record<string, unknown>;
  const { nombre, marca, stock, ingrediente, imagen_url, notas_salida, notas_corazon, notas_fondo } = body;

  if (nombre !== undefined && (typeof nombre !== "string" || !String(nombre).trim()))
    return apiError("CAMPO_INVALIDO", "El campo 'nombre' no puede estar vacío.", 400);
  if (marca !== undefined && (typeof marca !== "string" || !String(marca).trim()))
    return apiError("CAMPO_INVALIDO", "El campo 'marca' no puede estar vacío.", 400);
  if (ingrediente !== undefined && (!ingrediente || typeof ingrediente !== "string" || !String(ingrediente).trim()))
    return apiError("CAMPO_INVALIDO", "El campo 'ingrediente' no puede estar vacío.", 400);
  if (notas_salida !== undefined && (!notas_salida || typeof notas_salida !== "string" || !String(notas_salida).trim()))
    return apiError("CAMPO_INVALIDO", "El campo 'notas_salida' no puede estar vacío.", 400);
  if (notas_corazon !== undefined && (!notas_corazon || typeof notas_corazon !== "string" || !String(notas_corazon).trim()))
    return apiError("CAMPO_INVALIDO", "El campo 'notas_corazon' no puede estar vacío.", 400);
  if (notas_fondo !== undefined && (!notas_fondo || typeof notas_fondo !== "string" || !String(notas_fondo).trim()))
    return apiError("CAMPO_INVALIDO", "El campo 'notas_fondo' no puede estar vacío.", 400);
  if (stock !== undefined && (!Number.isInteger(Number(stock)) || Number(stock) < 0))
    return apiError("STOCK_INVALIDO", "El campo 'stock' debe ser un entero no negativo.", 400);

  try {
    const data: Prisma.ProductoUpdateInput = {};
    if (nombre !== undefined) data.nombre = String(nombre).trim();
    if (marca !== undefined) data.marca = String(marca).trim();
    if (stock !== undefined) data.stock = Number(stock);
    if (ingrediente !== undefined) data.ingrediente = String(ingrediente).trim();
    if (imagen_url !== undefined) data.imagen_url = imagen_url ? String(imagen_url) : null;
    if (notas_salida !== undefined) data.notas_salida = notas_salida ? String(notas_salida) : null;
    if (notas_corazon !== undefined) data.notas_corazon = notas_corazon ? String(notas_corazon) : null;
    if (notas_fondo !== undefined) data.notas_fondo = notas_fondo ? String(notas_fondo) : null;

    const actualizado = await prisma.producto.update({
      where: { id_producto },
      data,
      select: {
        id_producto: true,
        nombre: true,
        marca: true,
        stock: true,
        imagen_url: true,
        ingrediente: true,
        notas_salida: true,
        notas_corazon: true,
        notas_fondo: true,
      },
    });

    return Response.json(actualizado);
  } catch (err) {
    throw err;
  }
}

// DELETE /api/inventario/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const vendedor = await resolveVendedor();
  if (!vendedor)
    return apiError("NO_AUTENTICADO", "Autenticación requerida. Solo vendedores pueden eliminar productos.", 401);

  const { id } = await params;
  const id_producto = parseInt(id, 10);
  if (!Number.isInteger(id_producto) || id_producto <= 0)
    return apiError("ID_INVALIDO", "El ID del producto debe ser un entero positivo.", 400);

  const existente = await resolveProductoDelVendedor(vendedor.id_vendedor, id_producto);
  if (!existente) {
    const existe = await prisma.producto.findUnique({ where: { id_producto }, select: { id_producto: true } });
    if (!existe)
      return apiError("PRODUCTO_NO_ENCONTRADO", `No existe un producto con id ${id_producto}.`, 404);
    return apiError("ACCESO_DENEGADO", "Este producto no pertenece a tu inventario.", 403);
  }

  const otrosVendedores = await prisma.vendedorProducto.count({
    where: { id_producto, NOT: { id_vendedor: vendedor.id_vendedor } },
  });

  if (otrosVendedores > 0) {
    await prisma.vendedorProducto.delete({
      where: { id_vendedor_id_producto: { id_vendedor: vendedor.id_vendedor, id_producto } },
    });
    return new Response(null, { status: 204 });
  }

  // Es el último vendedor: limpiar carritos sin pago aprobado y borrar el producto
  await prisma.$transaction(async (tx) => {
    // Limpiar CarritoProducto de carritos sin pago aprobado
    await tx.carritoProducto.deleteMany({
      where: {
        id_producto,
        carrito: {
          pago: { is: null },
        },
      },
    });
    await tx.carritoProducto.deleteMany({
      where: {
        id_producto,
        carrito: {
          pago: { estado: { not: "aprobado" } },
        },
      },
    });

    // Si quedan CarritoProducto es porque tienen pago aprobado — preservar historial
    const conPagoAprobado = await tx.carritoProducto.count({ where: { id_producto } });

    await tx.vendedorProducto.delete({
      where: { id_vendedor_id_producto: { id_vendedor: vendedor.id_vendedor, id_producto } },
    });

    if (conPagoAprobado > 0) return; // producto queda huérfano, preserva historial

    await tx.varianteProducto.deleteMany({ where: { id_producto } });
    await tx.productoCategoria.deleteMany({ where: { id_producto } });
    await tx.proveedorProducto.deleteMany({ where: { id_producto } });
    await tx.producto.delete({ where: { id_producto } });
  });

  return new Response(null, { status: 204 });
}

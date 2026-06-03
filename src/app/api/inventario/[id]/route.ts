import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";
import { NextRequest } from "next/server";
import { Prisma } from "@/generated/prisma/client";

async function resolveVendedor() {
  const { userId, sessionClaims } = await auth();
  if (!userId) return null;

  const role = (sessionClaims?.publicMetadata as { role?: string } | undefined)?.role;
  if (role !== "vendedor") return null;

  const clerk = await clerkClient();
  const clerkUser = await clerk.users.getUser(userId);
  const email = clerkUser.emailAddresses[0]?.emailAddress;
  if (!email) return null;

  return prisma.usuario.findUnique({
    where: { email },
    select: { id_usuario: true },
  });
}

async function resolveProductoDelVendedor(vendedorId: number, productoId: number) {
  return prisma.producto.findFirst({
    where: {
      id_producto: productoId,
      proveedores: { some: { id_usuario: vendedorId } },
    },
    select: {
      id_producto: true,
      nombre: true,
      marca: true,
      precio: true,
      stock: true,
      concentracion: true,
      imagen_url: true,
      ingredientes: true,
      notas_salida: true,
      notas_corazon: true,
      notas_fondo: true,
      variantes: {
        select: { id_variante_producto: true, volumen: true, precio: true, stock: true },
      },
    },
  });
}

// GET /api/inventario/[id] — obtener un producto específico del inventario del vendedor
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

  const producto = await resolveProductoDelVendedor(vendedor.id_usuario, id_producto);

  if (!producto) {
    const existe = await prisma.producto.findUnique({ where: { id_producto }, select: { id_producto: true } });
    if (!existe)
      return apiError("PRODUCTO_NO_ENCONTRADO", `No existe un producto con id ${id_producto}.`, 404);
    return apiError("ACCESO_DENEGADO", "Este producto no pertenece a tu inventario.", 403);
  }

  return Response.json(producto);
}

// PUT /api/inventario/[id] — actualizar un producto del inventario del vendedor
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

  const existente = await resolveProductoDelVendedor(vendedor.id_usuario, id_producto);
  if (!existente) {
    const existe = await prisma.producto.findUnique({ where: { id_producto }, select: { id_producto: true } });
    if (!existe)
      return apiError("PRODUCTO_NO_ENCONTRADO", `No existe un producto con id ${id_producto}.`, 404);
    return apiError("ACCESO_DENEGADO", "Este producto no pertenece a tu inventario.", 403);
  }

  const body = (await req.json()) as Record<string, unknown>;
  const { nombre, marca, precio, stock, concentracion, ingredientes, imagen_url, notas_salida, notas_corazon, notas_fondo } = body;

  if (nombre !== undefined && (typeof nombre !== "string" || !String(nombre).trim()))
    return apiError("CAMPO_INVALIDO", "El campo 'nombre' no puede estar vacío.", 400);
  if (marca !== undefined && (typeof marca !== "string" || !String(marca).trim()))
    return apiError("CAMPO_INVALIDO", "El campo 'marca' no puede estar vacío.", 400);
  if (precio !== undefined && (isNaN(Number(precio)) || Number(precio) < 0))
    return apiError("PRECIO_INVALIDO", "El campo 'precio' debe ser un número mayor o igual a cero.", 400);
  if (stock !== undefined && (!Number.isInteger(Number(stock)) || Number(stock) < 0))
    return apiError("STOCK_INVALIDO", "El campo 'stock' debe ser un entero no negativo.", 400);

  try {
    const actualizado = await prisma.producto.update({
      where: { id_producto },
      data: {
        ...(nombre !== undefined && { nombre: String(nombre).trim() }),
        ...(marca !== undefined && { marca: String(marca).trim() }),
        ...(precio !== undefined && { precio: Number(precio) }),
        ...(stock !== undefined && { stock: Number(stock) }),
        ...(concentracion !== undefined && { concentracion: concentracion ? String(concentracion) : null }),
        ...(ingredientes !== undefined && { ingredientes: ingredientes ? String(ingredientes) : null }),
        ...(imagen_url !== undefined && { imagen_url: imagen_url ? String(imagen_url) : null }),
        ...(notas_salida !== undefined && { notas_salida: notas_salida ? String(notas_salida) : null }),
        ...(notas_corazon !== undefined && { notas_corazon: notas_corazon ? String(notas_corazon) : null }),
        ...(notas_fondo !== undefined && { notas_fondo: notas_fondo ? String(notas_fondo) : null }),
      },
      select: {
        id_producto: true,
        nombre: true,
        marca: true,
        precio: true,
        stock: true,
        concentracion: true,
        imagen_url: true,
        ingredientes: true,
        notas_salida: true,
        notas_corazon: true,
        notas_fondo: true,
      },
    });

    return Response.json(actualizado);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")
      return apiError("PRODUCTO_DUPLICADO", "Ya existe otro producto con ese nombre y marca.", 409);
    throw err;
  }
}

// DELETE /api/inventario/[id] — desvincular un producto del inventario del vendedor
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

  const existente = await resolveProductoDelVendedor(vendedor.id_usuario, id_producto);
  if (!existente) {
    const existe = await prisma.producto.findUnique({ where: { id_producto }, select: { id_producto: true } });
    if (!existe)
      return apiError("PRODUCTO_NO_ENCONTRADO", `No existe un producto con id ${id_producto}.`, 404);
    return apiError("ACCESO_DENEGADO", "Este producto no pertenece a tu inventario.", 403);
  }

  await prisma.proveedorProducto.delete({
    where: { id_usuario_id_producto: { id_usuario: vendedor.id_usuario, id_producto } },
  });

  return new Response(null, { status: 204 });
}

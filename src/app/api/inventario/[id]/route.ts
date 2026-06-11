import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";
import { NextRequest } from "next/server";
import { Prisma } from "@/generated/prisma/client";

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
  if (stock !== undefined && (!Number.isInteger(Number(stock)) || Number(stock) < 0))
    return apiError("STOCK_INVALIDO", "El campo 'stock' debe ser un entero no negativo.", 400);

  try {
    const actualizado = await prisma.producto.update({
      where: { id_producto },
      data: {
        ...(nombre !== undefined && { nombre: String(nombre).trim() }),
        ...(marca !== undefined && { marca: String(marca).trim() }),
        ...(stock !== undefined && { stock: Number(stock) }),
        ...(ingrediente !== undefined && { ingrediente: ingrediente ? String(ingrediente) : null }),
        ...(imagen_url !== undefined && { imagen_url: imagen_url ? String(imagen_url) : null }),
        ...(notas_salida !== undefined && { notas_salida: notas_salida ? String(notas_salida) : null }),
        ...(notas_corazon !== undefined && { notas_corazon: notas_corazon ? String(notas_corazon) : null }),
        ...(notas_fondo !== undefined && { notas_fondo: notas_fondo ? String(notas_fondo) : null }),
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
      },
    });

    return Response.json(actualizado);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")
      return apiError("PRODUCTO_DUPLICADO", "Ya existe otro producto con ese nombre y marca.", 409);
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

  await prisma.vendedorProducto.delete({
    where: { id_vendedor_id_producto: { id_vendedor: vendedor.id_vendedor, id_producto } },
  });

  return new Response(null, { status: 204 });
}

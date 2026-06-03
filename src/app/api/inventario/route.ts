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

// GET /api/inventario — listar productos del vendedor autenticado (paginado)
export async function GET(req: NextRequest) {
  const vendedor = await resolveVendedor();
  if (!vendedor)
    return apiError("NO_AUTENTICADO", "Autenticación requerida. Solo vendedores pueden acceder al inventario.", 401);

  const { searchParams } = req.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const skip = (page - 1) * limit;

  const where = { proveedores: { some: { id_usuario: vendedor.id_usuario } } };

  const [productos, total] = await Promise.all([
    prisma.producto.findMany({
      where,
      skip,
      take: limit,
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
      orderBy: { id_producto: "asc" },
    }),
    prisma.producto.count({ where }),
  ]);

  return Response.json({
    data: productos,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

// POST /api/inventario — crear un nuevo producto en el inventario del vendedor
export async function POST(req: NextRequest) {
  const vendedor = await resolveVendedor();
  if (!vendedor)
    return apiError("NO_AUTENTICADO", "Autenticación requerida. Solo vendedores pueden crear productos.", 401);

  const body = (await req.json()) as Record<string, unknown>;
  const { nombre, marca, precio, stock, concentracion, ingredientes, imagen_url, notas_salida, notas_corazon, notas_fondo } = body;

  if (!nombre || typeof nombre !== "string" || !nombre.trim())
    return apiError("CAMPO_REQUERIDO", "El campo 'nombre' es obligatorio.", 400);
  if (!marca || typeof marca !== "string" || !marca.trim())
    return apiError("CAMPO_REQUERIDO", "El campo 'marca' es obligatorio.", 400);
  if (precio === undefined || isNaN(Number(precio)) || Number(precio) < 0)
    return apiError("PRECIO_INVALIDO", "El campo 'precio' debe ser un número mayor o igual a cero.", 400);
  if (stock !== undefined && (!Number.isInteger(Number(stock)) || Number(stock) < 0))
    return apiError("STOCK_INVALIDO", "El campo 'stock' debe ser un entero no negativo.", 400);

  try {
    const producto = await prisma.producto.create({
      data: {
        nombre: String(nombre).trim(),
        marca: String(marca).trim(),
        precio: Number(precio),
        stock: stock !== undefined ? Number(stock) : 0,
        concentracion: concentracion ? String(concentracion) : null,
        ingredientes: ingredientes ? String(ingredientes) : null,
        imagen_url: imagen_url ? String(imagen_url) : null,
        notas_salida: notas_salida ? String(notas_salida) : null,
        notas_corazon: notas_corazon ? String(notas_corazon) : null,
        notas_fondo: notas_fondo ? String(notas_fondo) : null,
        proveedores: { create: { id_usuario: vendedor.id_usuario } },
      },
      select: { id_producto: true, nombre: true, marca: true },
    });

    return Response.json(producto, {
      status: 201,
      headers: { Location: `/api/inventario/${producto.id_producto}` },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")
      return apiError(
        "PRODUCTO_DUPLICADO",
        "Ya existe un producto con ese nombre y marca.",
        409
      );
    throw err;
  }
}

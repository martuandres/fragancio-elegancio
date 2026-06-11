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

const VARIANTE_SELECT = {
  take: 1,
  orderBy: { ranking: "asc" as const },
  select: { id_variante_producto: true, volumen: true, precio: true, concentracion: true },
} as const;

// GET /api/inventario — listar productos del vendedor autenticado (paginado)
export async function GET(req: NextRequest) {
  const vendedor = await resolveVendedor();
  if (!vendedor)
    return apiError("NO_AUTENTICADO", "Autenticación requerida. Solo vendedores pueden acceder al inventario.", 401);

  const { searchParams } = req.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const skip = (page - 1) * limit;

  const where = { vendedores: { some: { id_vendedor: vendedor.id_vendedor } } };

  const [raw, total] = await Promise.all([
    prisma.producto.findMany({
      where,
      skip,
      take: limit,
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
        variante: VARIANTE_SELECT,
      },
      orderBy: { id_producto: "asc" },
    }),
    prisma.producto.count({ where }),
  ]);

  const productos = raw.map((p) => {
    const v = p.variante[0];
    return {
      ...p,
      variante: undefined,
      precio: Number(v?.precio ?? 0),
      concentracion: v?.concentracion ?? null,
    };
  });

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
  const { nombre, marca, stock, ingrediente, imagen_url, notas_salida, notas_corazon, notas_fondo } = body;

  if (!nombre || typeof nombre !== "string" || !nombre.trim())
    return apiError("CAMPO_REQUERIDO", "El campo 'nombre' es obligatorio.", 400);
  if (!marca || typeof marca !== "string" || !marca.trim())
    return apiError("CAMPO_REQUERIDO", "El campo 'marca' es obligatorio.", 400);
  if (stock !== undefined && (!Number.isInteger(Number(stock)) || Number(stock) < 0))
    return apiError("STOCK_INVALIDO", "El campo 'stock' debe ser un entero no negativo.", 400);

  try {
    const producto = await prisma.producto.create({
      data: {
        nombre: String(nombre).trim(),
        marca: String(marca).trim(),
        stock: stock !== undefined ? Number(stock) : 0,
        ingrediente: ingrediente ? String(ingrediente) : null,
        imagen_url: imagen_url ? String(imagen_url) : null,
        notas_salida: notas_salida ? String(notas_salida) : null,
        notas_corazon: notas_corazon ? String(notas_corazon) : null,
        notas_fondo: notas_fondo ? String(notas_fondo) : null,
        vendedores: { create: { id_vendedor: vendedor.id_vendedor } },
      },
      select: { id_producto: true, nombre: true, marca: true },
    });

    return Response.json(producto, {
      status: 201,
      headers: { Location: `/api/inventario/${producto.id_producto}` },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")
      return apiError("PRODUCTO_DUPLICADO", "Ya existe un producto con ese nombre y marca.", 409);
    throw err;
  }
}

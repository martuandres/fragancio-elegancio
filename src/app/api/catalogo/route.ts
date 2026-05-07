import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q")?.trim() || undefined;
  const categoriaId = searchParams.get("categoria");
  const notas = searchParams.get("notas")?.trim() || undefined;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const skip = (page - 1) * limit;

  const where = {
    stock: { gt: 0 },
    ...(q && {
      OR: [
        { nombre: { contains: q, mode: "insensitive" as const } },
        { marca: { contains: q, mode: "insensitive" as const } },
      ],
    }),
    ...(categoriaId && {
      categorias: { some: { id_categoria: parseInt(categoriaId, 10) } },
    }),
    ...(notas && {
      OR: [
        { notas_salida: { contains: notas, mode: "insensitive" as const } },
        { notas_corazon: { contains: notas, mode: "insensitive" as const } },
        { notas_fondo: { contains: notas, mode: "insensitive" as const } },
      ],
    }),
  };

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
        notas_salida: true,
        notas_corazon: true,
        notas_fondo: true,
        categorias: {
          select: { categoria: { select: { id_categoria: true, nombre: true } } },
        },
        variantes: {
          select: {
            id_variante_producto: true,
            volumen: true,
            precio: true,
            stock: true,
          },
        },
      },
      orderBy: { id_producto: "asc" },
    }),
    prisma.producto.count({ where }),
  ]);

  return Response.json({ productos, total, page, limit });
}

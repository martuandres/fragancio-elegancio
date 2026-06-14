import { prisma } from "@/lib/prisma";
import { getBestsellerIds } from "@/lib/bestsellers";
import { NextRequest } from "next/server";

// GET /api/catalogo — listado paginado de productos con stock > 0
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
        { notas_salida:  { contains: notas, mode: "insensitive" as const } },
        { notas_corazon: { contains: notas, mode: "insensitive" as const } },
        { notas_fondo:   { contains: notas, mode: "insensitive" as const } },
      ],
    }),
  };

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
        notas_salida: true,
        notas_corazon: true,
        notas_fondo: true,
        categorias: {
          select: { categoria: { select: { id_categoria: true, criterio: true } } },
        },
        variante: {
          orderBy: { ranking: "asc" as const },
          select: { id_variante_producto: true, volumen: true, precio: true, concentracion: true, ranking: true },
        },
      },
      orderBy: { id_producto: "asc" },
    }),
    prisma.producto.count({ where }),
  ]);

  const productos = raw.map((p) => ({
    id_producto: p.id_producto,
    nombre: p.nombre,
    marca: p.marca,
    stock: p.stock,
    imagen_url: p.imagen_url,
    notas_salida: p.notas_salida,
    notas_corazon: p.notas_corazon,
    notas_fondo: p.notas_fondo,
    categorias: p.categorias.map((c) => c.categoria),
    variantes: p.variante.map((v) => ({
      ...v,
      precio: Number(v.precio),
      volumen: Number(v.volumen),
    })),
  }));

  if (total === 0 && (q || notas)) {
    const ids = await getBestsellerIds(6);
    const order = new Map(ids.map((id, i) => [id, i]));
    const sugRaw = await prisma.producto.findMany({
      where: { id_producto: { in: ids }, stock: { gt: 0 } },
      select: {
        id_producto: true,
        nombre: true,
        marca: true,
        stock: true,
        imagen_url: true,
        notas_salida: true,
        notas_corazon: true,
        notas_fondo: true,
        categorias: {
          select: { categoria: { select: { id_categoria: true, criterio: true } } },
        },
        variante: {
          orderBy: { ranking: "asc" as const },
          select: { id_variante_producto: true, volumen: true, precio: true, concentracion: true, ranking: true },
        },
      },
    });
    sugRaw.sort((a, b) => (order.get(a.id_producto) ?? 999) - (order.get(b.id_producto) ?? 999));
    const sugerencias = sugRaw.map((p) => ({
      id_producto: p.id_producto,
      nombre: p.nombre,
      marca: p.marca,
      stock: p.stock,
      imagen_url: p.imagen_url,
      notas_salida: p.notas_salida,
      notas_corazon: p.notas_corazon,
      notas_fondo: p.notas_fondo,
      categorias: p.categorias.map((c) => c.categoria),
      variantes: p.variante.map((v) => ({
        ...v,
        precio: Number(v.precio),
        volumen: Number(v.volumen),
      })),
    }));

    return Response.json({
      data: [],
      pagination: { page, limit, total: 0, totalPages: 0 },
      sugerencias,
    });
  }

  return Response.json({
    data: productos,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

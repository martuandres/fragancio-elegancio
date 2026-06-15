import { prisma } from "./prisma";
import { getBestsellerIds } from "./bestsellers";

function tokenize(text: string | null): Set<string> {
  if (!text) return new Set();
  return new Set(
    text.toLowerCase().split(/[,\s]+/).map((t) => t.trim()).filter(Boolean)
  );
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  const intersection = new Set([...a].filter((x) => b.has(x)));
  const union = new Set([...a, ...b]);
  return intersection.size / union.size;
}

type NotasPerfil = {
  notas_salida: Set<string>;
  notas_corazon: Set<string>;
  notas_fondo: Set<string>;
  ingrediente: Set<string>;
};

async function getHistorialPerfil(legajo: string): Promise<NotasPerfil | null> {
  const approvedCarritoIds = (
    await prisma.pago.findMany({
      where: { estado: "aprobado", carrito: { legajo } },
      select: { id_carrito: true },
    })
  ).map((p) => p.id_carrito);

  if (approvedCarritoIds.length === 0) return null;

  const items = await prisma.carritoProducto.findMany({
    where: { id_carrito: { in: approvedCarritoIds } },
    select: {
      producto: {
        select: {
          notas_salida: true,
          notas_corazon: true,
          notas_fondo: true,
          ingrediente: true,
        },
      },
    },
  });

  if (items.length === 0) return null;

  const perfil: NotasPerfil = {
    notas_salida: new Set(),
    notas_corazon: new Set(),
    notas_fondo: new Set(),
    ingrediente: new Set(),
  };

  for (const item of items) {
    for (const t of tokenize(item.producto.notas_salida)) perfil.notas_salida.add(t);
    for (const t of tokenize(item.producto.notas_corazon)) perfil.notas_corazon.add(t);
    for (const t of tokenize(item.producto.notas_fondo)) perfil.notas_fondo.add(t);
    for (const t of tokenize(item.producto.ingrediente)) perfil.ingrediente.add(t);
  }

  return perfil;
}

function scoreProducto(
  p: { notas_salida: string | null; notas_corazon: string | null; notas_fondo: string | null; ingrediente: string | null },
  referencia: NotasPerfil,
): number {
  return (
    jaccardSimilarity(referencia.notas_salida,  tokenize(p.notas_salida))  * 0.3 +
    jaccardSimilarity(referencia.notas_corazon, tokenize(p.notas_corazon)) * 0.4 +
    jaccardSimilarity(referencia.notas_fondo,   tokenize(p.notas_fondo))   * 0.2 +
    jaccardSimilarity(referencia.ingrediente,   tokenize(p.ingrediente))   * 0.1
  );
}

const SCORE_THRESHOLD = 0.1;

export async function getRecomendaciones(id_producto: number, limit = 6, legajo?: string) {
  const [base, perfil] = await Promise.all([
    prisma.producto.findUnique({
      where: { id_producto },
      select: { notas_salida: true, notas_corazon: true, notas_fondo: true, ingrediente: true },
    }),
    legajo ? getHistorialPerfil(legajo) : Promise.resolve(null),
  ]);

  if (!base) return [];

  const basePerfil: NotasPerfil = {
    notas_salida:  tokenize(base.notas_salida),
    notas_corazon: tokenize(base.notas_corazon),
    notas_fondo:   tokenize(base.notas_fondo),
    ingrediente:   tokenize(base.ingrediente),
  };

  const todos = await prisma.producto.findMany({
    where: { id_producto: { not: id_producto }, stock: { gt: 0 } },
    select: {
      id_producto: true,
      nombre: true,
      marca: true,
      imagen_url: true,
      notas_salida: true,
      notas_corazon: true,
      notas_fondo: true,
      ingrediente: true,
      variante: {
        take: 1,
        orderBy: { ranking: "asc" as const },
        select: { precio: true, concentracion: true },
      },
    },
  });

  const scored = todos.map((p) => {
    const baseScore = scoreProducto(p, basePerfil);
    const score = perfil
      ? baseScore * 0.6 + scoreProducto(p, perfil) * 0.4
      : baseScore;
    const v = p.variante[0];
    return {
      id_producto: p.id_producto,
      nombre: p.nombre,
      marca: p.marca,
      imagen_url: p.imagen_url,
      precio: Number(v?.precio ?? 0),
      concentracion: v?.concentracion ?? null,
      notas_salida: p.notas_salida,
      notas_corazon: p.notas_corazon,
      notas_fondo: p.notas_fondo,
      score,
    };
  });

  const sorted = scored.sort((a, b) => b.score - a.score);

  if (sorted.length === 0 || sorted[0].score < SCORE_THRESHOLD) {
    const ids = (await getBestsellerIds(limit + 1)).filter((id) => id !== id_producto).slice(0, limit);
    if (ids.length === 0) return [];
    const order = new Map(ids.map((id, i) => [id, i]));
    const bsRaw = await prisma.producto.findMany({
      where: { id_producto: { in: ids }, stock: { gt: 0 } },
      select: {
        id_producto: true,
        nombre: true,
        marca: true,
        imagen_url: true,
        notas_salida: true,
        notas_corazon: true,
        notas_fondo: true,
        variante: {
          take: 1,
          orderBy: { ranking: "asc" as const },
          select: { precio: true, concentracion: true },
        },
      },
    });
    bsRaw.sort((a, b) => (order.get(a.id_producto) ?? 999) - (order.get(b.id_producto) ?? 999));
    return bsRaw.map((p) => {
      const v = p.variante[0];
      return {
        id_producto: p.id_producto,
        nombre: p.nombre,
        marca: p.marca,
        imagen_url: p.imagen_url,
        precio: Number(v?.precio ?? 0),
        concentracion: v?.concentracion ?? null,
        notas_salida: p.notas_salida,
        notas_corazon: p.notas_corazon,
        notas_fondo: p.notas_fondo,
      };
    });
  }

  return sorted
    .slice(0, limit)
    .map(({ score: _score, ...p }) => p);
}

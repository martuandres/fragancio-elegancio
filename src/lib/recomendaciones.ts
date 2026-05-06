import { prisma } from "./prisma";

function tokenize(text: string | null): Set<string> {
  if (!text) return new Set();
  return new Set(
    text
      .toLowerCase()
      .split(/[,\s]+/)
      .map((t) => t.trim())
      .filter(Boolean)
  );
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  const intersection = new Set([...a].filter((x) => b.has(x)));
  const union = new Set([...a, ...b]);
  return intersection.size / union.size;
}

/**
 * Returns up to `limit` products most similar to the given product,
 * ranked by Jaccard similarity across olfactory notes and ingredients.
 */
export async function getRecomendaciones(id_producto: number, limit = 6) {
  const base = await prisma.producto.findUnique({
    where: { id_producto },
    select: {
      notas_salida: true,
      notas_corazon: true,
      notas_fondo: true,
      ingredientes: true,
    },
  });

  if (!base) return [];

  const todos = await prisma.producto.findMany({
    where: { id_producto: { not: id_producto }, stock: { gt: 0 } },
    select: {
      id_producto: true,
      nombre: true,
      marca: true,
      precio: true,
      concentracion: true,
      notas_salida: true,
      notas_corazon: true,
      notas_fondo: true,
      ingredientes: true,
    },
  });

  const scored = todos.map((p) => {
    const score =
      jaccardSimilarity(tokenize(base.notas_salida), tokenize(p.notas_salida)) * 0.3 +
      jaccardSimilarity(tokenize(base.notas_corazon), tokenize(p.notas_corazon)) * 0.4 +
      jaccardSimilarity(tokenize(base.notas_fondo), tokenize(p.notas_fondo)) * 0.2 +
      jaccardSimilarity(tokenize(base.ingredientes), tokenize(p.ingredientes)) * 0.1;
    return { ...p, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ score: _score, ...p }) => p);
}

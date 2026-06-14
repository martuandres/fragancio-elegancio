import { prisma } from "./prisma";

export async function getBestsellerIds(limit = 6): Promise<number[]> {
  const approvedCarritoIds = (
    await prisma.pago.findMany({
      where: { estado: "aprobado" },
      select: { id_carrito: true },
    })
  ).map((p) => p.id_carrito);

  let ranked: number[] = [];

  if (approvedCarritoIds.length > 0) {
    const counts = await prisma.carritoProducto.groupBy({
      by: ["id_producto"],
      _count: { id_producto: true },
      where: { id_carrito: { in: approvedCarritoIds } },
      orderBy: { _count: { id_producto: "desc" } },
    });
    ranked = counts.map((c) => c.id_producto);
  }

  // Fetch extra candidates to absorb brand-deduplication losses
  const headroom = limit * 4;
  const candidates = await prisma.producto.findMany({
    where: {
      stock: { gt: 0 },
      ...(ranked.length > 0 ? { id_producto: { in: ranked.slice(0, headroom) } } : {}),
    },
    take: ranked.length > 0 ? undefined : headroom,
    select: { id_producto: true, marca: true },
    orderBy: { id_producto: "asc" },
  });

  // Restore sales-rank order (findMany doesn't preserve IN ordering)
  if (ranked.length > 0) {
    const order = new Map(ranked.map((id, i) => [id, i]));
    candidates.sort(
      (a, b) => (order.get(a.id_producto) ?? 999) - (order.get(b.id_producto) ?? 999)
    );
  }

  // One product per brand
  const seen = new Set<string>();
  const result: number[] = [];
  for (const p of candidates) {
    if (!seen.has(p.marca)) {
      seen.add(p.marca);
      result.push(p.id_producto);
    }
    if (result.length >= limit) break;
  }

  return result;
}

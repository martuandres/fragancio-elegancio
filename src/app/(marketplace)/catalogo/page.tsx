import { Suspense } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { Droplets, ShoppingBag, User } from "lucide-react";
import { CategoryPills } from "./_components/CategoryPills";
import { ArmarPerfumeSection, type ProductoBase } from "./_components/ArmarPerfumeSection";
import { getBestsellerIds } from "@/lib/bestsellers";

const KEYWORDS: Record<string, string[]> = {
  Floral:    ["Rose", "Jasmine", "Violet", "Iris", "Geranium", "Peony", "Lily", "Tuberose"],
  Amaderado: ["Cedar", "Sandalwood", "Vetiver", "Oud", "Patchouli", "Woody"],
  Oriental:  ["Amber", "Vanilla", "Benzoin", "Incense", "Myrrh", "Musk"],
  Cítrico:   ["Lemon", "Bergamot", "Orange", "Mandarin", "Grapefruit", "Lime"],
  Acuático:  ["Marine", "Seaweed", "Aquatic", "Ozonic", "Water"],
  Gourmand:  ["Vanilla", "Coffee", "Caramel", "Almond", "Praline", "Chocolate"],
  Chipre:    ["Oakmoss", "Labdanum", "Bergamot", "Patchouli", "Cistus"],
  Fougère:   ["Lavender", "Tonka Bean", "Oakmoss", "Coumarin", "Fern"],
};

const SELECT = {
  id_producto: true,
  nombre: true,
  marca: true,
  stock: true,
  imagen_url: true,
  notas_salida: true,
  notas_corazon: true,
  notas_fondo: true,
  variante: {
    take: 1,
    orderBy: { ranking: "asc" as const },
    select: { precio: true, concentracion: true },
  },
} as const;

function toProductoBase(p: Prisma.ProductoGetPayload<{ select: typeof SELECT }>): ProductoBase {
  const v = p.variante[0];
  return {
    id_producto: p.id_producto,
    nombre: p.nombre,
    marca: p.marca,
    stock: p.stock,
    imagen_url: p.imagen_url,
    notas_salida: p.notas_salida,
    notas_corazon: p.notas_corazon,
    notas_fondo: p.notas_fondo,
    precio: Number(v?.precio ?? 0),
    concentracion: v?.concentracion ?? null,
  };
}

function extractNotes(
  productos: ProductoBase[],
  field: "notas_fondo" | "notas_corazon" | "notas_salida"
): string[] {
  const all = productos.flatMap((p) =>
    (p[field] ?? "").split(",").map((n) => n.trim()).filter(Boolean)
  );
  return [...new Set(all)].sort();
}

async function getBestsellers(limit = 6): Promise<ProductoBase[]> {
  const ids = await getBestsellerIds(limit);
  if (ids.length === 0) return [];
  const order = new Map(ids.map((id, i) => [id, i]));
  const raw = await prisma.producto.findMany({
    where: { id_producto: { in: ids }, stock: { gt: 0 } },
    select: SELECT,
  });
  raw.sort((a, b) => (order.get(a.id_producto) ?? 999) - (order.get(b.id_producto) ?? 999));
  return raw.map(toProductoBase);
}

async function getFilteredProductos(q?: string, categoria?: string, genero?: string, concentracion?: string) {
  const keywords = categoria ? KEYWORDS[categoria] : undefined;

  const where: Prisma.ProductoWhereInput = {
    stock: { gt: 0 },
    AND: [
      ...(q ? [{
        OR: [
          { nombre: { contains: q, mode: "insensitive" as const } },
          { marca:  { contains: q, mode: "insensitive" as const } },
        ],
      }] : []),
      ...(keywords ? [{
        OR: keywords.flatMap((kw) => [
          { notas_salida:  { contains: kw, mode: "insensitive" as const } },
          { notas_corazon: { contains: kw, mode: "insensitive" as const } },
          { notas_fondo:   { contains: kw, mode: "insensitive" as const } },
        ]),
      }] : []),
      ...(genero        ? [{ variante: { some: { concentracion: { contains: genero,        mode: "insensitive" as const } } } }] : []),
      ...(concentracion ? [{ variante: { some: { concentracion: { contains: concentracion, mode: "insensitive" as const } } } }] : []),
    ],
  };

  const [raw, total] = await Promise.all([
    prisma.producto.findMany({ where, take: 50, select: SELECT, orderBy: { id_producto: "asc" } }),
    prisma.producto.count({ where }),
  ]);

  return { productos: raw.map(toProductoBase), total };
}

export default async function CatalogoPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; categoria?: string; genero?: string; concentracion?: string }>;
}) {
  const { q, categoria, genero, concentracion } = await searchParams;

  const hasActiveFilter = !!(q || categoria || genero || concentracion);

  const [{ productos, total }, allRaw] = await Promise.all([
    getFilteredProductos(q, categoria, genero, concentracion),
    prisma.producto.findMany({ select: SELECT }),
  ]);

  const sugerencias = total === 0 && hasActiveFilter ? await getBestsellers(6) : [];

  const allProductos = allRaw.map(toProductoBase);
  const notasFondo   = extractNotes(allProductos, "notas_fondo");
  const notasCorazon = extractNotes(allProductos, "notas_corazon");
  const notasSalida  = extractNotes(allProductos, "notas_salida");

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      {/* Navbar */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 w-full max-w-screen-xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <Droplets className="size-6 text-primary" />
            <div className="leading-tight">
              <p className="text-sm font-bold tracking-tight">Fragancio Elegancio</p>
              <p className="text-[10px] text-muted-foreground">Tu marketplace favorito de fragancias</p>
            </div>
          </Link>
          <div className="flex items-center gap-1">
            <Link href="/carrito" className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}>
              <ShoppingBag className="size-5" />
            </Link>
            <Link href="/dashboard" className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}>
              <User className="size-5" />
            </Link>
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col pt-14">
        {/* Hero */}
        <section className="w-full bg-gradient-to-b from-muted/60 to-background py-14 text-center">
          <div className="mx-auto w-full max-w-screen-xl px-4">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              El perfume que buscás está acá
            </h1>
            <p className="mt-2 text-muted-foreground">
              Explorá miles de fragancias por sus notas olfativas
            </p>

            <form method="GET" className="mx-auto mt-6 flex max-w-xl gap-2">
              {categoria     && <input type="hidden" name="categoria"     value={categoria} />}
              {genero        && <input type="hidden" name="genero"        value={genero} />}
              {concentracion && <input type="hidden" name="concentracion" value={concentracion} />}
              <input
                name="q"
                defaultValue={q}
                placeholder="Buscar por nombre o marca…"
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <Button type="submit" variant="outline">Buscar</Button>
            </form>
          </div>
        </section>

        {/* Pills de categorías */}
        <section className="w-full border-b border-border bg-background py-4">
          <div className="mx-auto w-full max-w-screen-xl px-4">
            <Suspense fallback={<div className="h-8 w-64 animate-pulse rounded-full bg-muted" />}>
              <CategoryPills />
            </Suspense>
          </div>
        </section>

        {/* Sección de productos + drawer Armar tu perfume */}
        <section className="w-full flex-1 py-8">
          <div className="mx-auto w-full max-w-screen-xl px-4">
            {total === 0 && hasActiveFilter ? (
              <div className="flex flex-col items-center gap-8">
                <div className="text-center">
                  <p className="text-lg font-semibold">No encontramos resultados para tu búsqueda.</p>
                  {sugerencias.length > 0 && (
                    <p className="mt-1 text-sm text-muted-foreground">Quizás te interese alguno de estos:</p>
                  )}
                </div>
                {sugerencias.length > 0 && (
                  <div className="w-full grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                    {sugerencias.map((p) => (
                      <Link
                        key={p.id_producto}
                        href={`/producto/${p.id_producto}`}
                        className="rounded-lg border border-border bg-card p-3 flex flex-col gap-2 hover:border-primary/50 transition-colors"
                      >
                        {p.imagen_url ? (
                          <img
                            src={p.imagen_url}
                            alt={p.nombre}
                            className="w-full aspect-square rounded object-cover"
                          />
                        ) : (
                          <div className="w-full aspect-square rounded bg-muted flex items-center justify-center">
                            <Droplets className="size-8 text-muted-foreground" />
                          </div>
                        )}
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wide truncate">
                          {p.marca}
                        </p>
                        <p className="text-sm font-medium leading-tight line-clamp-2">{p.nombre}</p>
                        {p.precio > 0 && (
                          <p className="text-sm font-semibold text-primary mt-auto">
                            ${p.precio.toFixed(2)}
                          </p>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <ArmarPerfumeSection
                allProductos={allProductos}
                initialProductos={productos}
                total={total}
                notasFondo={notasFondo}
                notasCorazon={notasCorazon}
                notasSalida={notasSalida}
              />
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

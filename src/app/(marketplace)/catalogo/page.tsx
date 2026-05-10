import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { Droplets, ShoppingBag, User, SlidersHorizontal } from "lucide-react";

type Producto = Prisma.ProductoGetPayload<{
  select: {
    id_producto: true;
    nombre: true;
    marca: true;
    precio: true;
    stock: true;
    concentracion: true;
    notas_salida: true;
    notas_corazon: true;
    notas_fondo: true;
  };
}>;

const CATEGORIAS = [
  "Todas",
  "Floral",
  "Amaderado",
  "Oriental",
  "Cítrico",
  "Acuático",
  "Gourmand",
  "Chipre",
  "Fougère",
];

async function getProductos(q?: string, notas?: string) {
  const where: Prisma.ProductoWhereInput = {
    stock: { gt: 0 },
    ...(q && {
      OR: [
        { nombre: { contains: q, mode: "insensitive" } },
        { marca: { contains: q, mode: "insensitive" } },
      ],
    }),
    ...(notas && notas !== "Todas" && {
      OR: [
        { notas_salida: { contains: notas, mode: "insensitive" } },
        { notas_corazon: { contains: notas, mode: "insensitive" } },
        { notas_fondo: { contains: notas, mode: "insensitive" } },
        { categorias: { some: { categoria: { nombre: { contains: notas, mode: "insensitive" } } } } },
      ],
    }),
  };

  const [productos, total] = await Promise.all([
    prisma.producto.findMany({
      where,
      take: 50,
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
      },
      orderBy: { id_producto: "asc" },
    }),
    prisma.producto.count({ where }),
  ]);

  return { productos, total };
}

export default async function CatalogoPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; notas?: string }>;
}) {
  const { q, notas } = await searchParams;
  const { productos, total } = await getProductos(q, notas);
  const categoriaActiva = notas ?? "Todas";

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="fixed top-0 inset-x-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <Droplets className="size-6 text-primary" />
            <div className="leading-tight">
              <p className="text-sm font-bold tracking-tight">Fragancio Elegancio</p>
              <p className="text-[10px] text-muted-foreground">Tu marketplace favorito de fragancias</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}>
              <ShoppingBag className="size-5" />
            </button>
            <button className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}>
              <User className="size-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="pt-14">
        {/* Hero */}
        <section className="bg-gradient-to-b from-muted/60 to-background px-4 py-14 text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            El perfume que buscás está acá
          </h1>
          <p className="mt-2 text-muted-foreground">
            Explorá miles de fragancias por sus notas olfativas
          </p>

          <form method="GET" className="mx-auto mt-6 flex max-w-xl gap-2">
            <input
              name="q"
              defaultValue={q}
              placeholder="Buscar por nombre o marca..."
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <Button type="submit" variant="outline" className="gap-2 shrink-0">
              <SlidersHorizontal className="size-4" />
              Categorías
            </Button>
          </form>
        </section>

        {/* Pills de categorías */}
        <section className="border-b border-border bg-background px-4 py-4">
          <div className="container mx-auto">
            <div className="flex flex-wrap gap-2">
              {CATEGORIAS.map((cat) => {
                const isActive = cat === categoriaActiva;
                return (
                  <a
                    key={cat}
                    href={cat === "Todas" ? "/catalogo" : `/catalogo?notas=${encodeURIComponent(cat)}`}
                    className={cn(
                      "rounded-full border px-3.5 py-1 text-sm font-medium transition-colors",
                      isActive
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    )}
                  >
                    {cat}
                  </a>
                );
              })}
              {q && (
                <a
                  href="/catalogo"
                  className="rounded-full border border-dashed border-border px-3.5 py-1 text-sm text-muted-foreground hover:text-foreground"
                >
                  Limpiar filtros ×
                </a>
              )}
            </div>
          </div>
        </section>

        {/* Grilla */}
        <section className="container mx-auto px-4 py-8">
          <div className="mb-6 flex items-baseline justify-between">
            <h2 className="text-xl font-semibold">Perfumes populares</h2>
            <span className="text-sm text-muted-foreground">
              {total} resultado{total !== 1 ? "s" : ""}
            </span>
          </div>

          {productos.length === 0 ? (
            <EmptyState tienesFiltros={!!(q || (notas && notas !== "Todas"))} />
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {productos.map((p) => (
                <ProductoCard key={p.id_producto} producto={p} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function ProductoCard({ producto: p }: { producto: Producto }) {
  return (
    <Card className="flex flex-col h-full hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">
              {p.marca}
            </p>
            <CardTitle className="text-base leading-snug">{p.nombre}</CardTitle>
          </div>
          <span className="text-base font-bold text-primary whitespace-nowrap shrink-0">
            ${Number(p.precio).toLocaleString("es-AR")}
          </span>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-3 flex-1">
        {p.concentracion && (
          <span className="self-start rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
            {p.concentracion}
          </span>
        )}

        <div className="flex flex-col gap-1.5">
          <NotaBadge label="Salida"  valor={p.notas_salida}  className="bg-amber-100 text-amber-800" />
          <NotaBadge label="Corazón" valor={p.notas_corazon} className="bg-rose-100 text-rose-800" />
          <NotaBadge label="Fondo"   valor={p.notas_fondo}   className="bg-violet-100 text-violet-800" />
        </div>

        <p className="mt-auto pt-2 text-xs text-muted-foreground">{p.stock} en stock</p>
      </CardContent>
    </Card>
  );
}

function NotaBadge({
  label,
  valor,
  className,
}: {
  label: string;
  valor: string | null;
  className: string;
}) {
  if (!valor) return null;
  return (
    <span className={`inline-flex items-baseline gap-1 rounded-full px-2.5 py-0.5 text-xs ${className}`}>
      <span className="font-semibold">{label}:</span>
      <span className="truncate">{valor}</span>
    </span>
  );
}

function EmptyState({ tienesFiltros }: { tienesFiltros: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <p className="text-5xl mb-4">🌸</p>
      <h2 className="text-xl font-semibold mb-2">
        {tienesFiltros ? "Sin resultados para esa búsqueda" : "No hay productos disponibles"}
      </h2>
      <p className="text-muted-foreground text-sm">
        {tienesFiltros
          ? "Probá con otros términos o limpiá los filtros."
          : "Volvé más tarde, pronto habrá fragancias disponibles."}
      </p>
      {tienesFiltros && (
        <a href="/catalogo" className={cn(buttonVariants({ variant: "outline" }), "mt-4")}>
          Ver todos los productos
        </a>
      )}
    </div>
  );
}

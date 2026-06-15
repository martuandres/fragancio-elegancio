import { notFound } from "next/navigation";
import Link from "next/link";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { ArrowLeft, Droplets, ShoppingBag, User } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { getRecomendaciones } from "@/lib/recomendaciones";
import { AddToCartButton } from "./_components/AddToCartButton";

async function getCompradorLegajo(): Promise<string | null> {
  const { userId } = await auth();
  if (!userId) return null;
  const clerk = await clerkClient();
  const clerkUser = await clerk.users.getUser(userId);
  const role = (clerkUser.publicMetadata as { role?: string } | undefined)?.role;
  if (role !== "comprador") return null;
  const email = clerkUser.emailAddresses[0]?.emailAddress;
  if (!email) return null;
  const comprador = await prisma.comprador.findFirst({ where: { email }, select: { legajo: true } });
  return comprador?.legajo ?? null;
}

function NotaPills({ label, notas }: { label: string; notas: string | null }) {
  if (!notas) return null;
  const tokens = notas.split(",").map((n) => n.trim()).filter(Boolean);
  if (tokens.length === 0) return null;
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {tokens.map((nota) => (
          <span key={nota} className="rounded-full border border-border px-2.5 py-0.5 text-xs">
            {nota}
          </span>
        ))}
      </div>
    </div>
  );
}

export default async function ProductoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const id_producto = parseInt(id, 10);
  if (!Number.isInteger(id_producto) || id_producto <= 0) notFound();

  const [producto, legajo] = await Promise.all([
    prisma.producto.findUnique({
      where: { id_producto },
      select: {
        id_producto: true,
        nombre: true,
        marca: true,
        stock: true,
        imagen_url: true,
        notas_salida: true,
        notas_corazon: true,
        notas_fondo: true,
        variante: {
          orderBy: { ranking: "asc" },
          select: { id_variante_producto: true, volumen: true, precio: true, concentracion: true },
        },
        categorias: {
          select: { categoria: { select: { criterio: true } } },
        },
      },
    }),
    getCompradorLegajo(),
  ]);

  if (!producto) notFound();

  const recomendaciones = await getRecomendaciones(id_producto, 6, legajo ?? undefined);

  const precioBase = Number(producto.variante[0]?.precio ?? 0);

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
        <div className="mx-auto w-full max-w-screen-xl px-4 py-8">

          <Link
            href="/catalogo"
            className="mb-8 flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Volver al catálogo
          </Link>

          {/* Detalle del producto */}
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">

            {/* Imagen */}
            <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-border bg-card">
              {producto.imagen_url ? (
                <img
                  src={producto.imagen_url}
                  alt={producto.nombre}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Droplets className="size-20 text-muted-foreground" />
              )}
            </div>

            {/* Info */}
            <div className="flex flex-col gap-5">

              {/* Marca + categorías */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">{producto.marca}</span>
                {producto.categorias.map((c) =>
                  c.categoria.criterio ? (
                    <span
                      key={c.categoria.criterio}
                      className="rounded-full bg-muted px-2.5 py-0.5 text-xs"
                    >
                      {c.categoria.criterio}
                    </span>
                  ) : null
                )}
              </div>

              <h1 className="text-2xl font-bold leading-tight sm:text-3xl">{producto.nombre}</h1>

              {precioBase > 0 && (
                <p className="text-2xl font-semibold text-primary">${precioBase.toFixed(2)}</p>
              )}

              {/* Variantes */}
              {producto.variante.length > 1 && (
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Presentaciones
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {producto.variante.map((v) => (
                      <div
                        key={v.id_variante_producto}
                        className="rounded-lg border border-border px-3 py-2 text-sm"
                      >
                        <span className="font-medium">{Number(v.volumen)}ml</span>
                        {v.concentracion && (
                          <span className="text-muted-foreground"> · {v.concentracion}</span>
                        )}
                        <span className="ml-1 text-primary">${Number(v.precio).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notas olfativas */}
              <div className="flex flex-col gap-3 border-t border-border pt-5">
                <NotaPills label="Notas de salida"   notas={producto.notas_salida} />
                <NotaPills label="Notas de corazón"  notas={producto.notas_corazon} />
                <NotaPills label="Notas de fondo"    notas={producto.notas_fondo} />
              </div>

              {/* Stock + carrito */}
              <div className="flex flex-col gap-3 pt-1">
                <p className="text-sm text-muted-foreground">
                  {producto.stock > 0
                    ? `${producto.stock} unidades disponibles`
                    : "Sin stock"}
                </p>
                <AddToCartButton id_producto={id_producto} disabled={producto.stock === 0} />
              </div>
            </div>
          </div>

          {/* Recomendaciones */}
          {recomendaciones.length > 0 && (
            <section className="mt-16">
              <h2 className="mb-6 text-xl font-semibold">También te puede gustar</h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                {recomendaciones.map((p) => (
                  <Link
                    key={p.id_producto}
                    href={`/producto/${p.id_producto}`}
                    className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3 transition-colors hover:border-primary/50"
                  >
                    {p.imagen_url ? (
                      <img
                        src={p.imagen_url}
                        alt={p.nombre}
                        className="aspect-square w-full rounded object-cover"
                      />
                    ) : (
                      <div className="flex aspect-square w-full items-center justify-center rounded bg-muted">
                        <Droplets className="size-8 text-muted-foreground" />
                      </div>
                    )}
                    <p className="truncate text-[11px] uppercase tracking-wide text-muted-foreground">
                      {p.marca}
                    </p>
                    <p className="line-clamp-2 text-sm font-medium leading-tight">{p.nombre}</p>
                    {p.precio > 0 && (
                      <p className="mt-auto text-sm font-semibold text-primary">
                        ${p.precio.toFixed(2)}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          )}

        </div>
      </main>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Droplets, Sparkles, X, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { useAuth, useUser } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetTrigger,
} from "@/components/ui/sheet";

export type ProductoBase = {
  id_producto: number;
  nombre: string;
  marca: string;
  precio: number;
  stock: number;
  concentracion: string | null;
  imagen_url: string | null;
  notas_salida: string | null;
  notas_corazon: string | null;
  notas_fondo: string | null;
};

type ProductoConScore = ProductoBase & { score: number; coincidencias: number };

function parseNotas(val: string | null): string[] {
  return (val ?? "").split(",").map((n) => n.trim()).filter(Boolean);
}

function calcularScore(
  p: ProductoBase,
  selFondo: string[],
  selCorazon: string[],
  selSalida: string[]
): ProductoConScore {
  const pFondo   = parseNotas(p.notas_fondo).map((n) => n.toLowerCase());
  const pCorazon = parseNotas(p.notas_corazon).map((n) => n.toLowerCase());
  const pSalida  = parseNotas(p.notas_salida).map((n) => n.toLowerCase());

  let score = 0;
  let coincidencias = 0;

  for (const nota of selFondo) {
    if (pFondo.some((n) => n.includes(nota.toLowerCase()))) { score += 3; coincidencias++; }
  }
  for (const nota of selCorazon) {
    if (pCorazon.some((n) => n.includes(nota.toLowerCase()))) { score += 2; coincidencias++; }
  }
  for (const nota of selSalida) {
    if (pSalida.some((n) => n.includes(nota.toLowerCase()))) { score += 1; coincidencias++; }
  }

  return { ...p, score, coincidencias };
}

export function ArmarPerfumeSection({
  allProductos,
  initialProductos,
  total,
  notasFondo,
  notasCorazon,
  notasSalida,
}: {
  allProductos: ProductoBase[];
  initialProductos: ProductoBase[];
  total: number;
  notasFondo: string[];
  notasCorazon: string[];
  notasSalida: string[];
}) {
  const [open,         setOpen]         = useState(false);
  const [selFondo,     setSelFondo]     = useState<string[]>([]);
  const [selCorazon,   setSelCorazon]   = useState<string[]>([]);
  const [selSalida,    setSelSalida]    = useState<string[]>([]);
  const [scored,       setScored]       = useState<ProductoConScore[] | null>(null);

  const totalSel   = selFondo.length + selCorazon.length + selSalida.length;
  const modoScore  = scored !== null;
  const productos  = scored ?? initialProductos;
  const totalMostrar = modoScore ? scored!.length : total;

  function toggle(set: string[], setter: (v: string[]) => void, nota: string) {
    setter(set.includes(nota) ? set.filter((n) => n !== nota) : [...set, nota]);
  }

  function verPerfumes() {
    const results = allProductos
      .map((p) => calcularScore(p, selFondo, selCorazon, selSalida))
      .filter((p) => p.score > 0)
      .sort((a, b) => b.score - a.score);
    setScored(results);
    setOpen(false);
  }

  function limpiar() {
    setSelFondo([]);
    setSelCorazon([]);
    setSelSalida([]);
    setScored(null);
  }

  return (
    <>
      {/* Header de la sección */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">
            {modoScore ? "Perfumes recomendados" : "Perfumes populares"}
          </h2>
          {modoScore && (
            <p className="mt-0.5 text-sm text-muted-foreground">
              Basado en las notas que seleccionaste
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {totalMostrar} resultado{totalMostrar !== 1 ? "s" : ""}
          </span>
          {modoScore && (
            <Button variant="ghost" size="sm" onClick={limpiar} className="gap-1.5 text-muted-foreground">
              <X className="size-3.5" />
              Volver al catálogo
            </Button>
          )}

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger render={<Button variant="outline" size="sm" className="gap-2" />}>
              <Sparkles className="size-4" />
              Armar tu perfume{totalSel > 0 && ` (${totalSel})`}
            </SheetTrigger>

            <SheetContent side="right" className="flex flex-col p-0 sm:max-w-md">
              <SheetHeader className="border-b px-5 pb-3 pt-5">
                <SheetTitle>Armar tu perfume</SheetTitle>
                <p className="text-sm text-muted-foreground">
                  Seleccioná las notas que te gustan y encontramos tu fragancia ideal.
                </p>
              </SheetHeader>

              <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-5 py-4">
                <NotaSection
                  label="Predominan"
                  sublabel="notas de fondo"
                  notas={notasFondo}
                  seleccionadas={selFondo}
                  onToggle={(n) => toggle(selFondo, setSelFondo, n)}
                  claseBase="border-violet-200 bg-violet-100 text-violet-800"
                  claseActivo="border-violet-600 bg-violet-600 text-white"
                />
                <NotaSection
                  label="Acompañan"
                  sublabel="notas de corazón"
                  notas={notasCorazon}
                  seleccionadas={selCorazon}
                  onToggle={(n) => toggle(selCorazon, setSelCorazon, n)}
                  claseBase="border-rose-200 bg-rose-100 text-rose-800"
                  claseActivo="border-rose-600 bg-rose-600 text-white"
                />
                <NotaSection
                  label="Aparecen al inicio"
                  sublabel="notas de salida"
                  notas={notasSalida}
                  seleccionadas={selSalida}
                  onToggle={(n) => toggle(selSalida, setSelSalida, n)}
                  claseBase="border-amber-200 bg-amber-100 text-amber-800"
                  claseActivo="border-amber-600 bg-amber-600 text-white"
                />
              </div>

              <SheetFooter className="border-t px-5 pb-5 pt-3 flex flex-row gap-2">
                <Button variant="outline" onClick={limpiar} className="flex-1">
                  Limpiar
                </Button>
                <Button
                  onClick={verPerfumes}
                  disabled={totalSel === 0}
                  className="flex-1"
                >
                  Ver perfumes →
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Grilla */}
      {productos.length === 0 ? (
        <EmptyState modoScore={modoScore} />
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {productos.map((p) => (
            <ProductoCard
              key={p.id_producto}
              producto={p}
              coincidencias={"coincidencias" in p ? (p as ProductoConScore).coincidencias : undefined}
            />
          ))}
        </div>
      )}
    </>
  );
}

// ── Sub-componentes ─────────────────────────────────────────────────────────

function NotaSection({
  label, sublabel, notas, seleccionadas, onToggle, claseBase, claseActivo,
}: {
  label: string;
  sublabel: string;
  notas: string[];
  seleccionadas: string[];
  onToggle: (nota: string) => void;
  claseBase: string;
  claseActivo: string;
}) {
  const [busqueda, setBusqueda] = useState("");
  const filtradas = notas.filter((n) =>
    n.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-2.5">
      <div>
        <p className="text-sm font-semibold leading-tight">{label}</p>
        <p className="text-xs text-muted-foreground">{sublabel}</p>
      </div>

      <input
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder={`Buscar en ${label.toLowerCase()}…`}
        className="rounded-md border border-input bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />

      <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
        {filtradas.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Sin resultados para &quot;{busqueda}&quot;
          </p>
        ) : (
          filtradas.map((nota) => {
            const activa = seleccionadas.includes(nota);
            return (
              <button
                key={nota}
                onClick={() => onToggle(nota)}
                className={cn(
                  "cursor-pointer rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
                  activa ? claseActivo : claseBase
                )}
              >
                {nota}
              </button>
            );
          })
        )}
      </div>

      {seleccionadas.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {seleccionadas.length} seleccionada{seleccionadas.length !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}

function ProductoCard({
  producto: p,
  coincidencias,
}: {
  producto: ProductoBase;
  coincidencias?: number;
}) {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const role = (user?.publicMetadata as { role?: string } | undefined)?.role;
  const [adding, setAdding] = useState(false);

  async function handleAgregar() {
    if (!isSignedIn) {
      router.push("/sign-in");
      return;
    }
    if (role !== "comprador" && role !== "admin") {
      toast.error("Solo los compradores pueden agregar productos al carrito");
      return;
    }
    setAdding(true);
    try {
      const res = await fetch("/api/carrito", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_producto: p.id_producto, cantidad: 1 }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`${p.nombre} agregado al carrito`);
      } else {
        toast.error(data.message ?? "No se pudo agregar al carrito");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setAdding(false);
    }
  }

  return (
    <Card className="card-perfume flex h-full flex-col overflow-hidden hover:shadow-xl">
      {p.imagen_url ? (
        <div className="relative h-48 w-full shrink-0">
          <Image
            src={p.imagen_url}
            alt={`${p.marca} ${p.nombre}`}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        </div>
      ) : (
        <div className="flex h-48 w-full shrink-0 items-center justify-center bg-muted">
          <Droplets className="size-10 text-muted-foreground/40" />
        </div>
      )}
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="mb-0.5 text-xs uppercase tracking-wider text-muted-foreground">
              {p.marca}
            </p>
            <CardTitle className="text-base leading-snug">{p.nombre}</CardTitle>
          </div>
          <span className="shrink-0 whitespace-nowrap text-base font-bold text-primary">
            ${p.precio.toLocaleString("es-AR")}
          </span>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-3">
        <div className="flex flex-wrap gap-1.5">
          {coincidencias !== undefined && (
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              {coincidencias} nota{coincidencias !== 1 ? "s" : ""} coinciden
            </span>
          )}
          {p.concentracion && (
            <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
              {p.concentracion}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <NotaBadge label="Salida"  valor={p.notas_salida}  className="bg-amber-100 text-amber-800" />
          <NotaBadge label="Corazón" valor={p.notas_corazon} className="bg-rose-100 text-rose-800" />
          <NotaBadge label="Fondo"   valor={p.notas_fondo}   className="bg-violet-100 text-violet-800" />
        </div>

        <p className="pt-2 text-xs text-muted-foreground">{p.stock} en stock</p>

        <Button
          size="sm"
          className="mt-auto w-full gap-1.5"
          disabled={p.stock === 0 || adding}
          onClick={handleAgregar}
        >
          <ShoppingCart className="size-3.5" />
          {p.stock === 0 ? "Sin stock" : adding ? "Agregando…" : "Agregar al carrito"}
        </Button>
      </CardContent>
    </Card>
  );
}

function NotaBadge({
  label, valor, className,
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

function EmptyState({ modoScore }: { modoScore: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <p className="mb-4 text-5xl">🌸</p>
      <h2 className="mb-2 text-xl font-semibold">
        {modoScore ? "Ningún perfume coincide con esas notas" : "No hay productos disponibles"}
      </h2>
      <p className="text-sm text-muted-foreground">
        {modoScore
          ? "Probá con una combinación diferente de notas."
          : "Volvé más tarde, pronto habrá fragancias disponibles."}
      </p>
    </div>
  );
}

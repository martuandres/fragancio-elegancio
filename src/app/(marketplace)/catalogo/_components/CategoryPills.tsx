"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

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

export function CategoryPills() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoriaActiva = searchParams.get("categoria") ?? "Todas";
  const q             = searchParams.get("q");
  const genero        = searchParams.get("genero");
  const concentracion = searchParams.get("concentracion");
  const hayFiltros    = !!(q || categoriaActiva !== "Todas" || genero || concentracion);

  function navigate(cat: string) {
    const params = new URLSearchParams();
    if (q)             params.set("q", q);
    if (genero)        params.set("genero", genero);
    if (concentracion) params.set("concentracion", concentracion);
    if (cat !== "Todas") params.set("categoria", cat);
    const query = params.toString();
    router.push(`/catalogo${query ? `?${query}` : ""}`);
  }

  return (
    <div className="flex flex-wrap gap-2">
      {CATEGORIAS.map((cat) => {
        const isActive = cat === categoriaActiva;
        return (
          <button
            key={cat}
            onClick={() => navigate(cat)}
            className={cn(
              "rounded-full border px-3.5 py-1 text-sm font-medium transition-colors cursor-pointer",
              isActive
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
            )}
          >
            {cat}
          </button>
        );
      })}
      {hayFiltros && (
        <button
          onClick={() => router.push("/catalogo")}
          className="rounded-full border border-dashed border-border px-3.5 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
        >
          Limpiar filtros ×
        </button>
      )}
    </div>
  );
}

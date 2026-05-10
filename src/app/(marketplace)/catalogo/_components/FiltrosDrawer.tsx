"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";

const FAMILIAS       = ["Todas", "Floral", "Amaderado", "Oriental", "Cítrico", "Acuático", "Gourmand", "Chipre", "Fougère"];
const GENEROS        = ["Todos", "Men", "Women", "Unisex"];
const CONCENTRACIONES = ["Todas", "EDP", "EDT", "Parfum", "Cologne"];

export function FiltrosDrawer() {
  const router      = useRouter();
  const searchParams = useSearchParams();

  const [open,          setOpen]          = useState(false);
  const [categoria,     setCategoria]     = useState("Todas");
  const [genero,        setGenero]        = useState("Todos");
  const [concentracion, setConcentracion] = useState("Todas");

  const filtrosActivos = [
    (searchParams.get("categoria") ?? "Todas") !== "Todas",
    (searchParams.get("genero")    ?? "Todos") !== "Todos",
    (searchParams.get("concentracion") ?? "Todas") !== "Todas",
  ].filter(Boolean).length;

  function handleOpenChange(isOpen: boolean) {
    if (isOpen) {
      setCategoria(searchParams.get("categoria")     ?? "Todas");
      setGenero(searchParams.get("genero")            ?? "Todos");
      setConcentracion(searchParams.get("concentracion") ?? "Todas");
    }
    setOpen(isOpen);
  }

  function aplicar() {
    const params = new URLSearchParams();
    const q = searchParams.get("q");
    if (q)                             params.set("q", q);
    if (categoria     !== "Todas")     params.set("categoria", categoria);
    if (genero        !== "Todos")     params.set("genero", genero);
    if (concentracion !== "Todas")     params.set("concentracion", concentracion);
    const query = params.toString();
    router.push(`/catalogo${query ? `?${query}` : ""}`);
  }

  function limpiar() {
    setCategoria("Todas");
    setGenero("Todos");
    setConcentracion("Todas");
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger
        render={
          <Button variant="outline" className="gap-2 shrink-0" />
        }
      >
        <SlidersHorizontal className="size-4" />
        Categorías{filtrosActivos > 0 && ` (${filtrosActivos})`}
      </SheetTrigger>

      <SheetContent side="right" className="flex flex-col p-0">
        <SheetHeader className="px-4 pt-4 pb-2 border-b">
          <SheetTitle>Filtros</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-6">
          <FilterSection
            label="Familia olfativa"
            options={FAMILIAS}
            value={categoria}
            onChange={setCategoria}
          />
          <FilterSection
            label="Género"
            options={GENEROS}
            value={genero}
            onChange={setGenero}
          />
          <FilterSection
            label="Concentración"
            options={CONCENTRACIONES}
            value={concentracion}
            onChange={setConcentracion}
          />
        </div>

        <SheetFooter className="px-4 pb-4 pt-2 border-t flex flex-row gap-2">
          <Button variant="outline" onClick={limpiar} className="flex-1">
            Limpiar filtros
          </Button>
          <SheetClose
            render={
              <Button onClick={aplicar} className="flex-1" />
            }
          >
            Aplicar
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function FilterSection({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={cn(
              "rounded-full border px-3 py-1 text-sm font-medium transition-colors cursor-pointer",
              opt === value
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
            )}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

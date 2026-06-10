"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Droplets } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const inputClass =
  "w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400";

export default function NuevoProductoPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    nombre: "",
    marca: "",
    stock: "",
    ingrediente: "",
    imagen_url: "",
    notas_salida: "",
    notas_corazon: "",
    notas_fondo: "",
  });

  function set(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      nombre: form.nombre.trim(),
      marca: form.marca.trim(),
      ...(form.stock !== "" && { stock: Number(form.stock) }),
      ...(form.ingrediente.trim() && { ingrediente: form.ingrediente.trim() }),
      ...(form.imagen_url.trim() && { imagen_url: form.imagen_url.trim() }),
      ...(form.notas_salida.trim() && { notas_salida: form.notas_salida.trim() }),
      ...(form.notas_corazon.trim() && { notas_corazon: form.notas_corazon.trim() }),
      ...(form.notas_fondo.trim() && { notas_fondo: form.notas_fondo.trim() }),
    };

    try {
      const res = await fetch("/api/inventario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        router.push("/vendedor");
      } else {
        setError(data.message ?? "No se pudo crear el producto");
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="border-b bg-white px-6 py-4 flex items-center gap-4">
        <Link href="/vendedor" className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}>
          <ArrowLeft className="size-4" />
        </Link>
        <div className="flex items-center gap-2">
          <Droplets className="size-5 text-stone-600" />
          <span className="font-semibold tracking-tight">Nuevo producto</span>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Card className="bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Información básica</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Field label="Nombre *">
                <input
                  required
                  className={inputClass}
                  placeholder="Ej: Baccarat Rouge 540"
                  value={form.nombre}
                  onChange={(e) => set("nombre", e.target.value)}
                />
              </Field>
              <Field label="Marca *">
                <input
                  required
                  className={inputClass}
                  placeholder="Ej: Maison Francis Kurkdjian"
                  value={form.marca}
                  onChange={(e) => set("marca", e.target.value)}
                />
              </Field>
              <Field label="Stock">
                <input
                  type="number"
                  min={0}
                  className={inputClass}
                  placeholder="0"
                  value={form.stock}
                  onChange={(e) => set("stock", e.target.value)}
                />
              </Field>
              <Field label="URL de imagen">
                <input
                  type="url"
                  className={inputClass}
                  placeholder="https://..."
                  value={form.imagen_url}
                  onChange={(e) => set("imagen_url", e.target.value)}
                />
              </Field>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Perfil olfativo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Field label="Notas de salida" hint="Separadas por coma">
                <input
                  className={inputClass}
                  placeholder="Ej: Bergamot, Lemon, Grapefruit"
                  value={form.notas_salida}
                  onChange={(e) => set("notas_salida", e.target.value)}
                />
              </Field>
              <Field label="Notas de corazón" hint="Separadas por coma">
                <input
                  className={inputClass}
                  placeholder="Ej: Rose, Jasmine, Violet"
                  value={form.notas_corazon}
                  onChange={(e) => set("notas_corazon", e.target.value)}
                />
              </Field>
              <Field label="Notas de fondo" hint="Separadas por coma">
                <input
                  className={inputClass}
                  placeholder="Ej: Sandalwood, Musk, Amber"
                  value={form.notas_fondo}
                  onChange={(e) => set("notas_fondo", e.target.value)}
                />
              </Field>
              <Field label="Ingredientes" hint="Separados por coma">
                <input
                  className={inputClass}
                  placeholder="Ej: Ambroxan, Safraleine"
                  value={form.ingrediente}
                  onChange={(e) => set("ingrediente", e.target.value)}
                />
              </Field>
            </CardContent>
          </Card>

          {error && (
            <p className="rounded-md bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="flex gap-3">
            <Link href="/vendedor" className={cn(buttonVariants({ variant: "outline" }), "flex-1 justify-center")}>
              Cancelar
            </Link>
            <Button type="submit" disabled={saving} className="flex-1">
              {saving ? "Guardando…" : "Crear producto"}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline gap-2">
        <label className="text-sm font-medium text-stone-700">{label}</label>
        {hint && <span className="text-xs text-stone-400">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

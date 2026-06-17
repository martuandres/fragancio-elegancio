"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Droplets, XCircle } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Producto = {
  id_producto: number;
  nombre: string;
  marca: string;
  stock: number;
  precio: number;
  volumen: number;
  concentracion: string | null;
  imagen_url: string | null;
  ingrediente: string;
  notas_salida: string | null;
  notas_corazon: string | null;
  notas_fondo: string | null;
};

const inputClass =
  "w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400";

const readonlyClass =
  "w-full rounded-md border border-stone-100 bg-stone-50 px-3 py-2 text-sm text-stone-400 cursor-not-allowed";

export default function EditarProductoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [producto, setProducto] = useState<Producto | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [form, setForm] = useState({
    nombre: "",
    marca: "",
    stock: "",
    precio: "",
    concentracion: "",
    ingrediente: "",
    imagen_url: "",
    notas_salida: "",
    notas_corazon: "",
    notas_fondo: "",
  });

  useEffect(() => {
    fetch(`/api/inventario/${id}`)
      .then(async (r) => {
        if (!r.ok) {
          const d = await r.json();
          setFetchError(d.message ?? "No se pudo cargar el producto");
          return;
        }
        const p: Producto = await r.json();
        setProducto(p);
        setForm({
          nombre:        p.nombre,
          marca:         p.marca,
          stock:         String(p.stock),
          precio:        String(p.precio),
          concentracion: p.concentracion ?? "",
          ingrediente:   p.ingrediente,
          imagen_url:    p.imagen_url ?? "",
          notas_salida:  p.notas_salida ?? "",
          notas_corazon: p.notas_corazon ?? "",
          notas_fondo:   p.notas_fondo ?? "",
        });
      })
      .finally(() => setLoading(false));
  }, [id]);

  function set(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);

    const payload: Record<string, unknown> = {
      nombre:        form.nombre.trim(),
      marca:         form.marca.trim(),
      stock:         Number(form.stock),
      precio:        Number(form.precio),
      concentracion: form.concentracion.trim(),
      ingrediente:   form.ingrediente.trim(),
      imagen_url:    form.imagen_url.trim() || null,
      notas_salida:  form.notas_salida.trim() || null,
      notas_corazon: form.notas_corazon.trim() || null,
      notas_fondo:   form.notas_fondo.trim() || null,
    };

    try {
      const res = await fetch(`/api/inventario/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        router.push("/vendedor");
      } else {
        setSaveError(data.error?.message ?? data.message ?? "No se pudo guardar los cambios");
      }
    } catch {
      setSaveError("Error de conexión");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-4 border-stone-200 border-t-stone-800" />
      </div>
    );
  }

  if (fetchError || !producto) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <XCircle className="size-12 text-red-400 mx-auto" />
          <p className="text-stone-600">{fetchError ?? "Producto no encontrado"}</p>
          <Link href="/vendedor" className={buttonVariants({ variant: "outline" })}>
            Volver al inventario
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="border-b bg-white px-6 py-4 flex items-center gap-4">
        <Link href="/vendedor" className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}>
          <ArrowLeft className="size-4" />
        </Link>
        <div className="flex items-center gap-2">
          <Droplets className="size-5 text-stone-600" />
          <span className="font-semibold tracking-tight">Editar producto</span>
        </div>
        <span className="text-xs text-stone-400 truncate">
          {producto.marca} — {producto.nombre}
        </span>
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
                  value={form.nombre}
                  onChange={(e) => set("nombre", e.target.value)}
                />
              </Field>
              <Field label="Marca *">
                <input
                  required
                  className={inputClass}
                  value={form.marca}
                  onChange={(e) => set("marca", e.target.value)}
                />
              </Field>
              <Field label="Stock">
                <input
                  type="number"
                  min={0}
                  className={inputClass}
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
              <CardTitle className="text-base">Variante</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Field label="Precio (ARS) *">
                <input
                  required
                  type="number"
                  min={1}
                  step="0.01"
                  className={inputClass}
                  value={form.precio}
                  onChange={(e) => set("precio", e.target.value)}
                />
              </Field>
              <Field label="Volumen (ml)" hint="No editable — define el producto">
                <input
                  readOnly
                  className={readonlyClass}
                  value={`${producto.volumen} ml`}
                />
              </Field>
              <Field label="Concentración *" hint="Ej: EDP, EDT, Parfum">
                <input
                  required
                  className={inputClass}
                  value={form.concentracion}
                  onChange={(e) => set("concentracion", e.target.value)}
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
                  value={form.notas_salida}
                  onChange={(e) => set("notas_salida", e.target.value)}
                />
              </Field>
              <Field label="Notas de corazón" hint="Separadas por coma">
                <input
                  className={inputClass}
                  value={form.notas_corazon}
                  onChange={(e) => set("notas_corazon", e.target.value)}
                />
              </Field>
              <Field label="Notas de fondo" hint="Separadas por coma">
                <input
                  className={inputClass}
                  value={form.notas_fondo}
                  onChange={(e) => set("notas_fondo", e.target.value)}
                />
              </Field>
              <Field label="Ingredientes" hint="Separados por coma">
                <input
                  className={inputClass}
                  value={form.ingrediente}
                  onChange={(e) => set("ingrediente", e.target.value)}
                />
              </Field>
            </CardContent>
          </Card>

          {saveError && (
            <p className="rounded-md bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">
              {saveError}
            </p>
          )}

          <div className="flex gap-3">
            <Link
              href="/vendedor"
              className={cn(buttonVariants({ variant: "outline" }), "flex-1 justify-center")}
            >
              Cancelar
            </Link>
            <Button type="submit" disabled={saving} className="flex-1">
              {saving ? "Guardando…" : "Guardar cambios"}
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

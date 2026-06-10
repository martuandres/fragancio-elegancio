"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Droplets, Plus, Pencil, Trash2, Package, ArrowLeft } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Producto = {
  id_producto: number;
  nombre: string;
  marca: string;
  stock: number;
  precio: number;
  concentracion: string | null;
  imagen_url: string | null;
};

export default function VendedorPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchInventario = useCallback(async (p: number) => {
    setLoading(true);
    const res = await fetch(`/api/inventario?page=${p}&limit=20`);
    if (res.ok) {
      const data = await res.json();
      setProductos(data.data ?? []);
      setTotal(data.pagination.total);
      setTotalPages(data.pagination.totalPages);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchInventario(page); }, [fetchInventario, page]);

  async function handleDelete(id_producto: number, nombre: string) {
    if (!confirm(`¿Eliminás "${nombre}" de tu inventario?`)) return;
    setDeletingId(id_producto);
    try {
      const res = await fetch(`/api/inventario/${id_producto}`, { method: "DELETE" });
      if (res.ok || res.status === 204) {
        toast.success("Producto eliminado del inventario");
        fetchInventario(page);
      } else {
        const d = await res.json();
        toast.error(d.message ?? "No se pudo eliminar el producto");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="border-b bg-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}>
            <ArrowLeft className="size-4" />
          </Link>
          <div className="flex items-center gap-2">
            <Droplets className="size-5 text-stone-600" />
            <span className="font-semibold tracking-tight">Mi inventario</span>
          </div>
          <span className="text-sm text-stone-400">{total} productos</span>
        </div>
        <Link href="/vendedor/inventario/nuevo" className={cn(buttonVariants(), "gap-1.5")}>
          <Plus className="size-4" />
          Nuevo producto
        </Link>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="size-8 animate-spin rounded-full border-4 border-stone-200 border-t-stone-800" />
          </div>
        ) : productos.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-24 text-center">
            <Package className="size-12 text-stone-300" />
            <h2 className="text-xl font-semibold text-stone-700">Sin productos en tu inventario</h2>
            <p className="text-sm text-stone-500">
              Agregá tu primer producto para empezar a vender.
            </p>
            <Link href="/vendedor/inventario/nuevo" className={buttonVariants()}>
              <Plus className="size-4 mr-1.5" /> Agregar producto
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3">
              {productos.map((p) => (
                <Card key={p.id_producto} className="bg-white">
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-xs uppercase tracking-wider text-stone-500">{p.marca}</p>
                        {p.concentracion && (
                          <span className="text-xs bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full">
                            {p.concentracion}
                          </span>
                        )}
                      </div>
                      <p className="font-semibold text-stone-800 truncate">{p.nombre}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-sm font-bold text-stone-700">
                          ${p.precio.toLocaleString("es-AR")}
                        </span>
                        <span
                          className={cn(
                            "text-xs",
                            p.stock === 0
                              ? "text-red-500 font-medium"
                              : p.stock < 5
                              ? "text-yellow-600"
                              : "text-stone-400"
                          )}
                        >
                          {p.stock === 0 ? "Sin stock" : `${p.stock} en stock`}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        href={`/vendedor/inventario/${p.id_producto}/editar`}
                        className={cn(buttonVariants({ variant: "outline", size: "icon" }))}
                      >
                        <Pencil className="size-3.5" />
                      </Link>
                      <Button
                        variant="destructive"
                        size="icon"
                        disabled={deletingId === p.id_producto}
                        onClick={() => handleDelete(p.id_producto, p.nombre)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Anterior
                </Button>
                <span className="text-sm text-stone-500">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Siguiente
                </Button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

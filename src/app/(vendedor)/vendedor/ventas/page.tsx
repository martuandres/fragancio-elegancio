"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Package, Truck, ClipboardList } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type EnvioItem = {
  id_envio: number;
  id_carrito: number;
  estado: string;
  track_code: string | null;
  carrito: {
    id_carrito: number;
    fecha_creada: string;
    comprador: {
      nombre: string;
      email: string;
      direccion_envio: string;
    };
    items: {
      cantidad: number;
      producto: {
        id_producto: number;
        nombre: string;
        marca: string;
        imagen_url: string | null;
      };
    }[];
  };
};

export default function VentasPage() {
  const [envios, setEnvios] = useState<EnvioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [despachando, setDespachando] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/vendedor/envios")
      .then((r) => r.json())
      .then((d) => setEnvios(d.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  async function handleDespachar(id_carrito: number) {
    setDespachando(id_carrito);
    try {
      const res = await fetch(`/api/envios/${id_carrito}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: "en_camino" }),
      });
      if (res.ok) {
        setEnvios((prev) => prev.filter((e) => e.id_carrito !== id_carrito));
        toast.success("Envío actualizado · comprador notificado");
      } else {
        const d = await res.json();
        toast.error(d.error?.message ?? "No se pudo actualizar el envío");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setDespachando(null);
    }
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="border-b bg-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/vendedor"
            className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div className="flex items-center gap-2">
            <ClipboardList className="size-5 text-stone-600" />
            <span className="font-semibold tracking-tight">Órdenes pendientes</span>
          </div>
          {!loading && (
            <span className="text-sm text-stone-400">{envios.length} para despachar</span>
          )}
        </div>
        <Link
          href="/vendedor"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
        >
          <Package className="size-4" />
          Inventario
        </Link>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="size-8 animate-spin rounded-full border-4 border-stone-200 border-t-stone-800" />
          </div>
        ) : envios.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-24 text-center">
            <Truck className="size-12 text-stone-300" />
            <h2 className="text-xl font-semibold text-stone-700">Sin órdenes pendientes</h2>
            <p className="text-sm text-stone-500">
              Cuando haya pedidos por despachar van a aparecer acá.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {envios.map((e) => (
              <Card key={e.id_envio} className="bg-white">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <p className="text-xs text-stone-400">
                        Pedido #{e.id_carrito} ·{" "}
                        {new Date(e.carrito.fecha_creada).toLocaleDateString("es-AR")}
                      </p>
                      <p className="font-semibold text-stone-800">{e.carrito.comprador.nombre}</p>
                      <p className="text-sm text-stone-500">{e.carrito.comprador.email}</p>
                      <p className="text-xs text-stone-400 mt-0.5">
                        {e.carrito.comprador.direccion_envio}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      disabled={despachando === e.id_carrito}
                      onClick={() => handleDespachar(e.id_carrito)}
                      className="gap-1.5 shrink-0"
                    >
                      <Truck className="size-3.5" />
                      {despachando === e.id_carrito ? "Despachando…" : "Marcar como despachado"}
                    </Button>
                  </div>

                  <div className="space-y-2 border-t pt-3">
                    {e.carrito.items.map((item) => (
                      <div key={item.producto.id_producto} className="flex items-center gap-3">
                        <div className="size-10 shrink-0 rounded bg-stone-100 overflow-hidden">
                          {item.producto.imagen_url ? (
                            <Image
                              src={item.producto.imagen_url}
                              alt={item.producto.nombre}
                              width={40}
                              height={40}
                              className="size-full object-cover"
                            />
                          ) : (
                            <div className="size-full flex items-center justify-center">
                              <Package className="size-4 text-stone-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs uppercase tracking-wider text-stone-400">
                            {item.producto.marca}
                          </p>
                          <p className="text-sm font-medium text-stone-700 truncate">
                            {item.producto.nombre}
                          </p>
                        </div>
                        <span className="text-sm text-stone-500 shrink-0">× {item.cantidad}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

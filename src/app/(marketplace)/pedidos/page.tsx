"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronRight, Droplets, Package } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Pedido = {
  id_carrito: number;
  fecha_creada: string;
  estado: string;
  pago: { id_pago: string; estado: string } | null;
  envio: { id_envio: number; estado: string; track_code: string | null } | null;
};

const PAGO_COLORS: Record<string, string> = {
  pendiente:   "bg-yellow-100 text-yellow-800",
  aprobado:    "bg-green-100  text-green-800",
  rechazado:   "bg-red-100    text-red-800",
  reembolsado: "bg-stone-100  text-stone-700",
};

const PAGO_LABEL: Record<string, string> = {
  pendiente:   "Pendiente de pago",
  aprobado:    "Pago aprobado",
  rechazado:   "Pago rechazado",
  reembolsado: "Reembolsado",
};

const ENVIO_LABEL: Record<string, string> = {
  preparando: "Preparando",
  en_camino:  "En camino",
  entregado:  "Entregado",
};

export default function PedidosPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/pedidos")
      .then((r) => r.json())
      .then((d) => setPedidos(d.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-4 border-stone-200 border-t-stone-800" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="border-b bg-white px-6 py-4 flex items-center gap-4">
        <Link href="/dashboard" className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}>
          <ArrowLeft className="size-4" />
        </Link>
        <div className="flex items-center gap-2">
          <Droplets className="size-5 text-stone-600" />
          <span className="font-semibold tracking-tight">Mis pedidos</span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        {pedidos.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-24 text-center">
            <Package className="size-12 text-stone-300" />
            <h2 className="text-xl font-semibold text-stone-700">No tenés pedidos aún</h2>
            <p className="text-sm text-stone-500">
              Explorá el catálogo y hacé tu primera compra.
            </p>
            <Link href="/catalogo" className={buttonVariants({ variant: "outline" })}>
              Ver catálogo
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {pedidos.map((p) => (
              <Link key={p.id_carrito} href={`/pedidos/${p.id_carrito}`}>
                <Card className="bg-white hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-medium text-stone-700">
                          Pedido #{p.id_carrito}
                        </span>
                        {p.pago && (
                          <span
                            className={cn(
                              "text-xs px-2 py-0.5 rounded-full",
                              PAGO_COLORS[p.pago.estado] ?? "bg-stone-100 text-stone-700"
                            )}
                          >
                            {PAGO_LABEL[p.pago.estado] ?? p.pago.estado}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-400">
                        {new Date(p.fecha_creada).toLocaleDateString("es-AR", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                      {p.envio && (
                        <p className="text-xs text-stone-500">
                          Envío: {ENVIO_LABEL[p.envio.estado] ?? p.envio.estado}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="size-4 text-stone-400 shrink-0" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

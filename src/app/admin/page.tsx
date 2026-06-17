"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Settings,
  Clock,
  CheckCircle,
  XCircle,
  Package,
  Truck,
  RefreshCw,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type PedidoAdmin = {
  id_carrito: number;
  fecha_creada: string;
  estado: string;
  comprador: { nombre: string; email: string };
  pago: { estado: string } | null;
  envio: { estado: string; track_code: string | null } | null;
  _count: { items: number };
};

const PAGO_BADGE: Record<string, string> = {
  pendiente: "bg-yellow-100 text-yellow-800",
  aprobado:  "bg-green-100  text-green-800",
  rechazado: "bg-red-100    text-red-800",
};
const PAGO_LABEL: Record<string, string> = {
  pendiente: "Pago pendiente",
  aprobado:  "Pago aprobado",
  rechazado: "Pago rechazado",
};

const ENVIO_BADGE: Record<string, string> = {
  preparando: "bg-blue-100  text-blue-800",
  en_camino:  "bg-indigo-100 text-indigo-800",
  entregado:  "bg-green-100  text-green-800",
};
const ENVIO_LABEL: Record<string, string> = {
  preparando: "Preparando",
  en_camino:  "En camino",
  entregado:  "Entregado",
};

function EstadoBadge({ text, className }: { text: string; className: string }) {
  return (
    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", className)}>
      {text}
    </span>
  );
}

export default function AdminPage() {
  const [pedidos, setPedidos] = useState<PedidoAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [acciones, setAcciones] = useState<Record<number, string>>({});

  const cargarPedidos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/pedidos?limit=50");
      if (res.ok) {
        const data = await res.json();
        setPedidos(data.data ?? []);
      } else {
        toast.error("No se pudieron cargar los pedidos");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargarPedidos(); }, [cargarPedidos]);

  async function simularPago(id_carrito: number, estado: "aprobado" | "rechazado") {
    setAcciones((prev) => ({ ...prev, [id_carrito]: `pago-${estado}` }));
    try {
      const res = await fetch("/api/dev/simular-pago", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_carrito, estado }),
      });
      if (res.ok) {
        toast.success(estado === "aprobado" ? "Pago aprobado ✓" : "Pago rechazado");
        await cargarPedidos();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error?.message ?? "No se pudo simular el pago");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setAcciones((prev) => { const next = { ...prev }; delete next[id_carrito]; return next; });
    }
  }

  async function avanzarEnvio(id_carrito: number, estado: "en_camino" | "entregado") {
    setAcciones((prev) => ({ ...prev, [id_carrito]: `envio-${estado}` }));
    try {
      const res = await fetch("/api/dev/avanzar-envio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_carrito, estado }),
      });
      if (res.ok) {
        toast.success(estado === "en_camino" ? "Envío despachado ✓" : "Pedido entregado ✓");
        await cargarPedidos();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error?.message ?? "No se pudo actualizar el envío");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setAcciones((prev) => { const next = { ...prev }; delete next[id_carrito]; return next; });
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
            <Settings className="size-5 text-stone-600" />
            <span className="font-semibold tracking-tight">Panel de Administración</span>
          </div>
          {!loading && (
            <span className="text-sm text-stone-400">{pedidos.length} pedidos</span>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={cargarPedidos} disabled={loading} className="gap-1.5">
          <RefreshCw className={cn("size-4", loading && "animate-spin")} />
          Actualizar
        </Button>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="size-8 animate-spin rounded-full border-4 border-stone-200 border-t-stone-800" />
          </div>
        ) : pedidos.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-24 text-center">
            <Clock className="size-12 text-stone-300" />
            <p className="text-stone-500">No hay pedidos todavía.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pedidos.map((p) => {
              const accion = acciones[p.id_carrito];
              const enAccion = !!accion;

              return (
                <Card key={p.id_carrito} className="bg-white">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      {/* Info */}
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-stone-400">
                            #{p.id_carrito} · {new Date(p.fecha_creada).toLocaleDateString("es-AR")}
                          </span>
                          <span className="text-xs text-stone-400">·</span>
                          <span className="text-xs text-stone-500">{p._count.items} producto{p._count.items !== 1 ? "s" : ""}</span>
                        </div>
                        <p className="font-semibold text-stone-800">{p.comprador.nombre}</p>
                        <p className="text-sm text-stone-400">{p.comprador.email}</p>
                        <div className="flex items-center gap-2 flex-wrap mt-1.5">
                          {p.pago && (
                            <EstadoBadge
                              text={PAGO_LABEL[p.pago.estado] ?? p.pago.estado}
                              className={PAGO_BADGE[p.pago.estado] ?? "bg-stone-100 text-stone-600"}
                            />
                          )}
                          {p.envio && (
                            <EstadoBadge
                              text={ENVIO_LABEL[p.envio.estado] ?? p.envio.estado}
                              className={ENVIO_BADGE[p.envio.estado] ?? "bg-stone-100 text-stone-600"}
                            />
                          )}
                          {p.estado === "cancelado" && (
                            <EstadoBadge text="Cancelado" className="bg-red-100 text-red-700" />
                          )}
                        </div>
                      </div>

                      {/* Botones de simulación */}
                      <div className="flex flex-col gap-2 shrink-0">
                        {p.pago?.estado === "pendiente" && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              disabled={enAccion}
                              onClick={() => simularPago(p.id_carrito, "aprobado")}
                              className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                            >
                              <CheckCircle className="size-3.5" />
                              {accion === "pago-aprobado" ? "Aprobando…" : "Aprobar pago"}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={enAccion}
                              onClick={() => simularPago(p.id_carrito, "rechazado")}
                              className="gap-1.5"
                            >
                              <XCircle className="size-3.5" />
                              {accion === "pago-rechazado" ? "Rechazando…" : "Rechazar"}
                            </Button>
                          </div>
                        )}

                        {p.envio?.estado === "preparando" && (
                          <Button
                            size="sm"
                            disabled={enAccion}
                            onClick={() => avanzarEnvio(p.id_carrito, "en_camino")}
                            className="gap-1.5"
                          >
                            <Truck className="size-3.5" />
                            {accion === "envio-en_camino" ? "Despachando…" : "Marcar en camino"}
                          </Button>
                        )}

                        {p.envio?.estado === "en_camino" && (
                          <Button
                            size="sm"
                            disabled={enAccion}
                            onClick={() => avanzarEnvio(p.id_carrito, "entregado")}
                            className="gap-1.5"
                          >
                            <Package className="size-3.5" />
                            {accion === "envio-entregado" ? "Entregando…" : "Marcar entregado"}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

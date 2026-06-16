"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Droplets, MapPin, Pencil, Check, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Item = {
  cantidad: number;
  producto: {
    id_producto: number;
    nombre: string;
    marca: string;
    precio: number;
    concentracion: string | null;
  };
};

type CarritoData = { id_carrito: number | null; items: Item[]; total: number };
type Perfil = { nombre: string; email: string; direccion_envio: string; telefono: string };

export default function CheckoutPage() {
  const [carrito, setCarrito] = useState<CarritoData | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editandoDireccion, setEditandoDireccion] = useState(false);
  const [nuevaDireccion, setNuevaDireccion] = useState("");
  const [guardandoDireccion, setGuardandoDireccion] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/carrito").then((r) => r.json()),
      fetch("/api/auth/perfil").then((r) => r.ok ? r.json() : null),
    ]).then(([carritoData, perfilData]) => {
      setCarrito(carritoData);
      setPerfil(perfilData);
    }).finally(() => setLoading(false));
  }, []);

  async function handleGuardarDireccion() {
    if (!nuevaDireccion.trim()) return;
    setGuardandoDireccion(true);
    try {
      const res = await fetch("/api/auth/perfil", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direccion_envio: nuevaDireccion.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setPerfil(data);
        setEditandoDireccion(false);
      } else {
        setError("No se pudo actualizar la dirección. Intentá de nuevo.");
      }
    } catch {
      setError("Error de conexión al actualizar la dirección.");
    } finally {
      setGuardandoDireccion(false);
    }
  }

  async function handleConfirmar() {
    setConfirming(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error?.message ?? data.message ?? "Error al confirmar el pedido");
        return;
      }
      if (data.init_point) {
        window.location.href = data.init_point;
      } else {
        window.location.href = `/pedidos/${data.id_carrito}`;
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setConfirming(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-4 border-stone-200 border-t-stone-800" />
      </div>
    );
  }

  const items = carrito?.items ?? [];
  const total = carrito?.total ?? 0;

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="border-b bg-white px-6 py-4 flex items-center gap-4">
        <Link href="/carrito" className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}>
          <ArrowLeft className="size-4" />
        </Link>
        <div className="flex items-center gap-2">
          <Droplets className="size-5 text-stone-600" />
          <span className="font-semibold tracking-tight">Checkout</span>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 py-8 space-y-4">
        {items.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <p className="text-stone-500">No hay productos en tu carrito.</p>
            <Link href="/catalogo" className={buttonVariants({ variant: "outline" })}>
              Ver catálogo
            </Link>
          </div>
        ) : (
          <>
            {/* Dirección de envío */}
            <Card className="bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="size-4 text-stone-500" />
                  Dirección de envío
                </CardTitle>
              </CardHeader>
              <CardContent>
                {editandoDireccion ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={nuevaDireccion}
                      onChange={(e) => setNuevaDireccion(e.target.value)}
                      placeholder="Av. Corrientes 1234, CABA"
                      className="flex-1 rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-stone-900 transition-colors"
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={handleGuardarDireccion}
                      disabled={guardandoDireccion}
                      className="shrink-0"
                    >
                      <Check className="size-4 text-green-600" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setEditandoDireccion(false)}
                      disabled={guardandoDireccion}
                      className="shrink-0"
                    >
                      <X className="size-4 text-stone-400" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-stone-700">{perfil?.direccion_envio ?? "—"}</p>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setNuevaDireccion(perfil?.direccion_envio ?? "");
                        setEditandoDireccion(true);
                      }}
                      className="shrink-0"
                    >
                      <Pencil className="size-3.5 text-stone-400" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Resumen del pedido */}
            <Card className="bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Resumen del pedido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {items.map((item) => (
                  <div key={item.producto.id_producto} className="flex justify-between text-sm">
                    <div className="min-w-0 flex-1">
                      <span className="font-medium">{item.producto.nombre}</span>
                      <span className="text-stone-400 ml-1.5">× {item.cantidad}</span>
                    </div>
                    <span className="shrink-0 font-medium ml-4">
                      ${(item.producto.precio * item.cantidad).toLocaleString("es-AR")}
                    </span>
                  </div>
                ))}
                <div className="border-t pt-3 flex justify-between font-bold">
                  <span>Total</span>
                  <span>${total.toLocaleString("es-AR")}</span>
                </div>
              </CardContent>
            </Card>

            <div className="rounded-md bg-blue-50 border border-blue-200 px-4 py-2.5 text-sm text-blue-700">
              Serás redirigido a MercadoPago para completar el pago de forma segura.
            </div>

            {error && (
              <p className="rounded-md bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">
                {error}
              </p>
            )}

            <Button className="w-full" disabled={confirming} onClick={handleConfirmar}>
              {confirming ? "Redirigiendo a MercadoPago…" : "Pagar con MercadoPago"}
            </Button>
          </>
        )}
      </main>
    </div>
  );
}

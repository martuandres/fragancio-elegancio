"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Droplets, Package, Truck, CheckCircle, Clock, XCircle } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Item = {
  id_producto: number;
  nombre: string;
  marca: string;
  imagen_url: string | null;
  precio: number;
  concentracion: string | null;
  cantidad: number;
};

type Pedido = {
  id_carrito: number;
  fecha_creada: string;
  estado: string;
  items: Item[];
  pago: {
    id_pago: string;
    estado: string;
    factura: {
      nro_factura: string;
      fecha_emision: string;
      importe_total: number;
    } | null;
  } | null;
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

function EnvioStep({
  estado,
  current,
}: {
  estado: "preparando" | "en_camino" | "entregado";
  current: string | undefined;
}) {
  const steps = ["preparando", "en_camino", "entregado"] as const;
  const currentIdx = steps.indexOf(current as (typeof steps)[number]);
  const myIdx = steps.indexOf(estado);
  const done = currentIdx >= myIdx;

  const icons = {
    preparando: Package,
    en_camino:  Truck,
    entregado:  CheckCircle,
  };
  const labels = {
    preparando: "Preparando",
    en_camino:  "En camino",
    entregado:  "Entregado",
  };
  const Icon = icons[estado];

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={cn(
          "size-10 rounded-full flex items-center justify-center",
          done ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-400"
        )}
      >
        <Icon className="size-4" />
      </div>
      <span className="text-xs text-stone-500">{labels[estado]}</span>
    </div>
  );
}

export default function PedidoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/pedidos/${id}`)
      .then(async (r) => {
        if (!r.ok) {
          const d = await r.json();
          setError(d.message ?? "Error al cargar el pedido");
          return;
        }
        setPedido(await r.json());
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-4 border-stone-200 border-t-stone-800" />
      </div>
    );
  }

  if (error || !pedido) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <XCircle className="size-12 text-red-400 mx-auto" />
          <p className="text-stone-600">{error ?? "Pedido no encontrado"}</p>
          <Link href="/pedidos" className={buttonVariants({ variant: "outline" })}>
            Volver a mis pedidos
          </Link>
        </div>
      </div>
    );
  }

  const total =
    pedido.pago?.factura?.importe_total ??
    pedido.items.reduce((sum, item) => sum + item.precio * item.cantidad, 0);

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="border-b bg-white px-6 py-4 flex items-center gap-4">
        <Link href="/pedidos" className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}>
          <ArrowLeft className="size-4" />
        </Link>
        <div className="flex items-center gap-2">
          <Droplets className="size-5 text-stone-600" />
          <span className="font-semibold tracking-tight">Pedido #{pedido.id_carrito}</span>
        </div>
        {pedido.pago && (
          <span
            className={cn(
              "text-xs px-2 py-0.5 rounded-full ml-auto",
              PAGO_COLORS[pedido.pago.estado] ?? "bg-stone-100 text-stone-700"
            )}
          >
            {PAGO_LABEL[pedido.pago.estado] ?? pedido.pago.estado}
          </span>
        )}
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8 space-y-5">
        {/* Seguimiento del envío */}
        {pedido.envio && (
          <Card className="bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Estado del envío</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start justify-between">
                <EnvioStep estado="preparando" current={pedido.envio.estado} />
                <div className="flex-1 mt-5 mx-2 border-t-2 border-dashed border-stone-200" />
                <EnvioStep estado="en_camino"  current={pedido.envio.estado} />
                <div className="flex-1 mt-5 mx-2 border-t-2 border-dashed border-stone-200" />
                <EnvioStep estado="entregado"  current={pedido.envio.estado} />
              </div>
              {pedido.envio.track_code && (
                <p className="text-xs text-stone-500">
                  Código de seguimiento:{" "}
                  <span className="font-mono font-medium text-stone-700">
                    {pedido.envio.track_code}
                  </span>
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Productos */}
        <Card className="bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Productos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {pedido.items.map((item) => (
              <div key={item.id_producto} className="flex items-center gap-3">
                <div className="size-14 shrink-0 rounded-md overflow-hidden bg-stone-100">
                  {item.imagen_url ? (
                    <Image
                      src={item.imagen_url}
                      alt={item.nombre}
                      width={56}
                      height={56}
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="size-full flex items-center justify-center">
                      <Package className="size-5 text-stone-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs uppercase tracking-wider text-stone-500">{item.marca}</p>
                  <p className="font-medium text-stone-800 truncate">{item.nombre}</p>
                  {item.concentracion && (
                    <p className="text-xs text-stone-400">{item.concentracion}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-stone-800">
                    ${(item.precio * item.cantidad).toLocaleString("es-AR")}
                  </p>
                  <p className="text-xs text-stone-400">
                    ${item.precio.toLocaleString("es-AR")} × {item.cantidad}
                  </p>
                </div>
              </div>
            ))}
            <div className="border-t pt-3 flex justify-between font-bold">
              <span>Total</span>
              <span>${Number(total).toLocaleString("es-AR")}</span>
            </div>
          </CardContent>
        </Card>

        {/* Info del pago */}
        {pedido.pago?.factura && (
          <Card className="bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Factura</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-stone-500">N° de factura</span>
                <span className="font-mono text-xs text-stone-700">
                  {pedido.pago.factura.nro_factura}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Fecha de emisión</span>
                <span>
                  {new Date(pedido.pago.factura.fecha_emision).toLocaleDateString("es-AR")}
                </span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Total facturado</span>
                <span>
                  ${Number(pedido.pago.factura.importe_total).toLocaleString("es-AR")}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Fecha */}
        <p className="text-xs text-stone-400 text-center">
          Pedido creado el{" "}
          {new Date(pedido.fecha_creada).toLocaleDateString("es-AR", {
            day: "2-digit",
            month: "long",
            year: "numeric",
          })}
        </p>
      </main>
    </div>
  );
}

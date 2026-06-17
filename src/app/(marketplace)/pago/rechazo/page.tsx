"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { XCircle, Loader2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Suspense, useEffect, useState } from "react";

type Estado = "cargando" | "listo" | "error";

function RechazoContent() {
  const params = useSearchParams();
  const idCarrito = params.get("external_reference");
  const paymentId = params.get("collection_id") ?? params.get("payment_id");

  const [estado, setEstado] = useState<Estado>(paymentId ? "cargando" : "listo");

  useEffect(() => {
    if (!paymentId) return;

    fetch("/api/pagos/confirmar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payment_id: paymentId }),
    })
      .then(() => setEstado("listo"))
      .catch(() => setEstado("error"));
  }, [paymentId]);

  if (estado === "cargando") {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="size-10 animate-spin text-stone-400 mx-auto" />
          <p className="text-sm text-stone-500">Procesando…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-5">
        <XCircle className="size-16 text-red-400 mx-auto" />
        <h1 className="text-2xl font-bold text-stone-800">Pago rechazado</h1>
        <p className="text-stone-500 text-sm">
          Tu pago no pudo procesarse. El stock del pedido fue liberado. Podés intentar nuevamente.
        </p>
        {idCarrito && (
          <Card className="bg-white text-left">
            <CardContent className="p-4">
              <div className="flex justify-between text-sm">
                <span className="text-stone-500">N° de pedido</span>
                <span className="font-mono font-medium">#{idCarrito}</span>
              </div>
            </CardContent>
          </Card>
        )}
        <div className="flex flex-col gap-2">
          <Link href="/catalogo" className={buttonVariants()}>
            Volver al catálogo
          </Link>
          {idCarrito && (
            <Link href={`/pedidos/${idCarrito}`} className={buttonVariants({ variant: "outline" })}>
              Ver detalle del pedido
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PagoRechazoPage() {
  return (
    <Suspense>
      <RechazoContent />
    </Suspense>
  );
}

"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Suspense, useEffect, useState } from "react";

type Estado = "cargando" | "aprobado" | "pendiente" | "error";

function ExitoContent() {
  const params = useSearchParams();
  const idCarrito = params.get("external_reference");
  const paymentId = params.get("collection_id") ?? params.get("payment_id");

  const [estado, setEstado] = useState<Estado>(paymentId ? "cargando" : "aprobado");

  useEffect(() => {
    if (!paymentId) return;

    fetch("/api/pagos/confirmar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payment_id: paymentId }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && data.estado === "aprobado") setEstado("aprobado");
        else if (!data.ok && data.motivo === "estado_no_definitivo") setEstado("pendiente");
        else if (!data.ok && data.motivo === "pago_ya_procesado") setEstado("aprobado");
        else setEstado("aprobado");
      })
      .catch(() => setEstado("error"));
  }, [paymentId]);

  if (estado === "cargando") {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="size-10 animate-spin text-stone-400 mx-auto" />
          <p className="text-sm text-stone-500">Confirmando tu pago…</p>
        </div>
      </div>
    );
  }

  if (estado === "pendiente") {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-5">
          <AlertCircle className="size-16 text-yellow-400 mx-auto" />
          <h1 className="text-2xl font-bold text-stone-800">Pago en proceso</h1>
          <p className="text-stone-500 text-sm">
            Tu pago está siendo verificado. Te notificaremos por email cuando se confirme.
          </p>
          {idCarrito && (
            <Link href={`/pedidos/${idCarrito}`} className={buttonVariants()}>
              Ver estado del pedido
            </Link>
          )}
        </div>
      </div>
    );
  }

  if (estado === "error") {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-5">
          <AlertCircle className="size-16 text-stone-400 mx-auto" />
          <h1 className="text-2xl font-bold text-stone-800">Pago recibido</h1>
          <p className="text-stone-500 text-sm">
            Tu pago fue procesado en MercadoPago. Revisá el estado en Mis pedidos.
          </p>
          {idCarrito ? (
            <Link href={`/pedidos/${idCarrito}`} className={buttonVariants()}>
              Ver mi pedido
            </Link>
          ) : (
            <Link href="/pedidos" className={buttonVariants()}>
              Ver mis pedidos
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-5">
        <CheckCircle className="size-16 text-green-500 mx-auto" />
        <h1 className="text-2xl font-bold text-stone-800">¡Pago aprobado!</h1>
        <p className="text-stone-500 text-sm">
          Tu pago fue procesado correctamente. En breve recibirás la confirmación por email.
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
        {idCarrito ? (
          <Link href={`/pedidos/${idCarrito}`} className={buttonVariants()}>
            Ver mi pedido
          </Link>
        ) : (
          <Link href="/pedidos" className={buttonVariants()}>
            Ver mis pedidos
          </Link>
        )}
      </div>
    </div>
  );
}

export default function PagoExitoPage() {
  return (
    <Suspense>
      <ExitoContent />
    </Suspense>
  );
}

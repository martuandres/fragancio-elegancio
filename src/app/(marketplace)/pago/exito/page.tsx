"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle, Loader2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Suspense, useEffect, useState } from "react";

function ExitoContent() {
  const params = useSearchParams();
  const idCarrito = params.get("external_reference");
  const [listo, setListo] = useState(false);

  useEffect(() => {
    if (!idCarrito) {
      setListo(true);
      return;
    }

    fetch("/api/pagos/aprobar-exito", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_carrito: Number(idCarrito) }),
    }).finally(() => setListo(true));
  }, [idCarrito]);

  if (!listo) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="size-10 animate-spin text-stone-400 mx-auto" />
          <p className="text-sm text-stone-500">Confirmando tu pago…</p>
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
          Tu compra fue confirmada. En breve recibirás la confirmación por email.
        </p>
        <div className="flex flex-col gap-2">
          {idCarrito && (
            <Link href={`/pedidos/${idCarrito}`} className={buttonVariants()}>
              Ver mi pedido
            </Link>
          )}
          <Link href="/catalogo" className={buttonVariants({ variant: "outline" })}>
            Volver a la tienda
          </Link>
        </div>
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

"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { XCircle } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Suspense } from "react";

function RechazoContent() {
  const params = useSearchParams();
  const idCarrito = params.get("external_reference");

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

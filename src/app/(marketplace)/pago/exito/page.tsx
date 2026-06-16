"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Suspense } from "react";

function ExitoContent() {
  const params = useSearchParams();
  const idCarrito = params.get("external_reference");

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

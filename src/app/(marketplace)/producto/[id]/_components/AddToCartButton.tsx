"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Check, Loader2 } from "lucide-react";

type Status = "idle" | "loading" | "done" | "error";

export function AddToCartButton({
  id_producto,
  disabled = false,
}: {
  id_producto: number;
  disabled?: boolean;
}) {
  const [status, setStatus] = useState<Status>("idle");

  async function handleClick() {
    setStatus("loading");
    try {
      const res = await fetch("/api/carrito", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_producto, cantidad: 1 }),
      });
      setStatus(res.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
    setTimeout(() => setStatus("idle"), 2000);
  }

  const label =
    status === "loading" ? "Agregando..." :
    status === "done"    ? "¡Agregado!" :
    status === "error"   ? "Error, reintentá" :
    "Agregar al carrito";

  return (
    <Button
      onClick={handleClick}
      disabled={disabled || status === "loading" || status === "done"}
      className="w-full gap-2"
    >
      {status === "loading" && <Loader2 className="size-4 animate-spin" />}
      {status === "done"    && <Check className="size-4" />}
      {status === "idle"    && <ShoppingBag className="size-4" />}
      {label}
    </Button>
  );
}

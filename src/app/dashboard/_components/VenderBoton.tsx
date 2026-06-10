"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { toast } from "sonner";

export function VenderBoton({ isVendedor }: { isVendedor: boolean }) {
  if (isVendedor) {
    return (
      <Link href="/vendedor" className={buttonVariants({ variant: "outline", size: "sm", className: "w-full" })}>
        Ir al panel <ArrowRight className="ml-1 size-4" />
      </Link>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="w-full"
      onClick={() =>
        toast.error("Para vender fragancias necesitás una cuenta de vendedor. Creá una nueva cuenta con el rol vendedor.")
      }
    >
      Ir al panel <ArrowRight className="ml-1 size-4" />
    </Button>
  );
}

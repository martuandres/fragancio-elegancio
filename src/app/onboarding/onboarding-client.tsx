"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingBag, Store, ArrowRight } from "lucide-react";

type Role = "comprador" | "vendedor" | "admin";

const ROLE_REDIRECT: Record<Role, string> = {
  comprador: "/catalogo",
  vendedor: "/dashboard",
  admin: "/dashboard",
};

export function OnboardingClient() {
  const router = useRouter();
  const [loading, setLoading] = useState<Role | null>(null);

  useEffect(() => {
    const pending = localStorage.getItem("pendingRole") as Role | null;
    if (pending && ["comprador", "vendedor", "admin"].includes(pending)) {
      localStorage.removeItem("pendingRole");
      choose(pending);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function choose(role: Role) {
    setLoading(role);
    const res = await fetch("/api/auth/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (res.ok) {
      router.push(ROLE_REDIRECT[role]);
    } else {
      setLoading(null);
    }
  }

  return (
    <main className="min-h-screen bg-stone-50 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-lg space-y-8">
        <div className="text-center">
          <span className="text-2xl font-light tracking-[0.3em] uppercase">
            Fragance
          </span>
          <span className="text-2xl font-semibold tracking-[0.3em] uppercase ml-2">
            Elegancio
          </span>
        </div>

        <div className="text-center">
          <h1 className="text-2xl font-semibold text-stone-800">
            ¿Cómo querés usar la plataforma?
          </h1>
          <p className="mt-2 text-stone-500">
            Podés cambiar esto más adelante desde tu perfil.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => choose("comprador")}
            disabled={loading !== null}
            className="group relative flex items-start gap-4 rounded-2xl border-2 border-stone-200 bg-white p-6 text-left transition-all hover:border-stone-900 hover:shadow-lg disabled:opacity-60 cursor-pointer"
          >
            <div className="size-12 shrink-0 rounded-xl bg-stone-100 flex items-center justify-center group-hover:bg-stone-900 transition-colors mt-0.5">
              <ShoppingBag className="size-6 text-stone-600 group-hover:text-white transition-colors" />
            </div>
            <div>
              <p className="font-semibold text-stone-800 text-lg">Quiero comprar</p>
              <p className="mt-1 text-sm text-stone-500">
                Explorá fragancias exclusivas de vendedores especializados.
              </p>
            </div>
            <ArrowRight className="absolute right-5 bottom-5 size-4 text-stone-300 group-hover:text-stone-900 transition-colors" />
            {loading === "comprador" && <Spinner />}
          </button>

          <button
            onClick={() => choose("vendedor")}
            disabled={loading !== null}
            className="group relative flex items-start gap-4 rounded-2xl border-2 border-stone-200 bg-white p-6 text-left transition-all hover:border-stone-900 hover:shadow-lg disabled:opacity-60 cursor-pointer"
          >
            <div className="size-12 shrink-0 rounded-xl bg-stone-100 flex items-center justify-center group-hover:bg-stone-900 transition-colors mt-0.5">
              <Store className="size-6 text-stone-600 group-hover:text-white transition-colors" />
            </div>
            <div>
              <p className="font-semibold text-stone-800 text-lg">Quiero vender</p>
              <p className="mt-1 text-sm text-stone-500">
                Publicá tus fragancias y llegá a compradores de todo el país.
              </p>
            </div>
            <ArrowRight className="absolute right-5 bottom-5 size-4 text-stone-300 group-hover:text-stone-900 transition-colors" />
            {loading === "vendedor" && <Spinner />}
          </button>

        </div>
      </div>
    </main>
  );
}

function Spinner() {
  return (
    <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/70">
      <div className="size-5 border-2 border-stone-900 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

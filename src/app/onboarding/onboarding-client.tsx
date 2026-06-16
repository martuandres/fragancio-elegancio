"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShoppingBag, Store, ArrowRight, MapPin, Phone } from "lucide-react";

type Role = "comprador" | "vendedor" | "admin";

const ROLE_REDIRECT: Record<Role, string> = {
  comprador: "/catalogo",
  vendedor: "/dashboard",
  admin: "/dashboard",
};

export function OnboardingClient() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [direccion, setDireccion] = useState("");
  const [telefono, setTelefono] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const pending = localStorage.getItem("pendingRole") as Role | null;
    if (pending === "vendedor" || pending === "admin") {
      localStorage.removeItem("pendingRole");
      elegirVendedor();
    } else if (pending === "comprador") {
      localStorage.removeItem("pendingRole");
      setStep(2);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function elegirVendedor() {
    setLoading(true);
    const res = await fetch("/api/auth/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "vendedor" }),
    });
    if (res.ok) {
      router.push(ROLE_REDIRECT["vendedor"]);
    } else {
      setLoading(false);
    }
  }

  async function confirmarComprador() {
    setError(null);
    if (!direccion.trim()) { setError("La dirección de envío es obligatoria."); return; }
    if (!telefono.trim()) { setError("El teléfono es obligatorio."); return; }

    setLoading(true);
    const res = await fetch("/api/auth/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "comprador", direccion_envio: direccion.trim(), telefono: telefono.trim() }),
    });
    if (res.ok) {
      router.push(ROLE_REDIRECT["comprador"]);
    } else {
      setLoading(false);
      setError("Ocurrió un error al guardar tus datos. Intentá de nuevo.");
    }
  }

  return (
    <main className="min-h-screen bg-stone-50 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-lg space-y-8">
        <div className="text-center">
          <span className="text-2xl font-light tracking-[0.3em] uppercase">Fragance</span>
          <span className="text-2xl font-semibold tracking-[0.3em] uppercase ml-2">Elegancio</span>
        </div>

        {step === 1 ? (
          <>
            <div className="text-center">
              <h1 className="text-2xl font-semibold text-stone-800">¿Cómo querés usar la plataforma?</h1>
              <p className="mt-2 text-stone-500">Podés cambiar esto más adelante desde tu perfil.</p>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => setStep(2)}
                disabled={loading}
                className="group relative flex items-start gap-4 rounded-2xl border-2 border-stone-200 bg-white p-6 text-left transition-all hover:border-stone-900 hover:shadow-lg disabled:opacity-60 cursor-pointer"
              >
                <div className="size-12 shrink-0 rounded-xl bg-stone-100 flex items-center justify-center group-hover:bg-stone-900 transition-colors mt-0.5">
                  <ShoppingBag className="size-6 text-stone-600 group-hover:text-white transition-colors" />
                </div>
                <div>
                  <p className="font-semibold text-stone-800 text-lg">Quiero comprar</p>
                  <p className="mt-1 text-sm text-stone-500">Explorá fragancias exclusivas de vendedores especializados.</p>
                </div>
                <ArrowRight className="absolute right-5 bottom-5 size-4 text-stone-300 group-hover:text-stone-900 transition-colors" />
              </button>

              <button
                onClick={elegirVendedor}
                disabled={loading}
                className="group relative flex items-start gap-4 rounded-2xl border-2 border-stone-200 bg-white p-6 text-left transition-all hover:border-stone-900 hover:shadow-lg disabled:opacity-60 cursor-pointer"
              >
                <div className="size-12 shrink-0 rounded-xl bg-stone-100 flex items-center justify-center group-hover:bg-stone-900 transition-colors mt-0.5">
                  <Store className="size-6 text-stone-600 group-hover:text-white transition-colors" />
                </div>
                <div>
                  <p className="font-semibold text-stone-800 text-lg">Quiero vender</p>
                  <p className="mt-1 text-sm text-stone-500">Publicá tus fragancias y llegá a compradores de todo el país.</p>
                </div>
                <ArrowRight className="absolute right-5 bottom-5 size-4 text-stone-300 group-hover:text-stone-900 transition-colors" />
                {loading && <Spinner />}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="text-center">
              <h1 className="text-2xl font-semibold text-stone-800">Datos de envío</h1>
              <p className="mt-2 text-stone-500">Los necesitamos para poder entregar tus pedidos.</p>
            </div>

            <div className="flex flex-col gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-stone-700 flex items-center gap-1.5">
                  <MapPin className="size-4" /> Dirección de envío
                </label>
                <input
                  type="text"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  placeholder="Av. Corrientes 1234, CABA"
                  disabled={loading}
                  className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none focus:border-stone-900 transition-colors disabled:opacity-60"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-stone-700 flex items-center gap-1.5">
                  <Phone className="size-4" /> Teléfono
                </label>
                <input
                  type="tel"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="1145678901"
                  disabled={loading}
                  className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none focus:border-stone-900 transition-colors disabled:opacity-60"
                />
              </div>

              {error && (
                <p className="rounded-lg bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">{error}</p>
              )}

              <button
                onClick={confirmarComprador}
                disabled={loading}
                className="relative w-full rounded-2xl bg-stone-900 px-6 py-4 text-white font-semibold hover:bg-stone-800 transition-colors disabled:opacity-60 cursor-pointer"
              >
                {loading ? "Guardando…" : "Continuar al catálogo"}
                {loading && <Spinner />}
              </button>

              <button
                onClick={() => { setStep(1); setError(null); }}
                disabled={loading}
                className="text-sm text-stone-400 hover:text-stone-600 transition-colors"
              >
                ← Volver
              </button>
            </div>
          </>
        )}
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

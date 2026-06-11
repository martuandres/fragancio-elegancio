"use client";

import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { useState } from "react";
import { ShoppingBag, Store, ArrowRight } from "lucide-react";

type Role = "comprador" | "vendedor";

const roles: { id: Role; label: string; description: string; icon: React.ElementType; badge?: string }[] = [
  {
    id: "comprador",
    label: "Quiero comprar",
    description: "Explorá fragancias exclusivas de vendedores especializados.",
    icon: ShoppingBag,
  },
  {
    id: "vendedor",
    label: "Quiero vender",
    description: "Publicá tus fragancias y llegá a compradores de todo el país.",
    icon: Store,
  },
];

export default function SignUpPage() {
  const [step, setStep] = useState<1 | 2>(1);

  function handleRoleSelect(role: Role) {
    localStorage.setItem("pendingRole", role);
    setStep(2);
  }

  return (
    <main className="flex min-h-screen">
      {/* Branding panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-stone-900 text-white p-12">
        <div>
          <span className="text-2xl font-light tracking-[0.3em] uppercase">
            Fragance
          </span>
          <span className="text-2xl font-semibold tracking-[0.3em] uppercase ml-2">
            Elegancio
          </span>
        </div>

        <div className="space-y-6">
          <h1 className="text-5xl font-light leading-tight">
            Unite a nuestra
            <br />
            <span className="italic">comunidad</span>
          </h1>
          <p className="text-stone-400 text-lg leading-relaxed max-w-sm">
            Comprá o vendé fragancias exclusivas. Conectamos coleccionistas y
            vendedores especializados.
          </p>
        </div>

        <p className="text-stone-600 text-sm">
          © {new Date().getFullYear()} Fragance Elegancio
        </p>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 flex-col items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-sm space-y-6">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <span className="text-xl font-light tracking-widest uppercase">
              Fragance
            </span>
            <span className="text-xl font-semibold tracking-widest uppercase ml-1">
              Elegancio
            </span>
          </div>

          {step === 1 ? (
            <>
              <div className="text-center">
                <h2 className="text-2xl font-semibold text-stone-800">
                  Crear cuenta
                </h2>
                <p className="mt-1 text-sm text-stone-500">
                  ¿Cómo querés usar la plataforma?
                </p>
              </div>

              <div className="flex flex-col gap-3">
                {roles.map(({ id, label, description, icon: Icon, badge }) => (
                  <button
                    key={id}
                    onClick={() => handleRoleSelect(id)}
                    className="group relative flex items-start gap-4 rounded-2xl border-2 border-stone-200 bg-white p-5 text-left transition-all hover:border-stone-900 hover:shadow-md cursor-pointer"
                  >
                    <div className="size-10 shrink-0 rounded-xl bg-stone-100 flex items-center justify-center group-hover:bg-stone-900 transition-colors mt-0.5">
                      <Icon className="size-5 text-stone-600 group-hover:text-white transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-stone-800">{label}</p>
                        {badge && (
                          <span className="text-xs bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full">
                            {badge}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-sm text-stone-500">{description}</p>
                    </div>
                    <ArrowRight className="size-4 text-stone-300 group-hover:text-stone-900 transition-colors shrink-0 mt-1" />
                  </button>
                ))}
              </div>

              <p className="text-center text-sm text-stone-500">
                ¿Ya tenés cuenta?{" "}
                <Link
                  href="/sign-in"
                  className="font-medium text-stone-800 hover:underline"
                >
                  Iniciá sesión
                </Link>
              </p>
            </>
          ) : (
            <>
              <div className="text-center">
                <h2 className="text-2xl font-semibold text-stone-800">
                  Crear cuenta
                </h2>
                <p className="mt-1 text-sm text-stone-500">
                  Registrate para empezar a explorar
                </p>
              </div>

              <button
                onClick={() => setStep(1)}
                className="text-sm text-stone-500 hover:text-stone-800 flex items-center gap-1 transition-colors"
              >
                ← Cambiar rol seleccionado
              </button>

              <SignUp
                forceRedirectUrl="/onboarding"
                signInUrl="/sign-in"
                appearance={{
                  elements: {
                    rootBox: "w-full",
                    card: "shadow-none p-0 bg-transparent",
                    headerTitle: "hidden",
                    headerSubtitle: "hidden",
                    socialButtonsBlockButton:
                      "border border-stone-300 hover:bg-stone-50",
                    formButtonPrimary:
                      "bg-stone-900 hover:bg-stone-700 text-white",
                    footerActionLink: "text-stone-700 hover:text-stone-900",
                  },
                }}
              />

              <p className="text-center text-sm text-stone-500">
                ¿Ya tenés cuenta?{" "}
                <Link
                  href="/sign-in"
                  className="font-medium text-stone-800 hover:underline"
                >
                  Iniciá sesión
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

import { SignIn } from "@clerk/nextjs";
import Link from "next/link";

export default function SignInPage() {
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
            El arte de la
            <br />
            <span className="italic">fragancia</span>
          </h1>
          <p className="text-stone-400 text-lg leading-relaxed max-w-sm">
            Descubrí fragancias únicas de vendedores especializados. Cada nota,
            una historia.
          </p>
        </div>

        <p className="text-stone-600 text-sm">
          © {new Date().getFullYear()} Fragance Elegancio
        </p>
      </div>

      {/* Sign-in panel */}
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

          <div className="text-center">
            <h2 className="text-2xl font-semibold text-stone-800">
              Iniciar sesión
            </h2>
            <p className="mt-1 text-sm text-stone-500">
              Ingresá a tu cuenta para continuar
            </p>
          </div>

          <SignIn
            forceRedirectUrl="/dashboard"
            signUpUrl="/sign-up"
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
            ¿No tenés cuenta?{" "}
            <Link
              href="/sign-up"
              className="font-medium text-stone-800 hover:underline"
            >
              Registrate
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

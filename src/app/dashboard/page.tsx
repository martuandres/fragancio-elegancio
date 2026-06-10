import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import {
  ShoppingBag,
  Package,
  Heart,
  TrendingUp,
  ArrowRight,
  Sparkles,
  Store,
} from "lucide-react";
import Link from "next/link";
import { VenderBoton } from "./_components/VenderBoton";

export default async function DashboardPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const firstName = user.firstName ?? user.emailAddresses[0]?.emailAddress ?? "Usuario";
  const role = (user.publicMetadata as { role?: string } | undefined)?.role;

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Top bar */}
      <header className="border-b bg-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-lg font-light tracking-[0.2em] uppercase">
            Fragance
          </span>
          <span className="text-lg font-semibold tracking-[0.2em] uppercase">
            Elegancio
          </span>
        </div>
        <div className="flex items-center gap-3">
          {user.imageUrl && (
            <img
              src={user.imageUrl}
              alt={firstName}
              className="size-8 rounded-full object-cover"
            />
          )}
          <span className="text-sm text-stone-600 hidden sm:block">
            {firstName}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10 space-y-10">
        {/* Welcome */}
        <div>
          <h1 className="text-3xl font-semibold text-stone-800">
            Bienvenido, {firstName}
          </h1>
          <p className="mt-1 text-stone-500">
            Explorá el mundo de las fragancias exclusivas.
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Pedidos", value: "0", icon: ShoppingBag },
            { label: "Favoritos", value: "0", icon: Heart },
            { label: "Productos", value: "0", icon: Package },
            { label: "Reseñas", value: "0", icon: TrendingUp },
          ].map(({ label, value, icon: Icon }) => (
            <Card key={label} className="bg-white">
              <CardContent className="pt-6 flex flex-col items-center gap-2">
                <div className="size-10 rounded-full bg-stone-100 flex items-center justify-center">
                  <Icon className="size-5 text-stone-600" />
                </div>
                <p className="text-2xl font-bold text-stone-800">{value}</p>
                <p className="text-xs text-stone-500">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick actions */}
        <div>
          <h2 className="text-lg font-semibold text-stone-700 mb-4">
            ¿Qué querés hacer?
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="bg-white hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="size-10 rounded-lg bg-stone-900 flex items-center justify-center mb-2">
                  <Sparkles className="size-5 text-white" />
                </div>
                <CardTitle className="text-base">Explorar Catálogo</CardTitle>
                <CardDescription>
                  Descubrí fragancias únicas de vendedores especializados.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/catalogo" className={buttonVariants({ variant: "outline", size: "sm", className: "w-full" })}>
                  Ver catálogo <ArrowRight className="ml-1 size-4" />
                </Link>
              </CardContent>
            </Card>

            <Card className="bg-white hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="size-10 rounded-lg bg-stone-900 flex items-center justify-center mb-2">
                  <ShoppingBag className="size-5 text-white" />
                </div>
                <CardTitle className="text-base">Mis Pedidos</CardTitle>
                <CardDescription>
                  Seguí el estado de tus compras y revisá tu historial.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/pedidos" className={buttonVariants({ variant: "outline", size: "sm", className: "w-full" })}>
                  Ver pedidos <ArrowRight className="ml-1 size-4" />
                </Link>
              </CardContent>
            </Card>

            <Card className="bg-white hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="size-10 rounded-lg bg-stone-900 flex items-center justify-center mb-2">
                  <Store className="size-5 text-white" />
                </div>
                <CardTitle className="text-base">Vender Fragancias</CardTitle>
                <CardDescription>
                  Publicá tus fragancias y llegá a compradores de todo el país.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <VenderBoton isVendedor={role === "vendedor"} />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

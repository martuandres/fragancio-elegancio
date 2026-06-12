import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";

async function resolveVendedor() {
  const { userId } = await auth();
  if (!userId) return null;

  const clerk = await clerkClient();
  const clerkUser = await clerk.users.getUser(userId);
  const role = (clerkUser.publicMetadata as { role?: string } | undefined)?.role;
  if (role !== "vendedor" && role !== "admin") return null;

  const email = clerkUser.emailAddresses[0]?.emailAddress;
  if (!email) return null;

  const vendedor = await prisma.vendedor.findFirst({
    where: { email },
    select: { id_vendedor: true },
  });

  return vendedor ?? null;
}

// GET /api/vendedor/envios — envíos en estado "preparando" del vendedor autenticado
export async function GET() {
  const vendedor = await resolveVendedor();
  if (!vendedor)
    return apiError("NO_AUTENTICADO", "Autenticación requerida. Solo vendedores pueden acceder.", 401);

  const envios = await prisma.envio.findMany({
    where: {
      estado: "preparando",
      carrito: {
        items: {
          some: {
            producto: {
              vendedores: {
                some: { id_vendedor: vendedor.id_vendedor },
              },
            },
          },
        },
      },
    },
    select: {
      id_envio: true,
      id_carrito: true,
      estado: true,
      track_code: true,
      carrito: {
        select: {
          id_carrito: true,
          fecha_creada: true,
          comprador: {
            select: { nombre: true, email: true, direccion_envio: true },
          },
          items: {
            select: {
              cantidad: true,
              producto: {
                select: {
                  id_producto: true,
                  nombre: true,
                  marca: true,
                  imagen_url: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: { id_carrito: "asc" },
  });

  return Response.json({ data: envios });
}

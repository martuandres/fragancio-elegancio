import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";
import { NextRequest } from "next/server";

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

const ESTADOS_ENVIO = ["preparando", "en_camino", "entregado"] as const;
type EstadoEnvio = (typeof ESTADOS_ENVIO)[number];

// GET /api/vendedor/envios — envíos del vendedor autenticado, filtrados por estado
export async function GET(req: NextRequest) {
  const vendedor = await resolveVendedor();
  if (!vendedor)
    return apiError("NO_AUTENTICADO", "Autenticación requerida. Solo vendedores pueden acceder.", 401);

  const { searchParams } = req.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const skip = (page - 1) * limit;

  const estadoParam = (searchParams.get("estado") ?? "preparando") as EstadoEnvio;
  if (!ESTADOS_ENVIO.includes(estadoParam))
    return apiError("ESTADO_INVALIDO", `El estado debe ser uno de: ${ESTADOS_ENVIO.join(", ")}.`, 400);

  const where = {
    estado: estadoParam,
    carrito: {
      items: {
        some: {
          producto: {
            vendedores: { some: { id_vendedor: vendedor.id_vendedor } },
          },
        },
      },
    },
  };

  const [envios, total] = await Promise.all([
    prisma.envio.findMany({
      where,
      skip,
      take: limit,
      orderBy: { id_carrito: "asc" },
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
              where: {
                producto: {
                  vendedores: { some: { id_vendedor: vendedor.id_vendedor } },
                },
              },
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
    }),
    prisma.envio.count({ where }),
  ]);

  return Response.json({
    data: envios,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

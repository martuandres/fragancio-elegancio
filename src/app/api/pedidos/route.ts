import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";
import { NextRequest } from "next/server";

async function resolveComprador() {
  const { userId } = await auth();
  if (!userId) return null;

  const clerk = await clerkClient();
  const clerkUser = await clerk.users.getUser(userId);
  const role = (clerkUser.publicMetadata as { role?: string } | undefined)?.role;
  if (role !== "comprador" && role !== "admin") return null;

  const email = clerkUser.emailAddresses[0]?.emailAddress;
  if (!email) return null;

  return prisma.comprador.findFirst({
    where: { email },
    select: { legajo: true },
  });
}

// GET /api/pedidos — historial de compras del comprador (carritos convertidos con su pago)
export async function GET(req: NextRequest) {
  const comprador = await resolveComprador();
  if (!comprador)
    return apiError("NO_AUTENTICADO", "Autenticación requerida. Solo compradores pueden ver sus pedidos.", 401);

  const { searchParams } = req.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const skip = (page - 1) * limit;

  const where = { legajo: comprador.legajo, estado: { not: "activo" } };

  const [carritos, total] = await Promise.all([
    prisma.carrito.findMany({
      where,
      skip,
      take: limit,
      select: {
        id_carrito: true,
        fecha_creada: true,
        estado: true,
        pago: { select: { id_pago: true, estado: true } },
        envio: { select: { id_envio: true, estado: true, track_code: true } },
      },
      orderBy: { fecha_creada: "desc" },
    }),
    prisma.carrito.count({ where }),
  ]);

  return Response.json({
    data: carritos,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

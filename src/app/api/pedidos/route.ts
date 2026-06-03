import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";
import { NextRequest } from "next/server";

async function resolveComprador() {
  const { userId, sessionClaims } = await auth();
  if (!userId) return null;

  const role = (sessionClaims?.publicMetadata as { role?: string } | undefined)?.role;
  if (role !== "comprador") return null;

  const clerk = await clerkClient();
  const clerkUser = await clerk.users.getUser(userId);
  const email = clerkUser.emailAddresses[0]?.emailAddress;
  if (!email) return null;

  return prisma.usuario.findUnique({
    where: { email },
    select: { id_usuario: true },
  });
}

// GET /api/pedidos — historial de órdenes del comprador autenticado (paginado)
export async function GET(req: NextRequest) {
  const usuario = await resolveComprador();
  if (!usuario)
    return apiError("NO_AUTENTICADO", "Autenticación requerida. Solo compradores pueden ver sus pedidos.", 401);

  const { searchParams } = req.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const skip = (page - 1) * limit;

  const where = { id_usuario: usuario.id_usuario };

  const [ordenes, total] = await Promise.all([
    prisma.ordenCompra.findMany({
      where,
      skip,
      take: limit,
      select: {
        id_pedido: true,
        fecha_creada: true,
        estado: true,
        importe_total: true,
        enviado: true,
        direccion_envio: true,
        pago: { select: { id_pago: true, estado: true, total: true } },
        envio: { select: { id_envio: true, estado: true, track_code: true } },
      },
      orderBy: { fecha_creada: "desc" },
    }),
    prisma.ordenCompra.count({ where }),
  ]);

  return Response.json({
    data: ordenes,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

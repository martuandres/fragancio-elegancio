import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";
import { NextRequest } from "next/server";

// GET /api/admin/pedidos — todos los pedidos del sistema para el panel de administración.
// Por ahora solo requiere autenticación; el chequeo role === "admin" se agrega cuando
// se implemente el módulo de roles del sistema.
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId)
    return apiError("NO_AUTENTICADO", "Se requiere autenticación.", 401);

  const { searchParams } = req.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const skip = (page - 1) * limit;

  const where = { estado: { not: "activo" } };

  const [carritos, total] = await Promise.all([
    prisma.carrito.findMany({
      where,
      skip,
      take: limit,
      select: {
        id_carrito: true,
        fecha_creada: true,
        estado: true,
        comprador: { select: { nombre: true, email: true } },
        pago: { select: { estado: true } },
        envio: { select: { estado: true, track_code: true } },
        _count: { select: { items: true } },
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

import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getRecomendaciones } from "@/lib/recomendaciones";
import { apiError } from "@/lib/api-error";
import { NextRequest } from "next/server";

async function resolveCompradorLegajo(): Promise<string | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const clerk = await clerkClient();
  const clerkUser = await clerk.users.getUser(userId);
  const role = (clerkUser.publicMetadata as { role?: string } | undefined)?.role;
  if (role !== "comprador") return null;

  const email = clerkUser.emailAddresses[0]?.emailAddress;
  if (!email) return null;

  const comprador = await prisma.comprador.findFirst({
    where: { email },
    select: { legajo: true },
  });
  return comprador?.legajo ?? null;
}

// GET /api/recomendaciones?productoId=5&limit=6
// Devuelve productos similares usando índice de Jaccard sobre notas olfativas e ingredientes.
// Si el usuario autenticado es comprador, personaliza usando su historial de compras.
// Si ningún producto supera el umbral de similitud, devuelve los más vendidos como fallback.
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const productoIdStr = searchParams.get("productoId");
  if (!productoIdStr)
    return apiError("PARAM_REQUERIDO", "El parámetro 'productoId' es obligatorio.", 400);

  const id_producto = parseInt(productoIdStr, 10);
  if (!Number.isInteger(id_producto) || id_producto <= 0)
    return apiError("ID_INVALIDO", "El parámetro 'productoId' debe ser un entero positivo.", 400);

  const limit = Math.min(20, Math.max(1, parseInt(searchParams.get("limit") ?? "6", 10)));

  const base = await prisma.producto.findUnique({
    where: { id_producto },
    select: { id_producto: true },
  });
  if (!base)
    return apiError("PRODUCTO_NO_ENCONTRADO", `No existe un producto con id ${id_producto}.`, 404);

  const legajo = await resolveCompradorLegajo();
  const data = await getRecomendaciones(id_producto, limit, legajo ?? undefined);

  return Response.json({ data, total: data.length });
}

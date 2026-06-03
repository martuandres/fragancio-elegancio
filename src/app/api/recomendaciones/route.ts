import { prisma } from "@/lib/prisma";
import { getRecomendaciones } from "@/lib/recomendaciones";
import { apiError } from "@/lib/api-error";
import { NextRequest } from "next/server";

// GET /api/recomendaciones?productoId=5&limit=6
// Devuelve productos similares usando índice de Jaccard sobre notas olfativas e ingredientes
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

  const data = await getRecomendaciones(id_producto, limit);

  return Response.json({ data, total: data.length });
}

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";

const ESTADOS_ENVIO = ["en_camino", "entregado"] as const;
type EstadoEnvio = (typeof ESTADOS_ENVIO)[number];

// POST /api/dev/avanzar-envio — avanza el estado del envío desde el panel de administración.
// Endpoint de simulación: no verifica propiedad del vendedor.
// Por ahora solo requiere autenticación; el chequeo role === "admin" se agrega cuando
// se implemente el módulo de roles del sistema.
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId)
    return apiError("NO_AUTENTICADO", "Se requiere autenticación.", 401);

  let body: { id_carrito?: unknown; estado?: unknown };
  try {
    body = await req.json();
  } catch {
    return apiError("PAYLOAD_INVALIDO", "El cuerpo del request no es JSON válido.", 400);
  }

  const id_carrito = Number(body.id_carrito);
  if (!Number.isInteger(id_carrito) || id_carrito <= 0)
    return apiError("ID_INVALIDO", "El campo 'id_carrito' debe ser un entero positivo.", 400);

  const estado = String(body.estado ?? "");
  if (!ESTADOS_ENVIO.includes(estado as EstadoEnvio))
    return apiError("ESTADO_INVALIDO", `El campo 'estado' debe ser uno de: ${ESTADOS_ENVIO.join(", ")}.`, 400);

  const envio = await prisma.envio.findUnique({
    where: { id_carrito },
    select: { id_envio: true },
  });
  if (!envio)
    return apiError("ENVIO_NO_ENCONTRADO", `No existe un envío asociado al carrito ${id_carrito}.`, 404);

  const actualizado = await prisma.envio.update({
    where: { id_carrito },
    data: { estado },
    select: { id_envio: true, estado: true, track_code: true },
  });

  return Response.json(actualizado);
}

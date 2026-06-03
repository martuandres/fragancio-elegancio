import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";
import { NextRequest } from "next/server";

async function resolveUsuario() {
  const { userId, sessionClaims } = await auth();
  if (!userId) return null;

  const role = (sessionClaims?.publicMetadata as { role?: string } | undefined)
    ?.role as "comprador" | "vendedor" | undefined;

  const clerk = await clerkClient();
  const clerkUser = await clerk.users.getUser(userId);
  const email = clerkUser.emailAddresses[0]?.emailAddress;
  if (!email) return null;

  const usuario = await prisma.usuario.findUnique({
    where: { email },
    select: { id_usuario: true },
  });

  return usuario ? { ...usuario, role } : null;
}

const ESTADOS_ENVIO = ["preparando", "en_camino", "entregado"] as const;
type EstadoEnvio = (typeof ESTADOS_ENVIO)[number];

// GET /api/envios/[id] — estado de envío de la orden con id_pedido = [id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const usuario = await resolveUsuario();
  if (!usuario)
    return apiError("NO_AUTENTICADO", "Se requiere autenticación para ver el estado del envío.", 401);

  const { id } = await params;
  const id_pedido = parseInt(id, 10);
  if (!Number.isInteger(id_pedido) || id_pedido <= 0)
    return apiError("ID_INVALIDO", "El ID de la orden debe ser un entero positivo.", 400);

  const envio = await prisma.envio.findUnique({
    where: { id_pedido },
    select: {
      id_envio: true,
      estado: true,
      track_code: true,
      direccion_envio: true,
      orden: { select: { id_usuario: true } },
    },
  });

  if (!envio)
    return apiError("ENVIO_NO_ENCONTRADO", `No existe un envío asociado a la orden ${id_pedido}.`, 404);

  if (usuario.role === "comprador" && envio.orden.id_usuario !== usuario.id_usuario)
    return apiError("ACCESO_DENEGADO", "No tenés permiso para ver este envío.", 403);

  return Response.json({
    id_envio: envio.id_envio,
    estado: envio.estado,
    track_code: envio.track_code,
    direccion_envio: envio.direccion_envio,
  });
}

// PATCH /api/envios/[id] — actualizar estado o tracking del envío (solo vendedores)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const usuario = await resolveUsuario();
  if (!usuario)
    return apiError("NO_AUTENTICADO", "Se requiere autenticación para actualizar el envío.", 401);
  if (usuario.role !== "vendedor")
    return apiError("ACCESO_DENEGADO", "Solo los vendedores pueden actualizar el estado del envío.", 403);

  const { id } = await params;
  const id_pedido = parseInt(id, 10);
  if (!Number.isInteger(id_pedido) || id_pedido <= 0)
    return apiError("ID_INVALIDO", "El ID de la orden debe ser un entero positivo.", 400);

  const envio = await prisma.envio.findUnique({
    where: { id_pedido },
    select: { id_envio: true },
  });
  if (!envio)
    return apiError("ENVIO_NO_ENCONTRADO", `No existe un envío asociado a la orden ${id_pedido}.`, 404);

  const body = (await req.json()) as { estado?: string; track_code?: string };

  if (body.estado !== undefined && !ESTADOS_ENVIO.includes(body.estado as EstadoEnvio))
    return apiError(
      "ESTADO_INVALIDO",
      `El estado del envío debe ser uno de: ${ESTADOS_ENVIO.join(", ")}.`,
      400
    );

  const actualizado = await prisma.envio.update({
    where: { id_pedido },
    data: {
      ...(body.estado !== undefined && { estado: body.estado }),
      ...(body.track_code !== undefined && { track_code: body.track_code }),
    },
    select: { id_envio: true, estado: true, track_code: true, direccion_envio: true },
  });

  return Response.json(actualizado);
}

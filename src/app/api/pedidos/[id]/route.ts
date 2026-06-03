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

// GET /api/pedidos/[id] — detalle completo de una orden
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const usuario = await resolveUsuario();
  if (!usuario)
    return apiError("NO_AUTENTICADO", "Se requiere autenticación para ver los pedidos.", 401);

  const { id } = await params;
  const id_pedido = parseInt(id, 10);
  if (!Number.isInteger(id_pedido) || id_pedido <= 0)
    return apiError("ID_INVALIDO", "El ID del pedido debe ser un entero positivo.", 400);

  const orden = await prisma.ordenCompra.findUnique({
    where: { id_pedido },
    select: {
      id_pedido: true,
      id_usuario: true,
      fecha_creada: true,
      estado: true,
      importe_total: true,
      enviado: true,
      direccion_envio: true,
      items: {
        select: {
          id_producto: true,
          cantidad: true,
          precio: true,
          producto: { select: { nombre: true, marca: true, imagen_url: true } },
        },
      },
      pago: {
        select: {
          id_pago: true,
          total: true,
          estado: true,
          fecha_emision: true,
          factura: { select: { nro_factura: true, fecha_emision: true, importe_total: true } },
        },
      },
      envio: { select: { id_envio: true, estado: true, track_code: true, direccion_envio: true } },
    },
  });

  if (!orden)
    return apiError("PEDIDO_NO_ENCONTRADO", `No existe un pedido con id ${id_pedido}.`, 404);

  // Compradores solo pueden ver sus propios pedidos; vendedores pueden ver cualquiera
  if (usuario.role === "comprador" && orden.id_usuario !== usuario.id_usuario)
    return apiError("ACCESO_DENEGADO", "No tenés permiso para ver este pedido.", 403);

  return Response.json(orden);
}

const ESTADOS_VALIDOS = ["enviado", "entregado", "cancelado"] as const;
type EstadoOrden = (typeof ESTADOS_VALIDOS)[number];

// PATCH /api/pedidos/[id] — actualizar estado de una orden (solo vendedores)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const usuario = await resolveUsuario();
  if (!usuario)
    return apiError("NO_AUTENTICADO", "Se requiere autenticación para actualizar pedidos.", 401);
  if (usuario.role !== "vendedor")
    return apiError("ACCESO_DENEGADO", "Solo los vendedores pueden actualizar el estado de los pedidos.", 403);

  const { id } = await params;
  const id_pedido = parseInt(id, 10);
  if (!Number.isInteger(id_pedido) || id_pedido <= 0)
    return apiError("ID_INVALIDO", "El ID del pedido debe ser un entero positivo.", 400);

  const { estado } = (await req.json()) as { estado?: string };
  if (!estado || !ESTADOS_VALIDOS.includes(estado as EstadoOrden))
    return apiError(
      "ESTADO_INVALIDO",
      `El estado debe ser uno de: ${ESTADOS_VALIDOS.join(", ")}.`,
      400
    );

  const orden = await prisma.ordenCompra.findUnique({
    where: { id_pedido },
    select: { id_pedido: true, estado: true },
  });
  if (!orden)
    return apiError("PEDIDO_NO_ENCONTRADO", `No existe un pedido con id ${id_pedido}.`, 404);

  const actualizada = await prisma.ordenCompra.update({
    where: { id_pedido },
    data: {
      estado,
      ...(estado === "enviado" && { enviado: true }),
    },
    select: { id_pedido: true, estado: true, enviado: true },
  });

  return Response.json(actualizada);
}

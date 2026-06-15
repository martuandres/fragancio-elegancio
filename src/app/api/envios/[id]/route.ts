import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";
import { enviarEmail } from "@/lib/notificaciones";
import { NextRequest } from "next/server";

async function resolveUsuario() {
  const { userId } = await auth();
  if (!userId) return null;

  const clerk = await clerkClient();
  const clerkUser = await clerk.users.getUser(userId);
  const role = (clerkUser.publicMetadata as { role?: string } | undefined)
    ?.role as "comprador" | "vendedor" | "admin" | undefined;

  const email = clerkUser.emailAddresses[0]?.emailAddress;
  if (!email) return null;

  const [comprador, vendedor] = await Promise.all([
    prisma.comprador.findFirst({ where: { email }, select: { legajo: true } }),
    prisma.vendedor.findFirst({ where: { email }, select: { id_vendedor: true } }),
  ]);

  return {
    legajo: comprador?.legajo ?? null,
    id_vendedor: vendedor?.id_vendedor ?? null,
    role,
  };
}

const ESTADOS_ENVIO = ["preparando", "en_camino", "entregado"] as const;
type EstadoEnvio = (typeof ESTADOS_ENVIO)[number];

// GET /api/envios/[id] — estado del envío (id = id_carrito)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const usuario = await resolveUsuario();
  if (!usuario)
    return apiError("NO_AUTENTICADO", "Se requiere autenticación para ver el estado del envío.", 401);

  const { id } = await params;
  const id_carrito = parseInt(id, 10);
  if (!Number.isInteger(id_carrito) || id_carrito <= 0)
    return apiError("ID_INVALIDO", "El ID debe ser un entero positivo.", 400);

  const envio = await prisma.envio.findUnique({
    where: { id_carrito },
    select: {
      id_envio: true,
      estado: true,
      track_code: true,
      carrito: { select: { legajo: true } },
    },
  });

  if (!envio)
    return apiError("ENVIO_NO_ENCONTRADO", `No existe un envío asociado al carrito ${id_carrito}.`, 404);

  if (usuario.role === "comprador" && envio.carrito.legajo !== usuario.legajo)
    return apiError("ACCESO_DENEGADO", "No tenés permiso para ver este envío.", 403);

  return Response.json({
    id_envio: envio.id_envio,
    estado: envio.estado,
    track_code: envio.track_code,
  });
}

// PATCH /api/envios/[id] — actualizar estado o tracking (solo vendedores)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const usuario = await resolveUsuario();
  if (!usuario)
    return apiError("NO_AUTENTICADO", "Se requiere autenticación para actualizar el envío.", 401);
  if (usuario.role !== "vendedor" && usuario.role !== "admin")
    return apiError("ACCESO_DENEGADO", "Solo los vendedores pueden actualizar el estado del envío.", 403);

  const { id } = await params;
  const id_carrito = parseInt(id, 10);
  if (!Number.isInteger(id_carrito) || id_carrito <= 0)
    return apiError("ID_INVALIDO", "El ID debe ser un entero positivo.", 400);

  const envio = await prisma.envio.findUnique({
    where: { id_carrito },
    select: { id_envio: true },
  });
  if (!envio)
    return apiError("ENVIO_NO_ENCONTRADO", `No existe un envío asociado al carrito ${id_carrito}.`, 404);

  if (usuario.role === "vendedor") {
    const propio = await prisma.carritoProducto.findFirst({
      where: {
        id_carrito,
        producto: { vendedores: { some: { id_vendedor: usuario.id_vendedor ?? -1 } } },
      },
      select: { id_producto: true },
    });
    if (!propio)
      return apiError("ACCESO_DENEGADO", "El pedido no contiene productos de tu inventario.", 403);
  }

  const body = (await req.json()) as { estado?: string; track_code?: string };

  if (body.estado !== undefined && !ESTADOS_ENVIO.includes(body.estado as EstadoEnvio))
    return apiError("ESTADO_INVALIDO", `El estado debe ser uno de: ${ESTADOS_ENVIO.join(", ")}.`, 400);

  const actualizado = await prisma.envio.update({
    where: { id_carrito },
    data: {
      ...(body.estado !== undefined && { estado: body.estado }),
      ...(body.track_code !== undefined && { track_code: body.track_code }),
    },
    select: { id_envio: true, estado: true, track_code: true },
  });

  if (body.estado !== undefined) {
    prisma.carrito.findUnique({
      where: { id_carrito },
      select: { comprador: { select: { email: true, nombre: true } } },
    }).then((carritoData) => {
      if (carritoData?.comprador?.email) {
        enviarEmail(
          carritoData.comprador.email,
          "Estado de tu envío actualizado — Fragancio Elegancio",
          `Hola ${carritoData.comprador.nombre}, el estado de tu envío cambió a "${actualizado.estado}".${actualizado.track_code ? ` Código de seguimiento: ${actualizado.track_code}.` : ""}`
        ).catch(() => {});
      }
    }).catch(() => {});
  }

  return Response.json(actualizado);
}

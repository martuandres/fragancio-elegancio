import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";
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

  const comprador = await prisma.comprador.findFirst({
    where: { email },
    select: { legajo: true },
  });

  return { legajo: comprador?.legajo ?? null, role };
}

// GET /api/pedidos/[id] — detalle de un pedido (id = id_carrito)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const usuario = await resolveUsuario();
  if (!usuario)
    return apiError("NO_AUTENTICADO", "Se requiere autenticación para ver los pedidos.", 401);

  const { id } = await params;
  const id_carrito = parseInt(id, 10);
  if (!Number.isInteger(id_carrito) || id_carrito <= 0)
    return apiError("ID_INVALIDO", "El ID del pedido debe ser un entero positivo.", 400);

  const carrito = await prisma.carrito.findUnique({
    where: { id_carrito },
    select: {
      id_carrito: true,
      legajo: true,
      fecha_creada: true,
      estado: true,
      items: {
        select: {
          cantidad: true,
          producto: {
            select: {
              id_producto: true,
              nombre: true,
              marca: true,
              imagen_url: true,
              variante: {
                take: 1,
                orderBy: { ranking: "asc" as const },
                select: { precio: true, concentracion: true },
              },
            },
          },
        },
      },
      pago: {
        select: {
          id_pago: true,
          estado: true,
          factura: { select: { nro_factura: true, fecha_emision: true, importe_total: true } },
        },
      },
      envio: { select: { id_envio: true, estado: true, track_code: true } },
    },
  });

  if (!carrito)
    return apiError("PEDIDO_NO_ENCONTRADO", `No existe un pedido con id ${id_carrito}.`, 404);

  if (usuario.role === "comprador" && carrito.legajo !== usuario.legajo)
    return apiError("ACCESO_DENEGADO", "No tenés permiso para ver este pedido.", 403);

  const items = carrito.items.map((item) => {
    const v = item.producto.variante[0];
    return {
      id_producto: item.producto.id_producto,
      nombre: item.producto.nombre,
      marca: item.producto.marca,
      imagen_url: item.producto.imagen_url,
      precio: Number(v?.precio ?? 0),
      concentracion: v?.concentracion ?? null,
      cantidad: item.cantidad,
    };
  });

  return Response.json({ ...carrito, items });
}

const ESTADOS_VALIDOS = ["enviado", "entregado", "cancelado"] as const;
type EstadoValido = (typeof ESTADOS_VALIDOS)[number];

// PATCH /api/pedidos/[id] — actualizar estado (solo vendedores)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const usuario = await resolveUsuario();
  if (!usuario)
    return apiError("NO_AUTENTICADO", "Se requiere autenticación para actualizar pedidos.", 401);
  if (usuario.role !== "vendedor" && usuario.role !== "admin")
    return apiError("ACCESO_DENEGADO", "Solo los vendedores pueden actualizar el estado de los pedidos.", 403);

  const { id } = await params;
  const id_carrito = parseInt(id, 10);
  if (!Number.isInteger(id_carrito) || id_carrito <= 0)
    return apiError("ID_INVALIDO", "El ID del pedido debe ser un entero positivo.", 400);

  const { estado } = (await req.json()) as { estado?: string };
  if (!estado || !ESTADOS_VALIDOS.includes(estado as EstadoValido))
    return apiError("ESTADO_INVALIDO", `El estado debe ser uno de: ${ESTADOS_VALIDOS.join(", ")}.`, 400);

  const carrito = await prisma.carrito.findUnique({
    where: { id_carrito },
    select: { id_carrito: true },
  });
  if (!carrito)
    return apiError("PEDIDO_NO_ENCONTRADO", `No existe un pedido con id ${id_carrito}.`, 404);

  if (estado === "enviado" || estado === "entregado") {
    const envio = await prisma.envio.findUnique({
      where: { id_carrito },
      select: { id_envio: true },
    });
    if (!envio)
      return apiError("ENVIO_NO_ENCONTRADO", "No existe un envío asociado a este pedido.", 404);

    const actualizado = await prisma.envio.update({
      where: { id_carrito },
      data: { estado },
      select: { id_envio: true, estado: true },
    });
    return Response.json({ id_carrito, envio: actualizado });
  }

  // cancelado → actualizar estado del carrito
  const actualizado = await prisma.carrito.update({
    where: { id_carrito },
    data: { estado: "cancelado" },
    select: { id_carrito: true, estado: true },
  });
  return Response.json(actualizado);
}

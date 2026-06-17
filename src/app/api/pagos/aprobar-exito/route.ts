import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";
import { enviarEmail } from "@/lib/notificaciones";

// POST /api/pagos/aprobar-exito — aprueba el pago directamente cuando MP redirige a /pago/exito.
// No consulta la API de MP: si el usuario llegó a la back_url de éxito, el pago está aprobado.
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId)
    return apiError("NO_AUTENTICADO", "Se requiere autenticación.", 401);

  const clerk = await clerkClient();
  const clerkUser = await clerk.users.getUser(userId);
  const email = clerkUser.emailAddresses[0]?.emailAddress;
  if (!email)
    return apiError("EMAIL_NO_ENCONTRADO", "No se encontró email.", 400);

  let body: { id_carrito?: unknown };
  try {
    body = await req.json();
  } catch {
    return apiError("PAYLOAD_INVALIDO", "El cuerpo del request no es JSON válido.", 400);
  }

  const id_carrito = Number(body.id_carrito);
  if (!Number.isInteger(id_carrito) || id_carrito <= 0)
    return apiError("ID_INVALIDO", "El campo 'id_carrito' debe ser un entero positivo.", 400);

  const comprador = await prisma.comprador.findFirst({
    where: { email },
    select: { legajo: true, nombre: true },
  });
  if (!comprador)
    return apiError("USUARIO_NO_ENCONTRADO", "Comprador no encontrado.", 404);

  const carrito = await prisma.carrito.findUnique({
    where: { id_carrito },
    select: { legajo: true, pago: { select: { id_pago: true, estado: true } } },
  });

  if (!carrito || carrito.legajo !== comprador.legajo)
    return apiError("PEDIDO_NO_ENCONTRADO", "El pedido no existe o no te pertenece.", 404);

  if (!carrito.pago)
    return apiError("PAGO_NO_ENCONTRADO", "El pedido no tiene un pago asociado.", 404);

  if (carrito.pago.estado !== "pendiente")
    return Response.json({ ok: true, detalle: "pago_ya_procesado", estado: carrito.pago.estado });

  const factura = await prisma.$transaction(async (tx) => {
    await tx.pago.update({
      where: { id_pago: carrito.pago!.id_pago },
      data: { estado: "aprobado" },
    });

    const items = await tx.carritoProducto.findMany({
      where: { id_carrito },
      select: {
        cantidad: true,
        producto: {
          select: {
            variante: {
              take: 1,
              orderBy: { ranking: "asc" as const },
              select: { precio: true },
            },
          },
        },
      },
    });

    const importe_total = items.reduce(
      (sum, item) => sum + Number(item.producto.variante[0]?.precio ?? 0) * item.cantidad,
      0
    );

    const creada = await tx.factura.create({
      data: { id_pago: carrito.pago!.id_pago, importe_total },
      select: { nro_factura: true },
    });

    await tx.envio.upsert({
      where: { id_carrito },
      create: { id_carrito, estado: "preparando" },
      update: {},
    });

    return creada;
  });

  enviarEmail(
    email,
    "Pago confirmado — Fragancio Elegancio",
    `Hola ${comprador.nombre}, tu pago fue aprobado. Nro. de factura: ${factura.nro_factura}.`
  ).catch(() => {});

  return Response.json({ ok: true, estado: "aprobado", nro_factura: factura.nro_factura });
}

import { prisma } from "@/lib/prisma";
import { mpPayment } from "@/lib/mercadopago";
import { enviarEmail } from "@/lib/notificaciones";

export type ResultadoPago =
  | { ok: true; estado: "aprobado"; nro_factura: string }
  | { ok: true; estado: "rechazado" }
  | { ok: false; motivo: "pago_ya_procesado" | "pago_no_encontrado" | "estado_no_definitivo" };

export async function procesarPagoMP(paymentId: string): Promise<ResultadoPago> {
  const payment = await mpPayment.get({ id: paymentId });

  const idCarrito = parseInt(payment.external_reference ?? "", 10);
  if (!idCarrito || !Number.isFinite(idCarrito))
    return { ok: false, motivo: "pago_no_encontrado" };

  const mpStatus = payment.status;
  if (mpStatus !== "approved" && mpStatus !== "rejected" && mpStatus !== "cancelled")
    return { ok: false, motivo: "estado_no_definitivo" };

  const estado = mpStatus === "approved" ? "aprobado" : "rechazado";

  const pago = await prisma.pago.findUnique({
    where: { id_carrito: idCarrito },
    select: { id_pago: true, estado: true },
  });

  if (!pago) return { ok: false, motivo: "pago_no_encontrado" };
  if (pago.estado !== "pendiente") return { ok: false, motivo: "pago_ya_procesado" };

  if (estado === "aprobado") {
    const factura = await prisma.$transaction(async (tx) => {
      await tx.pago.update({ where: { id_pago: pago.id_pago }, data: { estado } });

      const items = await tx.carritoProducto.findMany({
        where: { id_carrito: idCarrito },
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
        data: { id_pago: pago.id_pago, importe_total },
        select: { nro_factura: true },
      });

      await tx.envio.upsert({
        where: { id_carrito: idCarrito },
        create: { id_carrito: idCarrito, estado: "preparando" },
        update: {},
      });

      return creada;
    });

    prisma.carrito
      .findUnique({
        where: { id_carrito: idCarrito },
        select: { comprador: { select: { email: true, nombre: true } } },
      })
      .then((c) => {
        if (c?.comprador?.email) {
          enviarEmail(
            c.comprador.email,
            "Pago confirmado — Fragancio Elegancio",
            `Hola ${c.comprador.nombre}, tu pago fue aprobado. Nro. de factura: ${factura.nro_factura}.`
          ).catch(() => {});
        }
      })
      .catch(() => {});

    return { ok: true, estado: "aprobado", nro_factura: factura.nro_factura };
  }

  await prisma.$transaction(async (tx) => {
    await tx.pago.update({ where: { id_pago: pago.id_pago }, data: { estado } });

    const items = await tx.carritoProducto.findMany({
      where: { id_carrito: idCarrito },
      select: { id_producto: true, cantidad: true },
    });

    for (const item of items) {
      await tx.producto.update({
        where: { id_producto: item.id_producto },
        data: { stock: { increment: item.cantidad } },
      });
    }

    await tx.carrito.update({
      where: { id_carrito: idCarrito },
      data: { estado: "cancelado" },
    });
  });

  return { ok: true, estado: "rechazado" };
}

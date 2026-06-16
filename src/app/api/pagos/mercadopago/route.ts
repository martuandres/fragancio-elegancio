import { prisma } from "@/lib/prisma";
import { mpPayment } from "@/lib/mercadopago";
import { apiError } from "@/lib/api-error";
import { enviarEmail } from "@/lib/notificaciones";
import crypto from "crypto";

// Verifica la firma x-signature de MercadoPago.
// Formato: "ts=<timestamp>,v1=<hmac>"
// Template firmado: "id:{data_id};request-id:{x-request-id};ts:{ts}"
function verificarFirmaMP(
  dataId: string,
  requestId: string,
  signature: string,
  secret: string,
): boolean {
  const parts = Object.fromEntries(signature.split(",").map((p) => p.split("=")));
  const ts = parts["ts"];
  const v1 = parts["v1"];
  if (!ts || !v1) return false;
  const message = `id:${dataId};request-id:${requestId};ts:${ts}`;
  const expected = crypto.createHmac("sha256", secret).update(message).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(v1), Buffer.from(expected));
  } catch {
    return false;
  }
}

// POST /api/pagos/mercadopago — webhook de MercadoPago (notificación IPN/Webhooks v2)
// Recibe evento de pago, consulta el estado real a la API de MP y actualiza el sistema.
export async function POST(req: Request) {
  let body: { type?: unknown; action?: unknown; data?: { id?: unknown } };
  try {
    body = await req.json();
  } catch {
    return apiError("PAYLOAD_INVALIDO", "El cuerpo del request no es JSON válido.", 400);
  }

  // Verificar firma sólo si el secret está configurado (no disponible en pruebas locales sin ngrok)
  const mpSecret = process.env.MP_WEBHOOK_SECRET;
  if (mpSecret) {
    const signature = req.headers.get("x-signature") ?? "";
    const requestId = req.headers.get("x-request-id") ?? "";
    const dataId = String(body.data?.id ?? "");
    if (!verificarFirmaMP(dataId, requestId, signature, mpSecret)) {
      return apiError("FIRMA_INVALIDA", "La firma del webhook de MercadoPago es inválida.", 401);
    }
  }

  // Solo procesamos notificaciones de tipo "payment"
  const tipo = body.type ?? body.action;
  if (typeof tipo !== "string" || !tipo.includes("payment")) {
    return Response.json({ ok: true }); // acusar recibo de otros eventos sin procesar
  }

  const paymentId = body.data?.id;
  if (!paymentId) return Response.json({ ok: true });

  // Obtener el estado real del pago desde la API de MP
  let payment;
  try {
    payment = await mpPayment.get({ id: String(paymentId) });
  } catch {
    return apiError("MP_FETCH_ERROR", "No se pudo obtener el estado del pago desde MercadoPago.", 502);
  }

  const idCarrito = parseInt(payment.external_reference ?? "", 10);
  if (!idCarrito || !Number.isFinite(idCarrito)) {
    return Response.json({ ok: true }); // pago sin referencia a nuestro sistema
  }

  const mpStatus = payment.status;
  // Solo procesamos pagos con resultado definitivo
  if (mpStatus !== "approved" && mpStatus !== "rejected" && mpStatus !== "cancelled") {
    return Response.json({ ok: true });
  }

  const estado = mpStatus === "approved" ? "aprobado" : "rechazado";

  const pago = await prisma.pago.findUnique({
    where: { id_carrito: idCarrito },
    select: { id_pago: true, estado: true },
  });

  if (!pago) return apiError("PAGO_NO_ENCONTRADO", `No existe un pago para el carrito ${idCarrito}.`, 404);

  // Idempotencia: reenvíos del mismo evento no reprocesen un pago ya resuelto
  if (pago.estado !== "pendiente") {
    return Response.json({ ok: true, detalle: "pago_ya_procesado" });
  }

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

      const importe_total = items.reduce((sum, item) => {
        return sum + Number(item.producto.variante[0]?.precio ?? 0) * item.cantidad;
      }, 0);

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

    return Response.json({ ok: true, nro_factura: factura.nro_factura });
  }

  // Rechazado / cancelado: reponer stock y cancelar carrito
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

  return Response.json({ ok: true });
}

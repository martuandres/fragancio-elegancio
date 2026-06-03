import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";
import crypto from "crypto";

const ESTADOS_PAGO = ["aprobado", "rechazado"] as const;
type EstadoPago = (typeof ESTADOS_PAGO)[number];

function verificarFirma(body: string, signature: string, secret: string): boolean {
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

// POST /api/pagos/webhook — confirmación de pago desde proveedor externo (Stripe / MercadoPago)
// Al aprobarse: actualiza Pago + OrdenCompra, crea Factura y crea registro de Envio
export async function POST(req: Request) {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret)
    return apiError("CONFIGURACION_INVALIDA", "WEBHOOK_SECRET no está configurado en el servidor.", 500);

  const rawBody = await req.text();
  const signature = req.headers.get("x-webhook-signature") ?? "";

  if (!signature || !verificarFirma(rawBody, signature, secret))
    return apiError("FIRMA_INVALIDA", "La firma del webhook es inválida o ausente.", 401);

  let body: { id_pedido?: unknown; estado?: unknown; provider_reference?: unknown };
  try {
    body = JSON.parse(rawBody);
  } catch {
    return apiError("PAYLOAD_INVALIDO", "El cuerpo del request no es JSON válido.", 400);
  }

  const id_pedido = Number(body.id_pedido);
  if (!Number.isInteger(id_pedido) || id_pedido <= 0)
    return apiError("ID_INVALIDO", "El campo 'id_pedido' debe ser un entero positivo.", 400);

  const estado = String(body.estado ?? "");
  if (!ESTADOS_PAGO.includes(estado as EstadoPago))
    return apiError("ESTADO_INVALIDO", `El campo 'estado' debe ser uno de: ${ESTADOS_PAGO.join(", ")}.`, 400);

  const pago = await prisma.pago.findUnique({
    where: { id_pedido },
    select: { id_pago: true, estado: true, id_pedido: true },
  });

  if (!pago) {
    const orden = await prisma.ordenCompra.findUnique({
      where: { id_pedido },
      select: { id_pedido: true, importe_total: true, direccion_envio: true },
    });
    if (!orden)
      return apiError("PEDIDO_NO_ENCONTRADO", `No existe una orden con id ${id_pedido}.`, 404);

    // Crear el Pago si no existía (el checkout no lo crea automáticamente)
    await prisma.pago.create({
      data: { id_pedido, total: orden.importe_total, estado },
    });

    if (estado === "aprobado") {
      await prisma.ordenCompra.update({ where: { id_pedido }, data: { estado: "aprobado" } });

      const nuevoPago = await prisma.pago.findUnique({ where: { id_pedido }, select: { id_pago: true } });
      const factura = await prisma.factura.create({
        data: {
          id_pago: nuevoPago!.id_pago,
          id_pedido,
          importe_total: orden.importe_total,
        },
        select: { nro_factura: true },
      });

      await prisma.envio.upsert({
        where: { id_pedido },
        create: { id_pedido, estado: "preparando", direccion_envio: orden.direccion_envio },
        update: {},
      });

      return Response.json({ ok: true, nro_factura: factura.nro_factura });
    }

    return Response.json({ ok: true });
  }

  // El pago ya existe — verificar que no esté procesado
  if (pago.estado === "aprobado")
    return apiError("PAGO_YA_PROCESADO", "Este pago ya fue confirmado anteriormente.", 409);

  await prisma.pago.update({
    where: { id_pago: pago.id_pago },
    data: { estado },
  });

  if (estado === "aprobado") {
    const orden = await prisma.ordenCompra.findUnique({
      where: { id_pedido },
      select: { importe_total: true, direccion_envio: true },
    });

    await prisma.ordenCompra.update({ where: { id_pedido }, data: { estado: "aprobado" } });

    const factura = await prisma.factura.create({
      data: {
        id_pago: pago.id_pago,
        id_pedido,
        importe_total: orden!.importe_total,
      },
      select: { nro_factura: true },
    });

    await prisma.envio.upsert({
      where: { id_pedido },
      create: { id_pedido, estado: "preparando", direccion_envio: orden!.direccion_envio },
      update: {},
    });

    return Response.json({ ok: true, nro_factura: factura.nro_factura });
  }

  return Response.json({ ok: true });
}

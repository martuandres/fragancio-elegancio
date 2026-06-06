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
// Al aprobarse: actualiza Pago, crea Factura y crea Envio
export async function POST(req: Request) {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret)
    return apiError("CONFIGURACION_INVALIDA", "WEBHOOK_SECRET no está configurado en el servidor.", 500);

  const rawBody = await req.text();
  const signature = req.headers.get("x-webhook-signature") ?? "";

  if (!signature || !verificarFirma(rawBody, signature, secret))
    return apiError("FIRMA_INVALIDA", "La firma del webhook es inválida o ausente.", 401);

  let body: { id_carrito?: unknown; estado?: unknown };
  try {
    body = JSON.parse(rawBody);
  } catch {
    return apiError("PAYLOAD_INVALIDO", "El cuerpo del request no es JSON válido.", 400);
  }

  const id_carrito = Number(body.id_carrito);
  if (!Number.isInteger(id_carrito) || id_carrito <= 0)
    return apiError("ID_INVALIDO", "El campo 'id_carrito' debe ser un entero positivo.", 400);

  const estado = String(body.estado ?? "");
  if (!ESTADOS_PAGO.includes(estado as EstadoPago))
    return apiError("ESTADO_INVALIDO", `El campo 'estado' debe ser uno de: ${ESTADOS_PAGO.join(", ")}.`, 400);

  const pago = await prisma.pago.findUnique({
    where: { id_carrito },
    select: { id_pago: true, estado: true, id_carrito: true },
  });

  if (!pago)
    return apiError("CARRITO_NO_ENCONTRADO", `No existe un pago asociado al carrito ${id_carrito}.`, 404);

  // Idempotencia: no reprocesar pagos ya aprobados
  if (pago.estado === "aprobado")
    return apiError("PAGO_YA_PROCESADO", "Este pago ya fue confirmado anteriormente.", 409);

  await prisma.pago.update({
    where: { id_pago: pago.id_pago },
    data: { estado },
  });

  if (estado === "aprobado") {
    // Calcular importe_total desde los ítems del carrito
    const items = await prisma.carritoProducto.findMany({
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

    const importe_total = items.reduce((sum, item) => {
      const precio = Number(item.producto.variante[0]?.precio ?? 0);
      return sum + precio * item.cantidad;
    }, 0);

    const factura = await prisma.factura.create({
      data: { id_pago: pago.id_pago, importe_total },
      select: { nro_factura: true },
    });

    await prisma.envio.upsert({
      where: { id_carrito },
      create: { id_carrito, estado: "preparando" },
      update: {},
    });

    return Response.json({ ok: true, nro_factura: factura.nro_factura });
  }

  return Response.json({ ok: true });
}

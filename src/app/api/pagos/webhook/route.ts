import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";
import { enviarEmail } from "@/lib/notificaciones";
import { Prisma } from "@/generated/prisma/client";
import crypto from "crypto";

const ESTADOS_PAGO = ["aprobado", "rechazado"] as const;
type EstadoPago = (typeof ESTADOS_PAGO)[number];

function verificarFirma(body: string, signature: string, secret: string): boolean {
  // Formato documentado: "sha256=<hex>"; se acepta también el hex pelado
  const hex = signature.startsWith("sha256=") ? signature.slice("sha256=".length) : signature;
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(hex), Buffer.from(expected));
  } catch {
    return false;
  }
}

const ZERO = new Prisma.Decimal(0);

// POST /api/pagos/webhook — confirmación de pago desde proveedor externo (Stripe / MercadoPago)
// Aprobado: actualiza Pago, crea Factura, crea Envio y acredita saldo a vendedores.
// Rechazado: repone stock y cancela el pedido.
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

  // Idempotencia: solo se procesan pagos pendientes. Un pago rechazado ya repuso
  // el stock, por lo que tampoco admite reprocesamiento.
  if (pago.estado !== "pendiente")
    return apiError("PAGO_YA_PROCESADO", "Este pago ya fue procesado anteriormente.", 409);

  if (estado === "aprobado") {
    // Transacción: si falla cualquier paso (Factura, Envio, saldo), el Pago queda
    // "pendiente" y el reintento del proveedor puede procesarse completo.
    const factura = await prisma.$transaction(async (tx) => {
      await tx.pago.update({
        where: { id_pago: pago.id_pago },
        data: { estado },
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
              vendedores: {
                select: { id_vendedor: true },
              },
            },
          },
        },
      });

      // Aritmética Decimal para evitar errores de punto flotante en importes monetarios
      const importe_total = items.reduce((sum, item) => {
        const precio = item.producto.variante[0]?.precio ?? ZERO;
        return sum.add(precio.mul(item.cantidad));
      }, ZERO);

      const creada = await tx.factura.create({
        data: { id_pago: pago.id_pago, importe_total },
        select: { nro_factura: true },
      });

      await tx.envio.upsert({
        where: { id_carrito },
        create: { id_carrito, estado: "preparando" },
        update: {},
      });

      // Acreditar saldo a cada vendedor involucrado en el carrito.
      // Si un producto no tiene vendedor registrado (dato corrupto), se omite sin fallar.
      const saldoPorVendedor = new Map<number, Prisma.Decimal>();
      for (const item of items) {
        const id_vendedor = item.producto.vendedores[0]?.id_vendedor;
        if (id_vendedor === undefined) continue;
        const precio = item.producto.variante[0]?.precio ?? ZERO;
        const subtotal = precio.mul(item.cantidad);
        const acumulado = saldoPorVendedor.get(id_vendedor) ?? ZERO;
        saldoPorVendedor.set(id_vendedor, acumulado.add(subtotal));
      }

      for (const [id_vendedor, incremento] of saldoPorVendedor) {
        await tx.vendedor.update({
          where: { id_vendedor },
          data: { saldo: { increment: incremento } },
        });
      }

      return creada;
    });

    prisma.carrito.findUnique({
      where: { id_carrito },
      select: { comprador: { select: { email: true, nombre: true } } },
    }).then((carritoData) => {
      if (carritoData?.comprador?.email) {
        enviarEmail(
          carritoData.comprador.email,
          "Pago confirmado — Fragancio Elegancio",
          `Hola ${carritoData.comprador.nombre}, tu pago fue aprobado. Nro. de factura: ${factura.nro_factura}.`
        ).catch(() => {});
      }
    }).catch(() => {});

    return Response.json({ ok: true, nro_factura: factura.nro_factura });
  }

  // Rechazado: el stock fue decrementado en el checkout (lib/stock.ts) y debe
  // reponerse (Regla de Negocio 4). El carrito pasa a "cancelado" para que el
  // pedido no admita una cancelación manual posterior con doble reposición.
  await prisma.$transaction(async (tx) => {
    await tx.pago.update({
      where: { id_pago: pago.id_pago },
      data: { estado },
    });

    const items = await tx.carritoProducto.findMany({
      where: { id_carrito },
      select: { id_producto: true, cantidad: true },
    });

    for (const item of items) {
      await tx.producto.update({
        where: { id_producto: item.id_producto },
        data: { stock: { increment: item.cantidad } },
      });
    }

    await tx.carrito.update({
      where: { id_carrito },
      data: { estado: "cancelado" },
    });
  });

  return Response.json({ ok: true });
}

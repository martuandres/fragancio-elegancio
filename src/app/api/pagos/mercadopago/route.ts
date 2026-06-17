import { apiError } from "@/lib/api-error";
import { procesarPagoMP } from "@/lib/mp-confirmar";
import crypto from "crypto";

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

// POST /api/pagos/mercadopago — webhook servidor-a-servidor de MercadoPago (IPN/Webhooks v2)
export async function POST(req: Request) {
  let body: { type?: unknown; action?: unknown; data?: { id?: unknown } };
  try {
    body = await req.json();
  } catch {
    return apiError("PAYLOAD_INVALIDO", "El cuerpo del request no es JSON válido.", 400);
  }

  const mpSecret = process.env.MP_WEBHOOK_SECRET;
  if (mpSecret) {
    const signature = req.headers.get("x-signature") ?? "";
    const requestId = req.headers.get("x-request-id") ?? "";
    const dataId = String(body.data?.id ?? "");
    if (!verificarFirmaMP(dataId, requestId, signature, mpSecret)) {
      return apiError("FIRMA_INVALIDA", "La firma del webhook de MercadoPago es inválida.", 401);
    }
  }

  const tipo = body.type ?? body.action;
  if (typeof tipo !== "string" || !tipo.includes("payment")) {
    return Response.json({ ok: true });
  }

  const paymentId = body.data?.id;
  if (!paymentId) return Response.json({ ok: true });

  try {
    const resultado = await procesarPagoMP(String(paymentId));
    if (!resultado.ok) return Response.json({ ok: true, detalle: resultado.motivo });
    const { ok: _ok, ...rest } = resultado;
    return Response.json({ ok: true, ...rest });
  } catch (err) {
    console.error("[MP] Error procesando webhook:", err);
    return apiError("MP_FETCH_ERROR", "No se pudo obtener el estado del pago desde MercadoPago.", 502);
  }
}

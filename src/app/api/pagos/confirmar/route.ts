import { auth } from "@clerk/nextjs/server";
import { apiError } from "@/lib/api-error";
import { procesarPagoMP } from "@/lib/mp-confirmar";

// POST /api/pagos/confirmar — confirma un pago usando el payment_id que MP manda en la back_url
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId)
    return apiError("NO_AUTENTICADO", "Se requiere autenticación.", 401);

  let body: { payment_id?: unknown };
  try {
    body = await req.json();
  } catch {
    return apiError("PAYLOAD_INVALIDO", "El cuerpo del request no es JSON válido.", 400);
  }

  const payment_id = String(body.payment_id ?? "").trim();
  if (!payment_id)
    return apiError("PAYMENT_ID_INVALIDO", "El campo 'payment_id' es requerido.", 400);

  try {
    const resultado = await procesarPagoMP(payment_id);
    return Response.json(resultado);
  } catch (err) {
    console.error("[MP] Error confirmando pago:", err);
    return apiError("MP_FETCH_ERROR", "No se pudo consultar el estado del pago con MercadoPago.", 502);
  }
}

import { auth } from "@clerk/nextjs/server";
import { apiError } from "@/lib/api-error";
import crypto from "crypto";

// POST /api/dev/simular-pago — actúa como el "Sistema de Pagos" del diagrama de arquitectura.
// Firma el payload con HMAC y llama al webhook real, sin bypassear ninguna lógica de negocio.
// Por ahora solo requiere autenticación; el chequeo role === "admin" se agrega cuando
// se implemente el módulo de roles del sistema.
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId)
    return apiError("NO_AUTENTICADO", "Se requiere autenticación.", 401);

  const secret = process.env.WEBHOOK_SECRET;
  if (!secret)
    return apiError("CONFIGURACION_INVALIDA", "WEBHOOK_SECRET no está configurado en el servidor.", 500);

  let body: { id_carrito?: unknown; estado?: unknown };
  try {
    body = await req.json();
  } catch {
    return apiError("PAYLOAD_INVALIDO", "El cuerpo del request no es JSON válido.", 400);
  }

  const id_carrito = Number(body.id_carrito);
  if (!Number.isInteger(id_carrito) || id_carrito <= 0)
    return apiError("ID_INVALIDO", "El campo 'id_carrito' debe ser un entero positivo.", 400);

  const estado = String(body.estado ?? "");
  if (estado !== "aprobado" && estado !== "rechazado")
    return apiError("ESTADO_INVALIDO", "El campo 'estado' debe ser 'aprobado' o 'rechazado'.", 400);

  const payload = JSON.stringify({ id_carrito, estado });
  const signature = "sha256=" + crypto.createHmac("sha256", secret).update(payload).digest("hex");

  const host = req.headers.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;

  const webhookRes = await fetch(`${baseUrl}/api/pagos/webhook`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-webhook-signature": signature,
    },
    body: payload,
  });

  const data = await webhookRes.json().catch(() => ({}));
  return Response.json(data, { status: webhookRes.status });
}

import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";
import { crearPreferenciaMP } from "@/lib/mp-preferencia";

// POST /api/pedidos/[id]/pagar — crea una nueva preferencia MP para un pago pendiente existente
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId)
    return apiError("NO_AUTENTICADO", "Se requiere autenticación.", 401);

  const clerk = await clerkClient();
  const clerkUser = await clerk.users.getUser(userId);
  const role = (clerkUser.publicMetadata as { role?: string } | undefined)?.role;
  if (role !== "comprador" && role !== "admin")
    return apiError("ACCESO_DENEGADO", "Solo los compradores pueden completar pagos.", 403);

  const email = clerkUser.emailAddresses[0]?.emailAddress;
  if (!email)
    return apiError("EMAIL_NO_ENCONTRADO", "No se encontró un email asociado a la cuenta.", 400);

  const { id } = await params;
  const id_carrito = parseInt(id, 10);
  if (!Number.isInteger(id_carrito) || id_carrito <= 0)
    return apiError("ID_INVALIDO", "El ID del pedido debe ser un entero positivo.", 400);

  const comprador = await prisma.comprador.findFirst({
    where: { email },
    select: { legajo: true },
  });
  if (!comprador)
    return apiError("USUARIO_NO_ENCONTRADO", "El comprador no existe en el sistema.", 404);

  const carrito = await prisma.carrito.findUnique({
    where: { id_carrito },
    select: {
      id_carrito: true,
      legajo: true,
      pago: { select: { estado: true } },
      items: {
        select: {
          id_producto: true,
          cantidad: true,
          producto: {
            select: {
              nombre: true,
              variante: {
                take: 1,
                orderBy: { ranking: "asc" as const },
                select: { precio: true },
              },
            },
          },
        },
      },
    },
  });

  if (!carrito || carrito.legajo !== comprador.legajo)
    return apiError("PEDIDO_NO_ENCONTRADO", "El pedido no existe o no te pertenece.", 404);

  if (!carrito.pago || carrito.pago.estado !== "pendiente")
    return apiError("PAGO_NO_PENDIENTE", "Este pedido no tiene un pago pendiente.", 409);

  const mpItems = carrito.items.map((item) => ({
    id: item.id_producto.toString(),
    title: item.producto.nombre,
    quantity: item.cantidad,
    unit_price: parseFloat(item.producto.variante[0]?.precio?.toString() ?? "0"),
    currency_id: "ARS",
  }));

  if (mpItems.some((i) => !Number.isFinite(i.unit_price) || i.unit_price <= 0))
    return apiError("PRECIO_INVALIDO", "Uno o más productos no tienen precio configurado.", 400);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    const init_point = await crearPreferenciaMP(mpItems, id_carrito, baseUrl);
    if (!init_point)
      return apiError("MP_NO_CONFIGURADO", "El sistema de pagos no está disponible en este entorno.", 503);
    return Response.json({ init_point });
  } catch (err) {
    console.error("[MP] Error creando preferencia para re-pago:", err);
    return apiError("MP_ERROR", "No se pudo iniciar el proceso de pago. Intentá de nuevo.", 502);
  }
}

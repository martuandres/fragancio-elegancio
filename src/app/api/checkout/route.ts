import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { checkoutAtomico } from "@/lib/stock";
import { apiError } from "@/lib/api-error";
import { enviarEmail } from "@/lib/notificaciones";
import { mpPreference } from "@/lib/mercadopago";

// POST /api/checkout — CU-03: valida stock → decrementa → crea Pago → redirige a MP
export async function POST() {
  const { userId } = await auth();
  if (!userId)
    return apiError("NO_AUTENTICADO", "Se requiere autenticación para hacer checkout.", 401);

  const clerk = await clerkClient();
  const clerkUser = await clerk.users.getUser(userId);
  const role = (clerkUser.publicMetadata as { role?: string } | undefined)?.role;
  if (role !== "comprador" && role !== "admin")
    return apiError("ACCESO_DENEGADO", "Solo los compradores pueden realizar el proceso de compra.", 403);

  const email = clerkUser.emailAddresses[0]?.emailAddress;
  if (!email)
    return apiError("EMAIL_NO_ENCONTRADO", "No se encontró un email asociado a la cuenta.", 400);

  const comprador = await prisma.comprador.findFirst({
    where: { email },
    select: { legajo: true, direccion_envio: true },
  });
  if (!comprador)
    return apiError("USUARIO_NO_ENCONTRADO", "El comprador no existe en el sistema.", 404);
  if (!comprador.direccion_envio.trim())
    return apiError("DIRECCION_REQUERIDA", "Debés configurar una dirección de envío antes de comprar.", 400);

  const carrito = await prisma.carrito.findFirst({
    where: { legajo: comprador.legajo, estado: "activo" },
    select: {
      id_carrito: true,
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

  if (!carrito)
    return apiError("CARRITO_NO_ENCONTRADO", "No existe un carrito activo para este usuario.", 404);
  if (carrito.items.length === 0)
    return apiError("CARRITO_VACIO", "El carrito no tiene productos. Agregá al menos uno antes de hacer checkout.", 400);

  const checkoutItems = carrito.items.map(({ id_producto, cantidad }) => ({ id_producto, cantidad }));

  // CU-03 paso 1-2: validar stock + decrementar + crear Pago(pendiente) en transacción atómica
  let result;
  try {
    result = await checkoutAtomico(carrito.id_carrito, checkoutItems);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error en el proceso de checkout";
    return apiError("CHECKOUT_FALLIDO", message, 409);
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // CU-03 paso 3: crear preferencia en MP y redirigir al Sistema de Pagos externo.
  // Si MP falla aquí, se revierte el checkout para dejar el sistema en estado consistente
  // y el usuario puede volver a intentarlo (carrito queda activo).
  let initPoint: string | null = null;
  if (process.env.MP_ACCESS_TOKEN) {
    try {
      const pref = await mpPreference.create({
        body: {
          items: carrito.items.map((item) => ({
            id: item.id_producto.toString(),
            title: item.producto.nombre,
            quantity: item.cantidad,
            unit_price: Number(item.producto.variante[0]?.precio ?? 0),
            currency_id: "ARS",
          })),
          external_reference: carrito.id_carrito.toString(),
          back_urls: {
            success: `${baseUrl}/pago/exito`,
            failure: `${baseUrl}/pago/rechazo`,
            pending: `${baseUrl}/pago/pendiente`,
          },
          notification_url: `${baseUrl}/api/pagos/mercadopago`,
        },
      });
      initPoint = pref.sandbox_init_point ?? pref.init_point ?? null;
    } catch (err) {
      console.error("[MP] Error creando preferencia:", err);
      // Revertir el checkout: restaurar stock, eliminar Pago, carrito vuelve a activo
      await prisma.$transaction(async (tx) => {
        await tx.pago.delete({ where: { id_pago: result.pago.id_pago } });
        for (const item of checkoutItems) {
          await tx.producto.update({
            where: { id_producto: item.id_producto },
            data: { stock: { increment: item.cantidad } },
          });
        }
        await tx.carrito.update({
          where: { id_carrito: carrito.id_carrito },
          data: { estado: "activo" },
        });
      }).catch((rollbackErr) => console.error("[MP] Error en rollback:", rollbackErr));
      return apiError("MP_ERROR", "No se pudo iniciar el proceso de pago con MercadoPago. Intentá de nuevo.", 502);
    }
  }

  // Emails de restock fire-and-forget, solo si el checkout y MP fueron exitosos
  for (const { nombre, nuevoStock, emails } of result.restocks) {
    for (const emailProveedor of emails) {
      enviarEmail(
        emailProveedor,
        `Restock requerido: ${nombre}`,
        `El stock de "${nombre}" bajó a ${nuevoStock} unidades. Por favor reponer stock.`
      ).catch(() => {});
    }
  }

  return Response.json(
    {
      id_pago: result.pago.id_pago,
      id_carrito: result.pago.id_carrito,
      importe_total: result.importe_total,
      estado: result.pago.estado,
      init_point: initPoint,
    },
    {
      status: 201,
      headers: { Location: `/api/pedidos/${result.pago.id_carrito}` },
    }
  );
}

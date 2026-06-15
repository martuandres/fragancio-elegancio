import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { checkoutAtomico } from "@/lib/stock";
import { apiError } from "@/lib/api-error";
import { enviarEmail } from "@/lib/notificaciones";

// POST /api/checkout — confirmar compra y crear pago pendiente desde el carrito activo
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
    select: { legajo: true },
  });
  if (!comprador)
    return apiError("USUARIO_NO_ENCONTRADO", "El comprador no existe en el sistema.", 404);

  const carrito = await prisma.carrito.findFirst({
    where: { legajo: comprador.legajo, estado: "activo" },
    select: {
      id_carrito: true,
      items: { select: { id_producto: true, cantidad: true } },
    },
  });

  if (!carrito)
    return apiError("CARRITO_NO_ENCONTRADO", "No existe un carrito activo para este usuario.", 404);
  if (carrito.items.length === 0)
    return apiError("CARRITO_VACIO", "El carrito no tiene productos. Agregá al menos uno antes de hacer checkout.", 400);

  try {
    const result = await checkoutAtomico(carrito.id_carrito, carrito.items);

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
      },
      {
        status: 201,
        headers: { Location: `/api/pedidos/${result.pago.id_carrito}` },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error en el proceso de checkout";
    return apiError("CHECKOUT_FALLIDO", message, 409);
  }
}

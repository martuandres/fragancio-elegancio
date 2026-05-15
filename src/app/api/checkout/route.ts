import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { checkoutAtomico } from "@/lib/stock";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const { userId, sessionClaims } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });
  const role = (sessionClaims?.publicMetadata as { role?: string } | undefined)?.role;
  if (role !== "comprador") return new Response("Solo compradores pueden hacer checkout", { status: 403 });
  const clerk = await clerkClient();
  const clerkUser = await clerk.users.getUser(userId);
  const email = clerkUser.emailAddresses[0]?.emailAddress;
  if (!email) return new Response("No email", { status: 400 });

  const usuario = await prisma.usuario.findUnique({
    where: { email },
    select: {
      id_usuario: true,
      comprador: { select: { direccion_envio: true } },
    },
  });
  if (!usuario) return new Response("Usuario no encontrado", { status: 404 });

  const body = (await req.json()) as { direccion_envio?: string };
  const direccion_envio = body.direccion_envio?.trim() || usuario.comprador?.direccion_envio;
  if (!direccion_envio)
    return new Response("Se requiere una dirección de envío", { status: 400 });

  const carrito = await prisma.carrito.findFirst({
    where: { id_usuario: usuario.id_usuario, estado: "activo" },
    select: {
      id_carrito: true,
      items: { select: { id_producto: true, cantidad: true } },
    },
  });

  if (!carrito) return new Response("No hay un carrito activo", { status: 404 });
  if (carrito.items.length === 0) return new Response("El carrito está vacío", { status: 400 });

  try {
    const result = await checkoutAtomico(
      usuario.id_usuario,
      carrito.id_carrito,
      carrito.items,
      direccion_envio
    );

    return Response.json({
      id_pedido: result.orden.id_pedido,
      importe_total: result.importe_total,
      estado: result.orden.estado,
      reservacion_minutos: result.reservationMinutes,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error en el checkout";
    return new Response(message, { status: 409 });
  }
}

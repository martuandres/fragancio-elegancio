import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";
import { NextRequest } from "next/server";

async function resolveComprador() {
  const { userId } = await auth();
  if (!userId) return null;

  const clerk = await clerkClient();
  const clerkUser = await clerk.users.getUser(userId);
  const role = (clerkUser.publicMetadata as { role?: string } | undefined)?.role;
  if (role !== "comprador" && role !== "admin") return null;

  const email = clerkUser.emailAddresses[0]?.emailAddress;
  if (!email) return null;

  return prisma.comprador.findFirst({
    where: { email },
    select: { legajo: true },
  });
}

async function getOrCreateCarritoActivo(legajo: string) {
  const existing = await prisma.carrito.findFirst({
    where: { legajo, estado: "activo" },
    select: { id_carrito: true },
  });
  if (existing) return existing;

  return prisma.carrito.create({
    data: { legajo, estado: "activo" },
    select: { id_carrito: true },
  });
}

// GET /api/carrito — carrito activo del comprador con ítems y total
export async function GET() {
  const comprador = await resolveComprador();
  if (!comprador)
    return apiError("NO_AUTENTICADO", "Autenticación requerida. Solo compradores pueden acceder al carrito.", 401);

  const carrito = await prisma.carrito.findFirst({
    where: { legajo: comprador.legajo, estado: "activo" },
    select: {
      id_carrito: true,
      fecha_creada: true,
      items: {
        select: {
          cantidad: true,
          producto: {
            select: {
              id_producto: true,
              nombre: true,
              marca: true,
              stock: true,
              variante: {
                take: 1,
                orderBy: { ranking: "asc" },
                select: { precio: true, concentracion: true },
              },
            },
          },
        },
      },
    },
  });

  if (!carrito) return Response.json({ id_carrito: null, items: [], total: 0 });

  const items = carrito.items.map((item) => {
    const v = item.producto.variante[0];
    return {
      cantidad: item.cantidad,
      producto: {
        id_producto: item.producto.id_producto,
        nombre: item.producto.nombre,
        marca: item.producto.marca,
        stock: item.producto.stock,
        precio: Number(v?.precio ?? 0),
        concentracion: v?.concentracion ?? null,
      },
    };
  });

  const total = items.reduce((sum, item) => sum + item.producto.precio * item.cantidad, 0);

  return Response.json({ id_carrito: carrito.id_carrito, fecha_creada: carrito.fecha_creada, items, total });
}

// POST /api/carrito — agregar o actualizar un ítem { id_producto, cantidad }
export async function POST(req: NextRequest) {
  const comprador = await resolveComprador();
  if (!comprador)
    return apiError("NO_AUTENTICADO", "Autenticación requerida. Solo compradores pueden modificar el carrito.", 401);

  const body = (await req.json()) as { id_producto?: unknown; cantidad?: unknown };
  const id_producto = Number(body.id_producto);
  const cantidad = Number(body.cantidad);

  if (!Number.isInteger(id_producto) || id_producto <= 0)
    return apiError("ID_INVALIDO", "El campo 'id_producto' debe ser un entero positivo.", 400);
  if (!Number.isInteger(cantidad) || cantidad <= 0)
    return apiError("CANTIDAD_INVALIDA", "El campo 'cantidad' debe ser un entero positivo.", 400);

  const producto = await prisma.producto.findUnique({
    where: { id_producto },
    select: { stock: true },
  });
  if (!producto)
    return apiError("PRODUCTO_NO_ENCONTRADO", `No existe un producto con id ${id_producto}.`, 404);
  if (producto.stock < cantidad)
    return apiError(
      "STOCK_INSUFICIENTE",
      "No hay suficiente stock disponible para la cantidad solicitada.",
      409,
      `Stock disponible: ${producto.stock}, solicitado: ${cantidad}`
    );

  const { id_carrito } = await getOrCreateCarritoActivo(comprador.legajo);

  await prisma.carritoProducto.upsert({
    where: { id_carrito_id_producto: { id_carrito, id_producto } },
    create: { id_carrito, id_producto, cantidad },
    update: { cantidad },
  });

  return Response.json({ ok: true, id_carrito });
}

// DELETE /api/carrito — quitar un ítem { id_producto }
export async function DELETE(req: NextRequest) {
  const comprador = await resolveComprador();
  if (!comprador)
    return apiError("NO_AUTENTICADO", "Autenticación requerida. Solo compradores pueden modificar el carrito.", 401);

  const body = (await req.json()) as { id_producto?: unknown };
  const id_producto = Number(body.id_producto);

  if (!Number.isInteger(id_producto) || id_producto <= 0)
    return apiError("ID_INVALIDO", "El campo 'id_producto' debe ser un entero positivo.", 400);

  const carrito = await prisma.carrito.findFirst({
    where: { legajo: comprador.legajo, estado: "activo" },
    select: { id_carrito: true },
  });
  if (!carrito)
    return apiError("CARRITO_NO_ENCONTRADO", "No existe un carrito activo para este usuario.", 404);

  await prisma.carritoProducto.deleteMany({
    where: { id_carrito: carrito.id_carrito, id_producto },
  });

  return new Response(null, { status: 204 });
}

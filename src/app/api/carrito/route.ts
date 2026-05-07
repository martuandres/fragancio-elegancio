import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

async function resolveComprador() {
  const { userId, sessionClaims } = await auth();
  if (!userId) return null;

  const role = (sessionClaims?.publicMetadata as { role?: string } | undefined)?.role;
  if (role !== "comprador") return null;

  const clerk = await clerkClient();
  const clerkUser = await clerk.users.getUser(userId);
  const email = clerkUser.emailAddresses[0]?.emailAddress;
  if (!email) return null;

  return prisma.usuario.findUnique({
    where: { email },
    select: { id_usuario: true },
  });
}

async function getOrCreateCarritoActivo(id_usuario: number) {
  const existing = await prisma.carrito.findFirst({
    where: { id_usuario, estado: "activo" },
    select: { id_carrito: true },
  });
  if (existing) return existing;

  return prisma.carrito.create({
    data: { id_usuario, estado: "activo" },
    select: { id_carrito: true },
  });
}

// GET /api/carrito — returns the active cart with its items
export async function GET() {
  const usuario = await resolveComprador();
  if (!usuario) return new Response("Unauthorized", { status: 401 });

  const carrito = await prisma.carrito.findFirst({
    where: { id_usuario: usuario.id_usuario, estado: "activo" },
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
              precio: true,
              stock: true,
              concentracion: true,
            },
          },
        },
      },
    },
  });

  if (!carrito) return Response.json({ id_carrito: null, items: [], total: 0 });

  const total = carrito.items.reduce(
    (sum, item) => sum + Number(item.producto.precio) * item.cantidad,
    0
  );

  return Response.json({ ...carrito, total });
}

// POST /api/carrito — add or update an item { id_producto, cantidad }
export async function POST(req: NextRequest) {
  const usuario = await resolveComprador();
  if (!usuario) return new Response("Unauthorized", { status: 401 });

  const body = (await req.json()) as { id_producto?: unknown; cantidad?: unknown };
  const id_producto = Number(body.id_producto);
  const cantidad = Number(body.cantidad);

  if (!Number.isInteger(id_producto) || id_producto <= 0)
    return new Response("id_producto inválido", { status: 400 });
  if (!Number.isInteger(cantidad) || cantidad <= 0)
    return new Response("cantidad debe ser un entero positivo", { status: 400 });

  const producto = await prisma.producto.findUnique({
    where: { id_producto },
    select: { stock: true },
  });
  if (!producto) return new Response("Producto no encontrado", { status: 404 });
  if (producto.stock < cantidad)
    return new Response("Stock insuficiente", { status: 409 });

  const { id_carrito } = await getOrCreateCarritoActivo(usuario.id_usuario);

  await prisma.carritoProducto.upsert({
    where: { id_carrito_id_producto: { id_carrito, id_producto } },
    create: { id_carrito, id_producto, cantidad },
    update: { cantidad },
  });

  return Response.json({ ok: true, id_carrito });
}

// DELETE /api/carrito — remove an item { id_producto }
export async function DELETE(req: NextRequest) {
  const usuario = await resolveComprador();
  if (!usuario) return new Response("Unauthorized", { status: 401 });

  const body = (await req.json()) as { id_producto?: unknown };
  const id_producto = Number(body.id_producto);

  if (!Number.isInteger(id_producto) || id_producto <= 0)
    return new Response("id_producto inválido", { status: 400 });

  const carrito = await prisma.carrito.findFirst({
    where: { id_usuario: usuario.id_usuario, estado: "activo" },
    select: { id_carrito: true },
  });
  if (!carrito) return new Response("Carrito no encontrado", { status: 404 });

  await prisma.carritoProducto.deleteMany({
    where: { id_carrito: carrito.id_carrito, id_producto },
  });

  return Response.json({ ok: true });
}

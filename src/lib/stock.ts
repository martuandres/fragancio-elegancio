import { prisma } from "./prisma";

const RESERVATION_MINUTES = 5;

export type CartItem = { id_producto: number; cantidad: number };

/**
 * Validates stock and creates an OrdenCompra inside a single transaction.
 * Throws if any item is out of stock.
 */
export async function checkoutAtomico(
  id_usuario: number,
  id_carrito: number,
  items: CartItem[],
  direccion_envio: string
) {
  return prisma.$transaction(async (tx) => {
    // Lock and validate stock for every item
    for (const item of items) {
      const producto = await tx.producto.findUnique({
        where: { id_producto: item.id_producto },
        select: { id_producto: true, precio: true, stock: true, nombre: true },
      });

      if (!producto) throw new Error(`Producto ${item.id_producto} no existe`);
      if (producto.stock < item.cantidad) {
        throw new Error(
          `Stock insuficiente para "${producto.nombre}": disponible ${producto.stock}, solicitado ${item.cantidad}`
        );
      }

      // Reserve stock
      await tx.producto.update({
        where: { id_producto: item.id_producto },
        data: { stock: { decrement: item.cantidad } },
      });
    }

    // Calculate total from current prices
    const productosConPrecio = await tx.producto.findMany({
      where: { id_producto: { in: items.map((i) => i.id_producto) } },
      select: { id_producto: true, precio: true },
    });

    const importe_total = items.reduce((sum, item) => {
      const p = productosConPrecio.find((p) => p.id_producto === item.id_producto)!;
      return sum + Number(p.precio) * item.cantidad;
    }, 0);

    // Create order
    const orden = await tx.ordenCompra.create({
      data: {
        id_usuario,
        id_carrito,
        importe_total,
        direccion_envio,
        estado: "pendiente",
        items: {
          create: items.map((item) => ({
            id_producto: item.id_producto,
            cantidad: item.cantidad,
            precio: productosConPrecio.find((p) => p.id_producto === item.id_producto)!.precio,
          })),
        },
      },
    });

    // Mark cart as converted
    await tx.carrito.update({
      where: { id_carrito },
      data: { estado: "convertido" },
    });

    return { orden, importe_total, reservationMinutes: RESERVATION_MINUTES };
  });
}

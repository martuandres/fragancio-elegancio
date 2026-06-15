import { prisma } from "./prisma";

const STOCK_CRITICO = 5;

export type CartItem = { id_producto: number; cantidad: number };

export type RestockInfo = {
  nombre: string;
  nuevoStock: number;
  emails: string[];
};

export async function checkoutAtomico(id_carrito: number, items: CartItem[]) {
  return prisma.$transaction(async (tx) => {
    let importe_total = 0;
    const restocks: RestockInfo[] = [];

    for (const item of items) {
      const producto = await tx.producto.findUnique({
        where: { id_producto: item.id_producto },
        select: {
          id_producto: true,
          stock: true,
          nombre: true,
          variante: {
            take: 1,
            orderBy: { ranking: "asc" as const },
            select: { precio: true },
          },
          proveedores: {
            select: {
              proveedor: { select: { email_contacto: true } },
            },
          },
        },
      });

      if (!producto) throw new Error(`Producto ${item.id_producto} no existe`);
      if (producto.stock < item.cantidad) {
        throw new Error(
          `Stock insuficiente para "${producto.nombre}": disponible ${producto.stock}, solicitado ${item.cantidad}`
        );
      }

      await tx.producto.update({
        where: { id_producto: item.id_producto },
        data: { stock: { decrement: item.cantidad } },
      });

      const nuevoStock = producto.stock - item.cantidad;
      if (nuevoStock <= STOCK_CRITICO && producto.proveedores.length > 0) {
        restocks.push({
          nombre: producto.nombre,
          nuevoStock,
          emails: producto.proveedores.map((p) => p.proveedor.email_contacto),
        });
      }

      const precio = Number(producto.variante[0]?.precio ?? 0);
      importe_total += precio * item.cantidad;
    }

    const pago = await tx.pago.create({
      data: { id_carrito, estado: "pendiente" },
      select: { id_pago: true, id_carrito: true, estado: true },
    });

    await tx.carrito.update({
      where: { id_carrito },
      data: { estado: "convertido" },
    });

    return { pago, importe_total, restocks };
  });
}

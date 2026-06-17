import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

type PerfumAPIItem = {
  name?: string;
  brand?: string;
  notes_top?: string[];
  notes_middle?: string[];
  notes_base?: string[];
  description?: string;
  gender?: string;
  image_url?: string;
};

async function main() {
  console.log("Fetching perfumes from PerfumAPI...");

  const res = await fetch("https://perfumapidatabase.onrender.com/perfumes?limit=100");
  if (!res.ok) throw new Error(`PerfumAPI error: ${res.status}`);

  const data = await res.json() as { perfumes?: PerfumAPIItem[] } | PerfumAPIItem[];
  const perfumes = Array.isArray(data) ? data : (data.perfumes ?? []);

  console.log(`Got ${perfumes.length} perfumes. Upserting...`);

  for (const p of perfumes) {
    const nombre = p.name?.trim();
    const marca  = p.brand?.trim();
    if (!nombre || !marca) continue;

    const productoPayload = {
      nombre,
      marca,
      stock:         10,
      ingrediente:   p.description?.trim() || "",
      imagen_url:    p.image_url?.trim() || null,
      notas_salida:  p.notes_top?.join(", ")    || null,
      notas_corazon: p.notes_middle?.join(", ") || null,
      notas_fondo:   p.notes_base?.join(", ")   || null,
    };

    const existente = await prisma.producto.findFirst({
      where: { nombre, marca },
      select: { id_producto: true },
    });
    const producto = existente
      ? await prisma.producto.update({ where: { id_producto: existente.id_producto }, data: productoPayload, select: { id_producto: true } })
      : await prisma.producto.create({ data: productoPayload, select: { id_producto: true } });

    // Crear variante con precio/concentración por defecto si no tiene ninguna
    const yaTieneVariante = await prisma.varianteProducto.findFirst({
      where: { id_producto: producto.id_producto },
    });

    if (!yaTieneVariante) {
      await prisma.varianteProducto.create({
        data: {
          id_producto:   producto.id_producto,
          volumen:       50,
          precio:        50000,
          concentracion: p.gender?.trim() || "EDP",
          ranking:       1,
        },
      });
    }
  }

  console.log(`Done. ${perfumes.length} productos procesados.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

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
      ingrediente:   p.description?.trim() || null,
      imagen_url:    p.image_url?.trim() || null,
      notas_salida:  p.notes_top?.join(", ")    || null,
      notas_corazon: p.notes_middle?.join(", ") || null,
      notas_fondo:   p.notes_base?.join(", ")   || null,
    };

    const producto = await prisma.producto.upsert({
      where:  { nombre_marca: { nombre, marca } },
      create: productoPayload,
      update: productoPayload,
      select: { id_producto: true },
    });

    // Crear variante con precio/concentración por defecto si no tiene ninguna
    const yaTieneVariante = await prisma.productoVarianteProducto.findFirst({
      where: { id_producto: producto.id_producto },
    });

    if (!yaTieneVariante) {
      const variante = await prisma.varianteProducto.create({
        data: {
          volumen:       50,
          precio:        50000,
          concentracion: p.gender?.trim() || null,
        },
        select: { id_variante_producto: true },
      });

      await prisma.productoVarianteProducto.create({
        data: {
          id_producto:          producto.id_producto,
          id_variante_producto: variante.id_variante_producto,
          ranking:              1,
        },
      });
    }
  }

  console.log(`Done. ${perfumes.length} productos procesados.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

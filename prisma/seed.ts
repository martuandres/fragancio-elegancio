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
  rating?: number | string;
};

async function main() {
  console.log("Fetching perfumes from PerfumAPI...");

  const res = await fetch("https://perfumapidatabase.onrender.com/perfumes?limit=100");
  if (!res.ok) throw new Error(`PerfumAPI error: ${res.status}`);

  const data = await res.json() as { perfumes?: PerfumAPIItem[] } | PerfumAPIItem[];
  const perfumes = Array.isArray(data) ? data : (data.perfumes ?? []);

  console.log(`Got ${perfumes.length} perfumes. Upserting...`);

  let created = 0;
  let updated = 0;

  for (const p of perfumes) {
    const nombre = p.name?.trim();
    const marca  = p.brand?.trim();
    if (!nombre || !marca) continue;

    const payload = {
      nombre,
      marca,
      precio:        50000,
      stock:         10,
      concentracion: p.gender?.trim() || null,
      ingredientes:  p.description?.trim() || null,
      imagen_url:    p.image_url?.trim() || null,
      notas_salida:  p.notes_top?.join(", ")    || null,
      notas_corazon: p.notes_middle?.join(", ") || null,
      notas_fondo:   p.notes_base?.join(", ")   || null,
    };

    const result = await prisma.producto.upsert({
      where:  { nombre_marca: { nombre, marca } },
      create: payload,
      update: payload,
    });

    // upsert no distingue create/update, contamos por id
    if (result.id_producto > 0) created++;
    else updated++;
  }

  console.log(`Done. ${perfumes.length} productos procesados.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

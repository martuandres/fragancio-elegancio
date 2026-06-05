import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx tsx prisma/seed.ts",
  },
  datasource: {
    // Direct URL (no PgBouncer) used by the Prisma CLI for migrations
    url: process.env["DIRECT_URL"]!,
  },
});

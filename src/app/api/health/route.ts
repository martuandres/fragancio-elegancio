import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", db: "connected", timestamp: new Date().toISOString() });
  } catch (err) {
    const e = err as Error;
    console.error("[health] db error:", e);
    return NextResponse.json(
      {
        status: "error",
        db: "disconnected",
        error: e.message,
        code: (e as { code?: string }).code,
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        hasDirectUrl: !!process.env.DIRECT_URL,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
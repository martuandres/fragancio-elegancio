import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";
import { NextRequest } from "next/server";

// POST /api/auth/onboarding — asignar rol al usuario y crear perfil comprador/vendedor
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId)
    return apiError("NO_AUTENTICADO", "Se requiere autenticación para completar el onboarding.", 401);

  const { role } = (await req.json()) as { role: string };
  if (!["comprador", "vendedor", "admin"].includes(role))
    return apiError("ROL_INVALIDO", "El rol debe ser 'comprador', 'vendedor' o 'admin'.", 400);

  const clerk = await clerkClient();
  const clerkUser = await clerk.users.getUser(userId);
  const email = clerkUser.emailAddresses[0]?.emailAddress;
  if (!email)
    return apiError("EMAIL_NO_ENCONTRADO", "No se encontró un email asociado a la cuenta de Clerk.", 400);

  const nombre =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || email;

  if (role === "comprador" || role === "admin") {
    await prisma.comprador.upsert({
      where: { email },
      create: { legajo: `C-${Date.now()}`, email, nombre },
      update: {},
    });
  }
  if (role === "vendedor" || role === "admin") {
    await prisma.vendedor.upsert({
      where: { email },
      create: { email, nombre, cbu: "" },
      update: {},
    });
  }

  await clerk.users.updateUserMetadata(userId, {
    publicMetadata: { role },
  });

  return Response.json({ ok: true });
}

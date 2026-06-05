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
  if (role !== "comprador" && role !== "vendedor")
    return apiError("ROL_INVALIDO", "El rol debe ser 'comprador' o 'vendedor'.", 400);

  const clerk = await clerkClient();
  const clerkUser = await clerk.users.getUser(userId);
  const email = clerkUser.emailAddresses[0]?.emailAddress;
  if (!email)
    return apiError("EMAIL_NO_ENCONTRADO", "No se encontró un email asociado a la cuenta de Clerk.", 400);

  let usuario = await prisma.usuario.findUnique({ where: { email } });
  if (!usuario) {
    const nombre =
      [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || email;
    usuario = await prisma.usuario.create({
      data: { nombre, email, contrasena: "" },
    });
  }

  if (role === "comprador") {
    await prisma.comprador.upsert({
      where: { id_usuario: usuario.id_usuario },
      create: { id_usuario: usuario.id_usuario, legajo: `legajo-${usuario.id_usuario}` },
      update: {},
    });
  } else {
    await prisma.vendedor.upsert({
      where: { id_usuario: usuario.id_usuario },
      create: {
        id_usuario: usuario.id_usuario,
        legajo: `legajo-${usuario.id_usuario}`,
        cbu: "",
      },
      update: {},
    });
  }

  await clerk.users.updateUserMetadata(userId, {
    publicMetadata: { role },
  });

  return Response.json({ ok: true });
}

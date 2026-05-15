import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { role } = (await req.json()) as { role: string };
  if (role !== "comprador" && role !== "vendedor") {
    return new Response("Invalid role", { status: 400 });
  }

  const clerk = await clerkClient();
  const clerkUser = await clerk.users.getUser(userId);
  const email = clerkUser.emailAddresses[0]?.emailAddress;
  if (!email) return new Response("No email found", { status: 400 });

  // Find or create Usuario (fallback if webhook didn't fire yet)
  let usuario = await prisma.usuario.findUnique({ where: { email } });
  if (!usuario) {
    const nombre =
      [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
      email;
    usuario = await prisma.usuario.create({
      data: { nombre, email, contrasena: "" },
    });
  }

  if (role === "comprador") {
    await prisma.comprador.upsert({
      where: { id_usuario: usuario.id_usuario },
      create: { id_usuario: usuario.id_usuario },
      update: {},
    });
  } else {
    await prisma.vendedor.upsert({
      where: { id_usuario: usuario.id_usuario },
      create: {
        id_usuario: usuario.id_usuario,
        legajo: `legajo-${usuario.id_usuario}`,
        cbu: "",
        email_contacto: email,
      },
      update: {},
    });
  }

  await clerk.users.updateUserMetadata(userId, {
    publicMetadata: { role },
  });

  return Response.json({ ok: true });
}

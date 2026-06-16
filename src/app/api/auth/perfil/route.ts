import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";
import { NextRequest } from "next/server";

async function resolveComprador() {
  const { userId } = await auth();
  if (!userId) return null;

  const clerk = await clerkClient();
  const clerkUser = await clerk.users.getUser(userId);
  const role = (clerkUser.publicMetadata as { role?: string } | undefined)?.role;
  if (role !== "comprador" && role !== "admin") return null;

  const email = clerkUser.emailAddresses[0]?.emailAddress;
  if (!email) return null;

  return prisma.comprador.findFirst({
    where: { email },
    select: { legajo: true, nombre: true, email: true, direccion_envio: true, telefono: true },
  });
}

// GET /api/auth/perfil — datos del comprador autenticado
export async function GET() {
  const comprador = await resolveComprador();
  if (!comprador)
    return apiError("NO_AUTENTICADO", "Se requiere autenticación como comprador.", 401);

  return Response.json(comprador);
}

// PATCH /api/auth/perfil — actualizar dirección de envío y/o teléfono
export async function PATCH(req: NextRequest) {
  const comprador = await resolveComprador();
  if (!comprador)
    return apiError("NO_AUTENTICADO", "Se requiere autenticación como comprador.", 401);

  const body = (await req.json()) as { direccion_envio?: string; telefono?: string };

  if (body.direccion_envio !== undefined && !String(body.direccion_envio).trim())
    return apiError("CAMPO_INVALIDO", "La dirección de envío no puede estar vacía.", 400);
  if (body.telefono !== undefined && !String(body.telefono).trim())
    return apiError("CAMPO_INVALIDO", "El teléfono no puede estar vacío.", 400);

  const actualizado = await prisma.comprador.update({
    where: { legajo: comprador.legajo },
    data: {
      ...(body.direccion_envio !== undefined && { direccion_envio: String(body.direccion_envio).trim() }),
      ...(body.telefono !== undefined && { telefono: String(body.telefono).trim() }),
    },
    select: { legajo: true, nombre: true, email: true, direccion_envio: true, telefono: true },
  });

  return Response.json(actualizado);
}

import { Webhook } from "svix";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) return new Response("Missing CLERK_WEBHOOK_SECRET", { status: 500 });

  const headersList = await headers();
  const svixId = headersList.get("svix-id");
  const svixTimestamp = headersList.get("svix-timestamp");
  const svixSignature = headersList.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Missing svix headers", { status: 400 });
  }

  const body = await req.text();
  const wh = new Webhook(secret);

  let payload: { type: string; data: Record<string, unknown> };
  try {
    payload = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as typeof payload;
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  if (payload.type === "user.created") {
    const data = payload.data as {
      email_addresses: { email_address: string }[];
      first_name?: string | null;
      last_name?: string | null;
    };

    const email = data.email_addresses[0]?.email_address;
    if (!email) return new Response("No email", { status: 400 });

    const nombre =
      [data.first_name, data.last_name].filter(Boolean).join(" ") || email;

    await prisma.usuario.upsert({
      where: { email },
      create: { nombre, email, contrasena: "" },
      update: {},
    });
  }

  return new Response("OK", { status: 200 });
}

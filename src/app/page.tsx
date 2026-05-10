// TEMP: Clerk desactivado temporalmente
import { redirect } from "next/navigation";

export default async function Home() {
  // const { userId, sessionClaims } = await auth();
  // if (!userId) redirect("/sign-in");
  // const role = (sessionClaims?.publicMetadata as { role?: string } | undefined)?.role;
  
  redirect("/catalogo");
}

import { mpPreference } from "@/lib/mercadopago";

export interface MPItem {
  id: string;
  title: string;
  quantity: number;
  unit_price: number;
  currency_id: string;
}

export async function crearPreferenciaMP(
  items: MPItem[],
  id_carrito: number,
  baseUrl: string
): Promise<string | null> {
  if (!process.env.MP_ACCESS_TOKEN) return null;

  const pref = await mpPreference.create({
    body: {
      items,
      external_reference: id_carrito.toString(),
      back_urls: {
        success: `${baseUrl}/pago/exito`,
        failure: `${baseUrl}/pago/rechazo`,
        pending: `${baseUrl}/pago/pendiente`,
      },
      // auto_return solo funciona con HTTPS; en localhost MP rechaza la preferencia
      ...(baseUrl.startsWith("https://") ? { auto_return: "approved" as const } : {}),
      notification_url: `${baseUrl}/api/pagos/mercadopago`,
    },
  });

  return pref.sandbox_init_point ?? pref.init_point ?? null;
}

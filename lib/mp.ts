import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import { db } from './db';
import { SITE_URL } from './env';
import { descontarStock } from './stock';
import type { Pedido } from './types';

function cliente() {
  return new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN!, options: { timeout: 10000 } });
}

export async function crearPreferencia(p: Pedido, nombreTienda: string) {
  const https = SITE_URL.startsWith('https://');
  const vuelta = `${SITE_URL}/pedido/${p.id}`;
  const pref = await new Preference(cliente()).create({
    body: {
      items: p.items.map((it) => ({
        id: it.producto_id || 'item', title: it.nombre, quantity: it.cantidad, unit_price: Number(it.precio), currency_id: 'ARS',
      })),
      external_reference: p.id,
      back_urls: { success: vuelta, pending: vuelta, failure: vuelta },
      ...(https ? { auto_return: 'approved', notification_url: `${SITE_URL}/api/mp/webhook` } : {}),
      payer: { name: p.cliente_nombre },
      statement_descriptor: nombreTienda.slice(0, 22),
      metadata: { pedido_numero: p.numero },
    },
  });
  return { id: pref.id!, init_point: pref.init_point! };
}

const MAPA: Record<string, Pedido['estado'] | undefined> = {
  approved: 'pagado',
  refunded: 'cancelado',
  charged_back: 'cancelado',
};

/** Consulta el pago en Mercado Pago (fuente de verdad) y actualiza el pedido. */
export async function aplicarPago(paymentId: string | number) {
  const pago = await new Payment(cliente()).get({ id: String(paymentId) });
  const ref = pago.external_reference;
  if (!ref) return null;
  const { data } = await db().from('pedidos').select('*').eq('id', ref).maybeSingle();
  if (!data) return null;
  const pedido = data as Pedido;
  const nuevo = MAPA[pago.status || ''];
  const cambios: Partial<Pedido> = { mp_payment_id: String(pago.id) };
  if (nuevo === 'pagado' && (pedido.estado === 'pendiente_pago' || pedido.estado === 'reservado')) cambios.estado = 'pagado';
  if (nuevo === 'cancelado' && pedido.estado !== 'cancelado') cambios.estado = 'cancelado';
  await db().from('pedidos').update(cambios).eq('id', pedido.id);
  if (cambios.estado === 'pagado') await descontarStock(pedido);
  return { ...pedido, ...cambios } as Pedido;
}

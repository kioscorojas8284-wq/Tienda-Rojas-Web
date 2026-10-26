import { db } from './db';
import type { Pedido } from './types';

export async function descontarStock(p: Pedido) {
  if (p.stock_descontado) return;
  for (const it of p.items) if (it.producto_id) await db().rpc('ajustar_stock', { p_id: it.producto_id, delta: -it.cantidad });
  await db().from('pedidos').update({ stock_descontado: true }).eq('id', p.id);
}

export async function reponerStock(p: Pedido) {
  if (!p.stock_descontado) return;
  for (const it of p.items) if (it.producto_id) await db().rpc('ajustar_stock', { p_id: it.producto_id, delta: it.cantidad });
  await db().from('pedidos').update({ stock_descontado: false }).eq('id', p.id);
}

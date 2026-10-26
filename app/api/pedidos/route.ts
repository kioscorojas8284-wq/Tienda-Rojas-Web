import { NextResponse } from 'next/server';
import { db, getConfig, normProducto } from '@/lib/db';
import { upsertCliente } from '@/lib/clientes';
import { crearPreferencia } from '@/lib/mp';
import { descontarStock } from '@/lib/stock';
import { MP_ENABLED } from '@/lib/env';
import type { Item, Pedido } from '@/lib/types';

const s = (v: unknown, max = 200) => String(v ?? '').trim().slice(0, max);

export async function POST(req: Request) {
  let b: any;
  try { b = await req.json(); } catch { return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 }); }
  if (b.web) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 }); // trampa anti-spam

  const nombre = s(b.nombre, 120), telefono = s(b.telefono, 40), email = s(b.email, 160), nota = s(b.nota, 500);
  const metodo = ['mercadopago', 'efectivo', 'transferencia'].includes(b.metodo) ? b.metodo : '';
  if (!nombre || telefono.replace(/\D/g, '').length < 8) return NextResponse.json({ error: 'Completá tu nombre y un WhatsApp válido.' }, { status: 400 });
  if (!metodo) return NextResponse.json({ error: 'Elegí cómo pagar.' }, { status: 400 });
  if (metodo === 'mercadopago' && !MP_ENABLED) return NextResponse.json({ error: 'Mercado Pago no está disponible ahora.' }, { status: 400 });

  const pedidos: { id: string; cantidad: number }[] = Array.isArray(b.items) ? b.items.slice(0, 50) : [];
  const ids = pedidos.map((i) => String(i.id)).filter((x) => /^[0-9a-f-]{36}$/i.test(x));
  if (!ids.length) return NextResponse.json({ error: 'El carrito está vacío.' }, { status: 400 });

  // Los precios y el stock salen SIEMPRE de la base, nunca del navegador.
  const { data: prods, error } = await db().from('productos').select('*').in('id', ids).eq('publicado', true);
  if (error) return NextResponse.json({ error: 'Error al leer productos' }, { status: 500 });
  const items: Item[] = [];
  for (const it of pedidos) {
    const p = prods?.find((x) => x.id === it.id);
    if (!p) return NextResponse.json({ error: 'Un producto del carrito ya no está disponible. Revisá el carrito.' }, { status: 409 });
    const prod = normProducto(p);
    const cant = Math.max(1, Math.min(99, Math.floor(Number(it.cantidad) || 1)));
    if (prod.stock !== null && prod.stock < cant) {
      return NextResponse.json({ error: prod.stock > 0 ? `De "${prod.nombre}" quedan ${prod.stock}.` : `"${prod.nombre}" se agotó.` }, { status: 409 });
    }
    items.push({ producto_id: prod.id, nombre: prod.nombre, precio: prod.precio, cantidad: cant });
  }
  const total = items.reduce((t, i) => t + i.precio * i.cantidad, 0);

  const cliente_id = await upsertCliente({ nombre, telefono, email, origen: 'compra' });
  const { data: ped, error: e2 } = await db().from('pedidos').insert({
    cliente_id, cliente_nombre: nombre, cliente_telefono: telefono, items, total, metodo, nota,
    estado: metodo === 'mercadopago' ? 'pendiente_pago' : 'reservado', origen: 'web',
  }).select('*').single();
  if (e2) return NextResponse.json({ error: 'No pudimos guardar el pedido' }, { status: 500 });
  const pedido = ped as Pedido;

  if (metodo === 'mercadopago') {
    try {
      const cfg = await getConfig();
      const pref = await crearPreferencia(pedido, cfg.nombre);
      await db().from('pedidos').update({ mp_preference_id: pref.id, mp_init_point: pref.init_point }).eq('id', pedido.id);
      return NextResponse.json({ id: pedido.id, init_point: pref.init_point });
    } catch (err) {
      console.error('Mercado Pago', err);
      await db().from('pedidos').update({ estado: 'cancelado', nota: (nota + ' [Error al iniciar Mercado Pago]').trim() }).eq('id', pedido.id);
      return NextResponse.json({ error: 'No pudimos conectar con Mercado Pago. Probá de nuevo o elegí otro medio de pago.' }, { status: 502 });
    }
  }
  // Reserva: se aparta el stock al confirmar
  await descontarStock(pedido);
  return NextResponse.json({ id: pedido.id });
}

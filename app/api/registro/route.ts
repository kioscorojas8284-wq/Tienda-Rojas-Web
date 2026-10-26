import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { telNorm } from '@/lib/format';

const s = (v: unknown, max = 200) => String(v ?? '').trim().slice(0, max);

export async function POST(req: Request) {
  let b: any;
  try { b = await req.json(); } catch { return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 }); }
  if (b.web) return NextResponse.json({ ok: true }); // bot: lo ignoramos en silencio

  const nombre = s(b.nombre, 120), telefono = s(b.telefono, 40), email = s(b.email, 160).toLowerCase();
  const norm = telNorm(telefono);
  if (!nombre) return NextResponse.json({ error: 'Poné tu nombre.' }, { status: 400 });
  if (norm.length < 10) return NextResponse.json({ error: 'Revisá el número de WhatsApp (con código de área).' }, { status: 400 });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: 'Revisá el email.' }, { status: 400 });
  const dia = Number(b.dia), mes = Number(b.mes);
  const cumple = dia >= 1 && dia <= 31 && mes >= 1 && mes <= 12 ? `${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}` : '';

  const datos = {
    nombre, telefono, telefono_norm: norm, email, direccion: s(b.direccion, 200), cumple,
    como_nos_conocio: s(b.como, 60), acepta_novedades: b.novedades === 'on' || b.novedades === true,
  };
  const { data: ex } = await db().from('clientes').select('id').eq('telefono_norm', norm).maybeSingle();
  const { error } = ex
    ? await db().from('clientes').update(Object.fromEntries(Object.entries(datos).filter(([, v]) => v !== ''))).eq('id', ex.id)
    : await db().from('clientes').insert({ ...datos, origen: 'registro' });
  if (error) { console.error(error); return NextResponse.json({ error: 'No pudimos registrarte. Probá de nuevo.' }, { status: 500 }); }
  return NextResponse.json({ ok: true });
}

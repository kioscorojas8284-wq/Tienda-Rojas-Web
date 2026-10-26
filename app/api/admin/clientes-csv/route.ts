import { getAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { cumpleTexto } from '@/lib/format';

export async function GET() {
  if (!(await getAdmin())) return new Response('No autorizado', { status: 401 });
  const { data } = await db().from('clientes').select('*').order('creado', { ascending: false });
  const cols = ['nombre', 'telefono', 'email', 'direccion', 'cumple', 'como_nos_conocio', 'acepta_novedades', 'origen', 'notas', 'creado'];
  const q = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = (data || []).map((c: any) => cols.map((k) => q(k === 'cumple' ? cumpleTexto(c.cumple) : k === 'acepta_novedades' ? (c[k] ? 'sí' : 'no') : c[k])).join(';'));
  const csv = '﻿' + [cols.join(';'), ...rows].join('\r\n');
  return new Response(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="clientes.csv"' } });
}

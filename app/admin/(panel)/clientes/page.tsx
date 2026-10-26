import Link from 'next/link';
import QRCode from 'qrcode';
import { db } from '@/lib/db';
import { SITE_URL } from '@/lib/env';
import { money, fecha, cumpleTexto, waLink, telNorm, MESES } from '@/lib/format';
import { guardarCliente, borrarCliente } from '@/app/admin/actions';
import Confirmar from '@/components/admin/Confirmar';
import CopyButton from '@/components/CopyButton';
import type { Cliente } from '@/lib/types';

const ORIGEN: Record<string, string> = { registro: 'Se registró', compra: 'Compró', manual: 'Cargado a mano' };

export default async function Clientes({ searchParams }: { searchParams: { q?: string; editar?: string; nuevo?: string; ok?: string; error?: string } }) {
  const q = (searchParams.q || '').trim().replace(/[%,()]/g, '');
  let query = db().from('clientes').select('*').order('creado', { ascending: false }).limit(500);
  if (q) query = query.or(`nombre.ilike.%${q}%,telefono.ilike.%${q}%,email.ilike.%${q}%`);
  const [{ data }, { data: peds }] = await Promise.all([query, db().from('pedidos').select('cliente_id,total,estado,creado')]);
  const C = (data || []) as Cliente[];
  const stats = new Map<string, { n: number; total: number; ult: string }>();
  for (const p of peds || []) {
    if (!p.cliente_id || p.estado === 'cancelado') continue;
    const s = stats.get(p.cliente_id) || { n: 0, total: 0, ult: '' };
    s.n++; if (p.estado !== 'pendiente_pago') s.total += Number(p.total); if (p.creado > s.ult) s.ult = p.creado;
    stats.set(p.cliente_id, s);
  }

  const linkRegistro = `${SITE_URL}/registro`;
  const qr = await QRCode.toDataURL(linkRegistro, { width: 720, margin: 2, errorCorrectionLevel: 'M' });
  const editando = searchParams.editar ? C.find((c) => c.id === searchParams.editar) || (await db().from('clientes').select('*').eq('id', searchParams.editar).maybeSingle()).data as Cliente : null;
  const mostrarForm = !!editando || !!searchParams.nuevo;
  const [cm, cd] = (editando?.cumple || '').split('-');

  return (
    <>
      <section className="panel">
        <h2>Link y QR para que tus clientes se registren</h2>
        <div className="qr" style={{ marginTop: 12 }}>
          <img src={qr} alt="Código QR del registro de clientes" />
          <div className="stack">
            <p className="note" style={{ fontSize: 15, margin: 0 }}>Compartilo por WhatsApp o Instagram, o imprimí el QR para el mostrador. Cada persona que complete el formulario aparece abajo en la lista.</p>
            <div className="copy box"><code>{linkRegistro}</code><CopyButton text={linkRegistro} label="Copiar link" /></div>
            <div className="row">
              <a className="btn" href={qr} download="qr-registro-clientes.png">Descargar QR</a>
              <a className="btn wa" target="_blank" rel="noopener" href={`https://wa.me/?text=${encodeURIComponent(`¡Registrate como cliente y recibí novedades! ${linkRegistro}`)}`}>Compartir por WhatsApp</a>
              <a className="btn ghost" href={linkRegistro} target="_blank" rel="noopener">Ver formulario ↗</a>
            </div>
          </div>
        </div>
      </section>

      {mostrarForm && (
        <form action={guardarCliente} className="panel fgrid">
          <input type="hidden" name="id" value={editando?.id || ''} />
          <div className="phead full" style={{ marginBottom: 0 }}><h2>{editando ? 'Editar cliente' : 'Nuevo cliente'}</h2><Link className="btn ghost sm" href="/admin/clientes">Cancelar</Link></div>
          <label className="f"><span>Nombre y apellido</span><input className="inp" id="c_nombre" name="nombre" required defaultValue={editando?.nombre} /></label>
          <label className="f"><span>WhatsApp</span><input className="inp" id="c_tel" name="telefono" inputMode="tel" defaultValue={editando?.telefono} /></label>
          <label className="f"><span>Email</span><input className="inp" id="c_email" name="email" type="email" defaultValue={editando?.email} /></label>
          <label className="f"><span>Dirección</span><input className="inp" id="c_dir" name="direccion" defaultValue={editando?.direccion} /></label>
          <div className="f"><span>Cumpleaños</span><div className="row" style={{ flexWrap: 'nowrap' }}>
            <select className="inp" id="c_dia" name="dia" defaultValue={cd ? String(Number(cd)) : ''} aria-label="Día"><option value="">Día</option>{Array.from({ length: 31 }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}</select>
            <select className="inp" id="c_mes" name="mes" defaultValue={cm ? String(Number(cm)) : ''} aria-label="Mes"><option value="">Mes</option>{MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select>
          </div></div>
          <label className="row" style={{ gap: 8, alignSelf: 'end' }}><input type="checkbox" id="c_nov" name="novedades" defaultChecked={editando ? editando.acepta_novedades : true} />Acepta novedades por WhatsApp</label>
          <label className="f full"><span>Notas</span><textarea className="inp" id="c_notas" name="notas" defaultValue={editando?.notas} placeholder="Talles, gustos, preferencias…" /></label>
          <div className="full"><button className="btn pri">Guardar cliente</button></div>
        </form>
      )}

      <section className="panel">
        <div className="phead">
          <div><h2>Clientes</h2><span className="meta">{C.length}{q ? ' encontrados' : ' en total'}</span></div>
          <div className="row">
            <form><input className="search" style={{ marginLeft: 0 }} name="q" defaultValue={q} placeholder="Buscar nombre, teléfono o email" aria-label="Buscar clientes" /></form>
            <a className="btn sm" href="/api/admin/clientes-csv">Exportar Excel (CSV)</a>
            {!mostrarForm && <Link className="btn sm pri" href="/admin/clientes?nuevo=1">+ Nuevo cliente</Link>}
          </div>
        </div>
        {searchParams.ok && <div className="alert ok" style={{ marginBottom: 12 }}>Cliente guardado.</div>}
        {searchParams.error === 'telefono' && <div className="alert err" style={{ marginBottom: 12 }}>Ya hay un cliente con ese WhatsApp. Buscalo en la lista.</div>}
        {!C.length ? <div className="empty"><h3>{q ? 'Sin resultados' : 'Todavía no hay clientes'}</h3><p>Compartí el link o el QR de arriba: cada registro aparece acá.</p></div> : (
          <div className="tbl"><table>
            <thead><tr><th>Cliente</th><th>Contacto</th><th>Cumple</th><th className="num">Compras</th><th className="num">Total</th><th>Alta</th><th></th></tr></thead>
            <tbody>{C.map((c) => {
              const s = stats.get(c.id);
              return (
                <tr key={c.id}>
                  <td><strong>{c.nombre}</strong>{c.direccion && <div className="meta">{c.direccion}</div>}{c.notas && <div className="meta">{c.notas}</div>}</td>
                  <td className="meta">{c.telefono}{c.email && <div>{c.email}</div>}</td>
                  <td className="meta">{cumpleTexto(c.cumple)}</td>
                  <td className="num">{s?.n || 0}</td>
                  <td className="num">{money(s?.total || 0)}</td>
                  <td className="meta">{fecha(c.creado)}<div><span className="pill">{ORIGEN[c.origen] || c.origen}</span></div>{c.como_nos_conocio && <div>vía {c.como_nos_conocio}</div>}</td>
                  <td><div className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>
                    {c.telefono && <a className="btn sm wa" target="_blank" rel="noopener" href={waLink(telNorm(c.telefono), `Hola ${c.nombre.split(' ')[0]}!`)}>WhatsApp</a>}
                    <Link className="btn sm" href={`/admin/clientes?editar=${c.id}`}>Editar</Link>
                    <Confirmar accion={borrarCliente.bind(null, c.id)} />
                  </div></td>
                </tr>
              );
            })}</tbody>
          </table></div>
        )}
      </section>
    </>
  );
}

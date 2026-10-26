import Link from 'next/link';
import { db } from '@/lib/db';
import { money, fecha, ESTADOS, METODOS, cumpleTexto, waLink, telNorm } from '@/lib/format';
import type { Pedido, Cliente } from '@/lib/types';

export default async function Inicio() {
  const ahora = new Date();
  const ar = new Date(ahora.toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
  const mesIni = new Date(Date.UTC(ar.getFullYear(), ar.getMonth(), 1, 3)).toISOString();
  const mm = String(ar.getMonth() + 1).padStart(2, '0');
  const [{ data: activos }, { data: delMes }, { data: nuevos }, { data: cumples }, { count: totalClientes }] = await Promise.all([
    db().from('pedidos').select('*').in('estado', ['pendiente_pago', 'reservado', 'pagado']).order('creado', { ascending: false }),
    db().from('pedidos').select('total,estado').gte('creado', mesIni).in('estado', ['pagado', 'entregado']),
    db().from('clientes').select('id').gte('creado', mesIni),
    db().from('clientes').select('*').like('cumple', `${mm}-%`).order('cumple'),
    db().from('clientes').select('id', { count: 'exact', head: true }),
  ]);
  const A = (activos || []) as Pedido[];
  const porCobrar = A.filter((p) => p.estado === 'reservado');
  const aEntregar = A.filter((p) => p.estado === 'pagado');
  const cobrado = (delMes || []).reduce((s, p: any) => s + Number(p.total), 0);
  return (
    <>
      <div className="kpis">
        <div className="kpi"><div className="k">Por cobrar</div><div className="v">{money(porCobrar.reduce((s, p) => s + Number(p.total), 0))}</div><div className="meta">{porCobrar.length} reservas</div></div>
        <div className="kpi"><div className="k">Para entregar</div><div className="v">{aEntregar.length}</div><div className="meta">pedidos pagados</div></div>
        <div className="kpi"><div className="k">Cobrado este mes</div><div className="v">{money(cobrado)}</div><div className="meta">{delMes?.length || 0} pedidos</div></div>
        <div className="kpi"><div className="k">Clientes</div><div className="v">{totalClientes || 0}</div><div className="meta">{nuevos?.length || 0} nuevos este mes</div></div>
      </div>
      <section className="panel">
        <div className="phead"><h2>Pedidos para atender</h2><Link className="btn sm" href="/admin/pedidos">Ver todos</Link></div>
        {!A.length ? <p className="note">No hay pedidos pendientes. Cuando alguien compre o reserve, aparece acá.</p> : (
          <div className="tbl"><table><thead><tr><th>#</th><th>Fecha</th><th>Cliente</th><th>Pago</th><th className="num">Total</th><th>Estado</th></tr></thead><tbody>
            {A.slice(0, 12).map((p) => (
              <tr key={p.id}><td className="meta">{p.numero}</td><td className="meta">{fecha(p.creado, true)}</td><td><strong>{p.cliente_nombre}</strong></td>
                <td className="meta">{METODOS[p.metodo]}</td><td className="num">{money(p.total)}</td><td><span className={`pill ${ESTADOS[p.estado].tono}`}>{ESTADOS[p.estado].label}</span></td></tr>
            ))}
          </tbody></table></div>
        )}
      </section>
      <section className="panel">
        <h2>Cumpleaños de este mes</h2>
        {!(cumples || []).length ? <p className="note">Nadie cumple años este mes (o todavía no cargaron su fecha).</p> : (
          <div className="tbl"><table><tbody>
            {(cumples as Cliente[]).map((c) => (
              <tr key={c.id}><td><strong>{c.nombre}</strong></td><td className="meta">{cumpleTexto(c.cumple)}</td>
                <td>{c.telefono && <a className="btn sm wa" target="_blank" rel="noopener" href={waLink(telNorm(c.telefono), `¡Feliz cumpleaños ${c.nombre.split(' ')[0]}! 🎉`)}>Saludar</a>}</td></tr>
            ))}
          </tbody></table></div>
        )}
      </section>
    </>
  );
}

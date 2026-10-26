import Link from 'next/link';
import { db } from '@/lib/db';
import { money, fecha, METODOS, ESTADOS, waLink, telNorm } from '@/lib/format';
import { crearPedidoManual, borrarPedido } from '@/app/admin/actions';
import EstadoSelect from '@/components/admin/EstadoSelect';
import Confirmar from '@/components/admin/Confirmar';
import type { Pedido } from '@/lib/types';

const FILTROS: [string, string][] = [['activos', 'Activos'], ['todos', 'Todos'], ['entregado', 'Entregados'], ['cancelado', 'Cancelados']];

export default async function Pedidos({ searchParams }: { searchParams: { f?: string; q?: string } }) {
  const f = searchParams.f || 'activos';
  const q = (searchParams.q || '').trim();
  let query = db().from('pedidos').select('*').order('creado', { ascending: false }).limit(300);
  if (f === 'activos') query = query.in('estado', ['pendiente_pago', 'reservado', 'pagado']);
  else if (f !== 'todos') query = query.eq('estado', f);
  if (q) query = query.or(`cliente_nombre.ilike.%${q.replace(/[%,()]/g, '')}%,cliente_telefono.ilike.%${q.replace(/[%,()]/g, '')}%`);
  const [{ data }, { data: prods }] = await Promise.all([query, db().from('productos').select('id,nombre,precio').order('nombre')]);
  const P = (data || []) as Pedido[];

  return (
    <>
      <details className="panel">
        <summary style={{ cursor: 'pointer', fontFamily: 'var(--display)', fontSize: 20, fontWeight: 800 }}>+ Cargar pedido a mano</summary>
        <p className="note">Para ventas por WhatsApp, en el local o por teléfono. El cliente queda registrado automáticamente.</p>
        <form action={crearPedidoManual} className="fgrid" style={{ marginTop: 12 }}>
          <label className="f"><span>Cliente</span><input className="inp" id="o_cli" name="cliente" required /></label>
          <label className="f"><span>Teléfono</span><input className="inp" id="o_tel" name="telefono" inputMode="tel" /></label>
          <label className="f"><span>Producto</span><select className="inp" id="o_prod" name="producto" defaultValue=""><option value="">Otro / varios (completá detalle y total)</option>
            {(prods || []).map((p: any) => <option key={p.id} value={p.id}>{p.nombre} · {money(p.precio)}</option>)}</select></label>
          <label className="f"><span>Cantidad</span><input className="inp" id="o_qty" name="cantidad" type="number" min="1" defaultValue={1} /></label>
          <label className="f"><span>Detalle (si es otro)</span><input className="inp" id="o_det" name="detalle" /></label>
          <label className="f"><span>Total (vacío = precio × cantidad)</span><input className="inp" id="o_tot" name="total" type="number" min="0" /></label>
          <label className="f"><span>Forma de pago</span><select className="inp" id="o_met" name="metodo">{Object.entries(METODOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          <label className="f"><span>Estado</span><select className="inp" id="o_est" name="estado" defaultValue="reservado">{Object.entries(ESTADOS).filter(([k]) => k !== 'pendiente_pago').map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></label>
          <label className="f full"><span>Nota</span><input className="inp" id="o_nota" name="nota" /></label>
          <div className="full"><button className="btn pri">Agregar pedido</button></div>
        </form>
      </details>

      <section className="panel">
        <div className="phead">
          <h2>Pedidos</h2>
          <div className="row">
            {FILTROS.map(([k, l]) => <Link key={k} href={`/admin/pedidos?f=${k}${q ? `&q=${encodeURIComponent(q)}` : ''}`} className={`chip${f === k ? ' on' : ''}`}>{l}</Link>)}
            <form><input type="hidden" name="f" value={f} /><input className="search" style={{ marginLeft: 0 }} name="q" defaultValue={q} placeholder="Buscar cliente o teléfono" aria-label="Buscar" /></form>
          </div>
        </div>
        {!P.length ? <div className="empty"><h3>No hay pedidos acá</h3><p>Las compras y reservas de la tienda aparecen solas. También podés cargarlos a mano.</p></div> : (
          <div className="tbl"><table>
            <thead><tr><th>#</th><th>Fecha</th><th>Cliente</th><th>Detalle</th><th>Pago</th><th className="num">Total</th><th>Estado</th><th></th></tr></thead>
            <tbody>{P.map((p) => (
              <tr key={p.id}>
                <td className="meta">{p.numero}</td>
                <td className="meta">{fecha(p.creado, true)}</td>
                <td><strong>{p.cliente_nombre}</strong>{p.cliente_telefono && <div className="meta">{p.cliente_telefono}</div>}</td>
                <td>{p.items.map((i, k) => <div key={k}>{i.cantidad} × {i.nombre}</div>)}{p.nota && <div className="meta">{p.nota}</div>}</td>
                <td className="meta">{METODOS[p.metodo]}{p.mp_payment_id && <div>Pago {p.mp_payment_id}</div>}</td>
                <td className="num">{money(p.total)}</td>
                <td><EstadoSelect key={p.estado} id={p.id} estado={p.estado} /></td>
                <td><div className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>
                  {p.cliente_telefono && <a className="btn sm wa" target="_blank" rel="noopener" href={waLink(telNorm(p.cliente_telefono), `Hola ${p.cliente_nombre.split(' ')[0]}! Te escribo por tu pedido #${p.numero}.`)}>WhatsApp</a>}
                  <Confirmar accion={borrarPedido.bind(null, p.id)} />
                </div></td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </section>
    </>
  );
}

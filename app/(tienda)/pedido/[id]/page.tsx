import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { db, getConfig } from '@/lib/db';
import { aplicarPago } from '@/lib/mp';
import { money, waLink, ESTADOS, METODOS } from '@/lib/format';
import { IconWA, IconCard } from '@/components/icons';
import CopyButton from '@/components/CopyButton';
import type { Pedido } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Tu pedido', robots: { index: false } };

export default async function PedidoPage({ params, searchParams }: { params: { id: string }; searchParams: Record<string, string> }) {
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) notFound();
  const { data } = await db().from('pedidos').select('*').eq('id', params.id).maybeSingle();
  if (!data) notFound();
  let p = data as Pedido;

  // Volviendo de Mercado Pago: confirmamos el pago contra la API (por si la notificación todavía no llegó)
  const payId = searchParams.payment_id || searchParams.collection_id;
  if (p.metodo === 'mercadopago' && p.estado === 'pendiente_pago' && payId && /^\d+$/.test(payId)) {
    try { p = (await aplicarPago(payId)) || p; } catch (e) { console.error(e); }
  }
  const cfg = await getConfig();
  const est = ESTADOS[p.estado];
  const detalle = p.items.map((i) => `• ${i.cantidad} x ${i.nombre}`).join('\n');
  const msg = `Hola! Soy ${p.cliente_nombre}. Te escribo por mi pedido #${p.numero} (${METODOS[p.metodo]}):\n${detalle}\nTotal: ${money(p.total)}`;
  const wa = waLink(cfg.whatsapp, msg);
  const fallo = searchParams.status === 'rejected' || searchParams.status === 'failure' || searchParams.collection_status === 'rejected';

  return (
    <main className="wrap narrow stack" style={{ gap: 18 }}>
      <div>
        <span className="cat">Pedido #{p.numero}</span>
        <h1 style={{ fontSize: 34 }}>
          {p.estado === 'pagado' ? '¡Gracias! Tu pago está aprobado' :
           p.estado === 'reservado' ? '¡Listo! Tu reserva está hecha' :
           p.estado === 'pendiente_pago' ? (fallo ? 'El pago no se completó' : 'Estamos esperando tu pago') :
           p.estado === 'entregado' ? 'Pedido entregado' : 'Pedido cancelado'}
        </h1>
      </div>
      <div><span className={`pill ${est.tono}`}>{est.label}</span> <span className="meta">· {METODOS[p.metodo]}</span></div>

      <section className="panel" style={{ marginBottom: 0 }}>
        <div className="lines">
          {p.items.map((i, k) => (
            <div key={k} className="row" style={{ justifyContent: 'space-between', padding: '6px 0' }}>
              <span>{i.cantidad} × {i.nombre}</span><span style={{ fontVariantNumeric: 'tabular-nums' }}>{money(i.precio * i.cantidad)}</span>
            </div>
          ))}
        </div>
        <div className="tot"><span>Total</span><strong>{money(p.total)}</strong></div>
      </section>

      {p.estado === 'pendiente_pago' && p.mp_init_point && (
        <a className="btn mp block" href={p.mp_init_point}><IconCard />{fallo ? 'Intentar el pago de nuevo' : 'Ir a pagar con Mercado Pago'}</a>
      )}
      {p.estado === 'pendiente_pago' && !fallo && payId && <p className="note">Si ya pagaste, puede tardar unos minutos en confirmarse. Recargá esta página en un rato.</p>}

      {p.metodo === 'transferencia' && p.estado === 'reservado' && (cfg.alias || cfg.cbu) && (
        <section className="box stack">
          <strong>Transferí {money(p.total)} a:</strong>
          {cfg.alias && <div className="copy"><span>Alias <code>{cfg.alias}</code></span><CopyButton text={cfg.alias} /></div>}
          {cfg.cbu && <div className="copy"><span>CBU/CVU <code>{cfg.cbu}</code></span><CopyButton text={cfg.cbu} /></div>}
          {cfg.titular && <span className="note">Titular: {cfg.titular}</span>}
          <span className="note">Después mandanos el comprobante por WhatsApp con el número de pedido #{p.numero}.</span>
        </section>
      )}
      {p.metodo === 'efectivo' && p.estado === 'reservado' && (
        <p>Pagás en efectivo al retirar{cfg.retiro ? <> en <strong>{cfg.retiro}</strong></> : ''}{cfg.horario ? ` (${cfg.horario})` : ''}. Te escribimos para coordinar.</p>
      )}

      {wa && <a className="btn wa block" href={wa} target="_blank" rel="noopener"><IconWA />{p.metodo === 'transferencia' ? 'Enviar comprobante por WhatsApp' : 'Avisar por WhatsApp'}</a>}
      <p className="note">Guardá este link para ver el estado de tu pedido.</p>
    </main>
  );
}

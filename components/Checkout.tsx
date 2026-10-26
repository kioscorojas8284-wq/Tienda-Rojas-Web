'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from './cart';
import { money } from '@/lib/format';
import Foto from './Foto';
import { IconCard } from './icons';

export default function Checkout({ mp, transferencia, retiro }: { mp: boolean; transferencia: boolean; retiro: string }) {
  const { lines, setQty, remove, clear, ready } = useCart();
  const router = useRouter();
  const [metodo, setMetodo] = useState(mp ? 'mercadopago' : 'efectivo');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const total = lines.reduce((s, l) => s + l.precio * l.cantidad, 0);

  if (!ready) return <p className="note">Cargando…</p>;
  if (!lines.length) return <div className="empty"><h3>Tu carrito está vacío</h3><p><Link href="/">Ver productos</Link></p></div>;

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(''); setEnviando(true);
    const f = new FormData(e.currentTarget);
    try {
      const r = await fetch('/api/pedidos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: f.get('nombre'), telefono: f.get('telefono'), email: f.get('email'), nota: f.get('nota'),
          web: f.get('web'), metodo, items: lines.map((l) => ({ id: l.id, cantidad: l.cantidad })),
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'No pudimos crear el pedido');
      clear();
      if (d.init_point) window.location.href = d.init_point;
      else router.push(`/pedido/${d.id}`);
    } catch (err: any) {
      setError(err.message); setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="stack" style={{ gap: 20 }}>
      <section className="panel" style={{ marginBottom: 0 }}>
        <div className="lines">
          {lines.map((l) => (
            <div className="line" key={l.id}>
              <Foto src={l.imagen} alt={l.nombre} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>{l.nombre}</div>
                <div className="meta">{money(l.precio)} c/u</div>
                <div className="row" style={{ marginTop: 6 }}>
                  <div className="qty">
                    <button type="button" onClick={() => setQty(l.id, l.cantidad - 1)} aria-label="Menos">−</button>
                    <span>{l.cantidad}</span>
                    <button type="button" onClick={() => setQty(l.id, l.cantidad + 1)} aria-label="Más">+</button>
                  </div>
                  <button type="button" className="btn sm ghost danger" onClick={() => remove(l.id)}>Quitar</button>
                </div>
              </div>
              <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{money(l.precio * l.cantidad)}</strong>
            </div>
          ))}
        </div>
        <div className="tot"><span>Total</span><strong>{money(total)}</strong></div>
      </section>

      <section className="panel stack" style={{ marginBottom: 0 }}>
        <h2>Tus datos</h2>
        <div className="fgrid">
          <label className="f"><span>Nombre y apellido</span><input className="inp" id="nombre" name="nombre" required autoComplete="name" /></label>
          <label className="f"><span>WhatsApp</span><input className="inp" id="telefono" name="telefono" required inputMode="tel" autoComplete="tel" placeholder="11 2345 6789" /></label>
          <label className="f full"><span>Email (opcional)</span><input className="inp" id="email" name="email" type="email" autoComplete="email" /></label>
          <label className="f full"><span>Nota (opcional)</span><input className="inp" id="nota" name="nota" placeholder="Color, talle, día de retiro…" /></label>
          <div className="honey" aria-hidden="true"><input name="web" tabIndex={-1} autoComplete="off" /></div>
        </div>
      </section>

      <section className="panel stack" style={{ marginBottom: 0 }}>
        <h2>¿Cómo querés pagar?</h2>
        <div className="seg">
          {mp && <label><input type="radio" name="metodo" checked={metodo === 'mercadopago'} onChange={() => setMetodo('mercadopago')} />Mercado Pago<small>Tarjeta, dinero en cuenta o cuotas</small></label>}
          <label><input type="radio" name="metodo" checked={metodo === 'efectivo'} onChange={() => setMetodo('efectivo')} />Efectivo<small>Reservás y pagás al retirar</small></label>
          {transferencia && <label><input type="radio" name="metodo" checked={metodo === 'transferencia'} onChange={() => setMetodo('transferencia')} />Transferencia<small>Te mostramos el alias al confirmar</small></label>}
        </div>
        {metodo === 'efectivo' && retiro && <p className="note">Retiro y pago en: {retiro}</p>}
        {error && <div className="alert err">{error}</div>}
        <button className={`btn block ${metodo === 'mercadopago' ? 'mp' : 'pri'}`} type="submit" disabled={enviando}>
          {metodo === 'mercadopago' && <IconCard />}
          {enviando ? 'Procesando…' : metodo === 'mercadopago' ? `Pagar ${money(total)} con Mercado Pago` : `Confirmar reserva · ${money(total)}`}
        </button>
      </section>
    </form>
  );
}

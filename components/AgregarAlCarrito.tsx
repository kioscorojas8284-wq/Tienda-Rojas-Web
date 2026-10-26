'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from './cart';

type P = { id: string; nombre: string; precio: number; imagen?: string; stock: number | null };

export default function AgregarAlCarrito({ producto }: { producto: P }) {
  const { add } = useCart();
  const router = useRouter();
  const [q, setQ] = useState(1);
  const [ok, setOk] = useState(false);
  const max = producto.stock == null ? 99 : producto.stock;
  const agregar = () => { add({ ...producto, cantidad: q }); setOk(true); };
  return (
    <div className="stack">
      <div className="row">
        <div className="qty">
          <button onClick={() => setQ(Math.max(1, q - 1))} aria-label="Menos">−</button>
          <span>{q}</span>
          <button onClick={() => setQ(Math.min(max, q + 1))} aria-label="Más">+</button>
        </div>
        {producto.stock != null && <span className="note">{producto.stock} disponibles</span>}
      </div>
      <button className="btn pri block" onClick={() => { add({ ...producto, cantidad: q }); router.push('/carrito'); }}>Comprar ahora</button>
      <button className="btn block" onClick={agregar}>Agregar al carrito</button>
      {ok && <div className="alert ok">Agregado al carrito. <a href="/carrito">Ver carrito</a></div>}
    </div>
  );
}

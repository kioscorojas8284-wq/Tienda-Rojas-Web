'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { Producto } from '@/lib/types';
import { money } from '@/lib/format';
import Foto from './Foto';

export default function Catalogo({ productos }: { productos: Producto[] }) {
  const [cat, setCat] = useState('Todos');
  const [q, setQ] = useState('');
  const cats = useMemo(() => ['Todos', ...Array.from(new Set(productos.map((p) => p.categoria.trim()).filter(Boolean)))], [productos]);
  const lista = productos.filter((p) =>
    (cat === 'Todos' || p.categoria.trim() === cat) &&
    (!q || `${p.nombre} ${p.descripcion}`.toLowerCase().includes(q.toLowerCase())));

  if (!productos.length) return <div className="empty"><h3>Todavía no hay productos publicados</h3><p>Volvé pronto o escribinos por WhatsApp.</p></div>;
  return (
    <>
      <div className="tools">
        {cats.length > 2 && cats.map((c) => <button key={c} className={`chip${cat === c ? ' on' : ''}`} onClick={() => setCat(c)}>{c}</button>)}
        <input id="buscar" className="search" type="search" placeholder="Buscar productos" aria-label="Buscar productos" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {!lista.length ? (
        <div className="empty"><h3>No encontramos productos</h3><p>Probá con otra búsqueda o categoría.</p></div>
      ) : (
        <div className="grid">
          {lista.map((p) => {
            const agotado = p.stock !== null && p.stock <= 0;
            return (
              <Link key={p.id} href={`/producto/${p.id}`} className="card">
                <Foto src={p.imagenes[0]} alt={p.nombre}>
                  {agotado ? <span className="badge out">Agotado</span> : p.stock !== null && p.stock <= 3 ? <span className="badge">Últimas {p.stock}</span> : null}
                </Foto>
                <div className="cbody">
                  {p.categoria && <span className="cat">{p.categoria}</span>}
                  <span className="cname">{p.nombre}</span>
                  <span className="price">{money(p.precio)}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}

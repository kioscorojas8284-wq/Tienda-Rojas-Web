'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import Link from 'next/link';

export type CartLine = { id: string; nombre: string; precio: number; imagen?: string; cantidad: number; stock: number | null };
type Ctx = {
  lines: CartLine[];
  add: (l: CartLine) => void;
  setQty: (id: string, q: number) => void;
  remove: (id: string) => void;
  clear: () => void;
  ready: boolean;
};
const CartCtx = createContext<Ctx | null>(null);
const KEY = 'tienda-carrito-v1';

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try { const s = localStorage.getItem(KEY); if (s) setLines(JSON.parse(s)); } catch {}
    setReady(true);
  }, []);
  useEffect(() => { if (ready) try { localStorage.setItem(KEY, JSON.stringify(lines)); } catch {} }, [lines, ready]);
  const cap = (l: CartLine, q: number) => Math.max(1, l.stock == null ? Math.min(q, 99) : Math.min(q, l.stock));
  const value: Ctx = {
    lines, ready,
    add: (l) => setLines((ls) => {
      const ex = ls.find((x) => x.id === l.id);
      if (ex) return ls.map((x) => (x.id === l.id ? { ...x, ...l, cantidad: cap(l, x.cantidad + l.cantidad) } : x));
      return [...ls, { ...l, cantidad: cap(l, l.cantidad) }];
    }),
    setQty: (id, q) => setLines((ls) => ls.map((x) => (x.id === id ? { ...x, cantidad: cap(x, q) } : x))),
    remove: (id) => setLines((ls) => ls.filter((x) => x.id !== id)),
    clear: () => setLines([]),
  };
  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}

export function useCart() {
  const c = useContext(CartCtx);
  if (!c) throw new Error('useCart fuera de CartProvider');
  return c;
}

export function CartLink() {
  const { lines } = useCart();
  const n = lines.reduce((s, l) => s + l.cantidad, 0);
  return (
    <Link className="navlink" href="/carrito">
      Carrito{n > 0 && <span className="count">{n}</span>}
    </Link>
  );
}

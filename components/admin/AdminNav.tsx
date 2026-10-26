'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [['/admin', 'Inicio'], ['/admin/pedidos', 'Pedidos'], ['/admin/productos', 'Productos'], ['/admin/clientes', 'Clientes'], ['/admin/ajustes', 'Ajustes']];

export default function AdminNav() {
  const path = usePathname();
  const on = (h: string) => (h === '/admin' ? path === '/admin' : path.startsWith(h));
  return (
    <div className="adminbar">
      <div className="wrap">
        <span className="lbl">Panel</span>
        {TABS.map(([h, l]) => <Link key={h} href={h} className={`tab${on(h) ? ' on' : ''}`}>{l}</Link>)}
        <span className="sp" />
        <a className="tab" href="/" target="_blank" rel="noopener">Ver tienda ↗</a>
        <form action="/admin/salir" method="post"><button className="tab">Salir</button></form>
      </div>
    </div>
  );
}

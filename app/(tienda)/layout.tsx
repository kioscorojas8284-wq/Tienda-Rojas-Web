import Link from 'next/link';
import { getConfig } from '@/lib/db';
import { waLink, telNorm } from '@/lib/format';
import { CartLink } from '@/components/cart';
import Marca from '@/components/Marca';
import { IconWA } from '@/components/icons';

export const dynamic = 'force-dynamic';

export default async function TiendaLayout({ children }: { children: React.ReactNode }) {
  const cfg = await getConfig();
  const wa = waLink(cfg.whatsapp, 'Hola! Tengo una consulta.');
  return (
    <>
      <header className="top">
        <div className="wrap">
          <Link href="/" className="brand"><Marca nombre={cfg.nombre} /></Link>
          <nav>
            <Link className="navlink" href="/">Productos</Link>
            <Link className="navlink" href="/registro">Registrate</Link>
            <CartLink />
          </nav>
        </div>
      </header>
      {children}
      <footer className="pie">
        <div className="wrap stack">
          <div><strong>{cfg.nombre}</strong>{cfg.retiro && <> · Retiro: {cfg.retiro}</>}{cfg.horario && <> · {cfg.horario}</>}</div>
          <div>Pagás con Mercado Pago, o reservás y pagás en efectivo o por transferencia.
            {cfg.whatsapp && <> WhatsApp: +{telNorm(cfg.whatsapp)}</>}</div>
          <div><Link href="/registro">Registrate como cliente</Link> para recibir novedades.</div>
        </div>
      </footer>
      {wa && <a className="btn wa fab" href={wa} target="_blank" rel="noopener" aria-label="Consultar por WhatsApp"><IconWA />Consultas</a>}
    </>
  );
}

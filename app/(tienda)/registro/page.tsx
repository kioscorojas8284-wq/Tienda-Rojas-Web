import type { Metadata } from 'next';
import { getConfig } from '@/lib/db';
import RegistroForm from '@/components/RegistroForm';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Registrate' };

export default async function RegistroPage() {
  const cfg = await getConfig();
  return (
    <main className="wrap narrow stack" style={{ gap: 18 }}>
      <div>
        <span className="cat">Clientes</span>
        <h1 style={{ fontSize: 34 }}>Sumate a {cfg.nombre}</h1>
        <p className="note" style={{ fontSize: 15 }}>Dejanos tus datos y te avisamos de productos nuevos, promociones y beneficios para clientes.</p>
      </div>
      <RegistroForm whatsapp={cfg.whatsapp} tienda={cfg.nombre} />
    </main>
  );
}

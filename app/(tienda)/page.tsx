import { getConfig, getProductosPublicados } from '@/lib/db';
import Catalogo from '@/components/Catalogo';
import Marca from '@/components/Marca';

export const dynamic = 'force-dynamic';

export default async function Inicio() {
  const [cfg, productos] = await Promise.all([getConfig(), getProductosPublicados()]);
  return (
    <main>
      <section className="wrap hero">
        <h1><Marca nombre={cfg.nombre} /></h1>
        {cfg.slogan && <p>{cfg.slogan}</p>}
      </section>
      <div className="wrap"><Catalogo productos={productos} /></div>
    </main>
  );
}

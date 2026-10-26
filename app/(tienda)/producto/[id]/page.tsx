import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getConfig, getProducto } from '@/lib/db';
import { money, waLink } from '@/lib/format';
import Galeria from '@/components/Galeria';
import AgregarAlCarrito from '@/components/AgregarAlCarrito';
import { IconWA } from '@/components/icons';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const p = await getProducto(params.id);
  return p ? { title: p.nombre, description: p.descripcion.slice(0, 150), openGraph: { images: p.imagenes.slice(0, 1) } } : {};
}

export default async function ProductoPage({ params }: { params: { id: string } }) {
  const [p, cfg] = await Promise.all([getProducto(params.id), getConfig()]);
  if (!p || !p.publicado) notFound();
  const agotado = p.stock !== null && p.stock <= 0;
  const wa = waLink(cfg.whatsapp, `Hola! Quería consultar por "${p.nombre}" (${money(p.precio)}).`);
  return (
    <main className="wrap prod">
      <Galeria imagenes={p.imagenes} alt={p.nombre} />
      <div className="det">
        <Link href="/" className="note">← Volver a productos</Link>
        {p.categoria && <span className="cat">{p.categoria}</span>}
        <h1>{p.nombre}</h1>
        <div className="price">{money(p.precio)}</div>
        {p.descripcion && <p className="desc">{p.descripcion}</p>}
        {agotado ? <p><span className="pill acc">Agotado</span></p> : (
          <AgregarAlCarrito producto={{ id: p.id, nombre: p.nombre, precio: p.precio, imagen: p.imagenes[0], stock: p.stock }} />
        )}
        {wa && <a className="btn wa block" href={wa} target="_blank" rel="noopener"><IconWA />Consultar por WhatsApp</a>}
      </div>
    </main>
  );
}

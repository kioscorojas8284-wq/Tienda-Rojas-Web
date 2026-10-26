import type { Metadata } from 'next';
import { getConfig } from '@/lib/db';
import { MP_ENABLED } from '@/lib/env';
import Checkout from '@/components/Checkout';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Carrito' };

export default async function CarritoPage() {
  const cfg = await getConfig();
  return (
    <main className="wrap narrow">
      <h1 style={{ fontSize: 34, marginBottom: 16 }}>Tu pedido</h1>
      <Checkout mp={MP_ENABLED} transferencia={!!(cfg.alias || cfg.cbu)} retiro={cfg.retiro} />
    </main>
  );
}

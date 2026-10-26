'use client';
import { useTransition } from 'react';
import { publicarProducto } from '@/app/admin/actions';

export default function PublicarSwitch({ id, publicado }: { id: string; publicado: boolean }) {
  const [pend, start] = useTransition();
  return (
    <label className="row" style={{ gap: 6, fontSize: 13, fontWeight: 600 }}>
      <input type="checkbox" defaultChecked={publicado} disabled={pend} style={{ accentColor: 'var(--ok)', width: 18, height: 18 }}
        onChange={(e) => { const v = e.target.checked; start(() => publicarProducto(id, v)); }} />
      {publicado ? 'Publicado' : 'Oculto'}
    </label>
  );
}

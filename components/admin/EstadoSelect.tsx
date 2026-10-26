'use client';
import { useTransition } from 'react';
import { cambiarEstado } from '@/app/admin/actions';
import { ESTADOS } from '@/lib/format';
import type { Estado } from '@/lib/types';

export default function EstadoSelect({ id, estado }: { id: string; estado: Estado }) {
  const [pend, start] = useTransition();
  return (
    <select className="st" aria-label="Estado" defaultValue={estado} disabled={pend}
      onChange={(e) => { const v = e.target.value as Estado; start(() => cambiarEstado(id, v)); }}>
      {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
    </select>
  );
}

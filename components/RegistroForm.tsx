'use client';
import { useState } from 'react';
import Link from 'next/link';
import { MESES, waLink } from '@/lib/format';
import { IconWA } from './icons';

export default function RegistroForm({ whatsapp, tienda }: { whatsapp: string; tienda: string }) {
  const [estado, setEstado] = useState<'form' | 'enviando' | 'ok'>('form');
  const [error, setError] = useState('');
  const [nombre, setNombre] = useState('');

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(''); setEstado('enviando');
    const f = Object.fromEntries(new FormData(e.currentTarget).entries());
    try {
      const r = await fetch('/api/registro', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'No pudimos registrarte');
      setNombre(String(f.nombre || '')); setEstado('ok'); window.scrollTo(0, 0);
    } catch (err: any) { setError(err.message); setEstado('form'); }
  }

  if (estado === 'ok') {
    const wa = waLink(whatsapp, `Hola! Soy ${nombre}, me acabo de registrar en ${tienda}.`);
    return (
      <section className="panel stack">
        <div className="alert ok">¡Listo, {nombre.split(' ')[0]}! Ya estás registrado/a.</div>
        <p>Agendanos para recibir las novedades por WhatsApp.</p>
        {wa && <a className="btn wa block" href={wa} target="_blank" rel="noopener"><IconWA />Escribirnos por WhatsApp</a>}
        <Link className="btn block" href="/">Ver productos</Link>
      </section>
    );
  }
  return (
    <form className="panel fgrid" onSubmit={enviar}>
      <label className="f full"><span>Nombre y apellido *</span><input className="inp" id="r_nombre" name="nombre" required autoComplete="name" /></label>
      <label className="f"><span>WhatsApp *</span><input className="inp" id="r_tel" name="telefono" required inputMode="tel" autoComplete="tel" placeholder="11 2345 6789" /></label>
      <label className="f"><span>Email</span><input className="inp" id="r_email" name="email" type="email" autoComplete="email" /></label>
      <label className="f full"><span>Dirección o barrio</span><input className="inp" id="r_dir" name="direccion" autoComplete="street-address" /></label>
      <div className="f"><span>Cumpleaños</span>
        <div className="row" style={{ flexWrap: 'nowrap' }}>
          <select className="inp" id="r_dia" name="dia" defaultValue="" aria-label="Día"><option value="">Día</option>{Array.from({ length: 31 }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}</select>
          <select className="inp" id="r_mes" name="mes" defaultValue="" aria-label="Mes"><option value="">Mes</option>{MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select>
        </div>
      </div>
      <label className="f"><span>¿Cómo nos conociste?</span>
        <select className="inp" id="r_como" name="como" defaultValue=""><option value="">Elegí una opción</option>
          {['Instagram', 'Facebook', 'TikTok', 'Recomendación', 'Pasé por el local', 'Feria / evento', 'Otro'].map((o) => <option key={o}>{o}</option>)}
        </select></label>
      <label className="row full" style={{ gap: 8, fontWeight: 500 }}><input type="checkbox" id="r_nov" name="novedades" defaultChecked style={{ accentColor: 'var(--accent)' }} />Quiero recibir novedades y promociones por WhatsApp</label>
      <div className="honey" aria-hidden="true"><input name="web" tabIndex={-1} autoComplete="off" /></div>
      {error && <div className="alert err full">{error}</div>}
      <div className="full"><button className="btn pri block" type="submit" disabled={estado === 'enviando'}>{estado === 'enviando' ? 'Registrando…' : 'Registrarme'}</button></div>
      <p className="note full">Usamos tus datos solo para atenderte y avisarte novedades de la tienda. Podés pedir la baja cuando quieras.</p>
    </form>
  );
}

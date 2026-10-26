'use client';
import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export default function Login() {
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  async function entrar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(''); setCargando(true);
    const f = new FormData(e.currentTarget);
    const sb = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { error } = await sb.auth.signInWithPassword({ email: String(f.get('email')), password: String(f.get('password')) });
    if (error) { setError('Email o contraseña incorrectos.'); setCargando(false); return; }
    window.location.href = '/admin';
  }
  return (
    <main className="wrap narrow" style={{ maxWidth: 420, paddingTop: 80 }}>
      <form className="panel stack" onSubmit={entrar}>
        <h1 style={{ fontSize: 28 }}>Panel de la tienda</h1>
        <label className="f"><span>Email</span><input className="inp" id="email" name="email" type="email" required autoComplete="email" /></label>
        <label className="f"><span>Contraseña</span><input className="inp" id="password" name="password" type="password" required autoComplete="current-password" /></label>
        {error && <div className="alert err">{error}</div>}
        <button className="btn pri block" disabled={cargando}>{cargando ? 'Entrando…' : 'Entrar'}</button>
        <a className="note" href="/">← Ir a la tienda</a>
      </form>
    </main>
  );
}

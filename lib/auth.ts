import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';

export function authClient() {
  const store = cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() { return store.getAll(); },
      setAll(list) {
        try { list.forEach(({ name, value, options }) => store.set(name, value, options)); } catch { /* server component */ }
      },
    },
  });
}

export function esAdmin(email?: string | null) {
  const lista = (process.env.ADMIN_EMAILS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  return !!email && lista.includes(email.toLowerCase());
}

/** Devuelve el usuario admin o null (para rutas API). */
export async function getAdmin() {
  const { data } = await authClient().auth.getUser();
  return data.user && esAdmin(data.user.email) ? data.user : null;
}

/** Para páginas y acciones del panel: si no es admin, lo manda al login. */
export async function requireAdmin() {
  const u = await getAdmin();
  if (!u) redirect('/admin/login');
  return u;
}

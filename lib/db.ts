import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Config, Producto } from './types';

let client: SupabaseClient | null = null;

/** Cliente con la clave secreta. Solo se usa en el servidor. */
export function db(): SupabaseClient {
  if (typeof window !== 'undefined') throw new Error('db() solo en el servidor');
  if (!client) {
    client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

const CONFIG_VACIA: Config = {
  nombre: 'Tienda Rojas 8284', slogan: '', whatsapp: '', alias: '', cbu: '', titular: '', retiro: '', horario: '',
};

export async function getConfig(): Promise<Config> {
  const { data } = await db().from('config').select('*').eq('id', 1).maybeSingle();
  return { ...CONFIG_VACIA, ...(data || {}) };
}

export async function getProductosPublicados(): Promise<Producto[]> {
  const { data, error } = await db().from('productos').select('*').eq('publicado', true)
    .order('orden', { ascending: true }).order('creado', { ascending: false });
  if (error) throw error;
  return (data || []).map(normProducto);
}

export async function getProducto(id: string): Promise<Producto | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await db().from('productos').select('*').eq('id', id).maybeSingle();
  return data ? normProducto(data) : null;
}

export function normProducto(p: any): Producto {
  return { ...p, precio: Number(p.precio), imagenes: p.imagenes || [] };
}

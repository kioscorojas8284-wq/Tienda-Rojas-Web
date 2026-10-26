import { db } from './db';
import { telNorm } from './format';

/** Busca al cliente por teléfono; si no existe lo crea. Completa datos vacíos sin pisar los existentes. */
export async function upsertCliente(d: { nombre: string; telefono: string; email?: string; origen: 'registro' | 'compra' | 'manual' }) {
  const norm = telNorm(d.telefono) || null;
  if (norm) {
    const { data: ex } = await db().from('clientes').select('*').eq('telefono_norm', norm).maybeSingle();
    if (ex) {
      const upd: any = {};
      if (!ex.email && d.email) upd.email = d.email;
      if (!ex.nombre && d.nombre) upd.nombre = d.nombre;
      if (Object.keys(upd).length) await db().from('clientes').update(upd).eq('id', ex.id);
      return ex.id as string;
    }
  }
  const { data, error } = await db().from('clientes')
    .insert({ nombre: d.nombre, telefono: d.telefono, telefono_norm: norm, email: d.email || '', origen: d.origen })
    .select('id').single();
  if (error) throw error;
  return data.id as string;
}

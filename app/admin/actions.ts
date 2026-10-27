'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { telNorm } from '@/lib/format';
import { descontarStock, reponerStock } from '@/lib/stock';
import { upsertCliente } from '@/lib/clientes';
import type { Estado, Pedido } from '@/lib/types';
import { normalizar, leerPrecio, type Columna, type FilaProducto } from '@/lib/importar';

const s = (f: FormData, k: string, max = 500) => String(f.get(k) ?? '').trim().slice(0, max);

/* ---------- productos ---------- */
export async function guardarProducto(f: FormData) {
  await requireAdmin();
  const id = s(f, 'id', 40);
  const stockTxt = s(f, 'stock', 10);
  let imagenes: string[] = [];
  try { imagenes = JSON.parse(String(f.get('imagenes') || '[]')).filter((x: unknown) => typeof x === 'string').slice(0, 12); } catch {}
  const datos = {
    nombre: s(f, 'nombre', 160) || 'Sin nombre',
    descripcion: s(f, 'descripcion', 4000),
    categoria: s(f, 'categoria', 60),
    precio: Math.max(0, Math.round(Number(f.get('precio')) || 0)),
    stock: stockTxt === '' ? null : Math.max(0, Math.floor(Number(stockTxt) || 0)),
    publicado: f.get('publicado') === 'on',
    orden: Math.floor(Number(f.get('orden')) || 0),
    imagenes,
  };
  const r = id && id !== 'nuevo'
    ? await db().from('productos').update(datos).eq('id', id)
    : await db().from('productos').insert(datos);
  if (r.error) throw new Error(r.error.message);
  revalidatePath('/', 'layout');
  redirect('/admin/productos?ok=1');
}

export async function publicarProducto(id: string, publicado: boolean) {
  await requireAdmin();
  await db().from('productos').update({ publicado }).eq('id', id);
  revalidatePath('/', 'layout');
}

export async function borrarProducto(id: string) {
  await requireAdmin();
  const { data } = await db().from('productos').select('imagenes').eq('id', id).maybeSingle();
  await db().from('productos').delete().eq('id', id);
  const paths = (data?.imagenes || []).map((u: string) => u.split('/storage/v1/object/public/productos/')[1]).filter(Boolean);
  if (paths.length) await db().storage.from('productos').remove(paths);
  revalidatePath('/', 'layout');
}

/* ---------- pedidos ---------- */
export async function cambiarEstado(id: string, estado: Estado) {
  await requireAdmin();
  const { data } = await db().from('pedidos').select('*').eq('id', id).maybeSingle();
  if (!data) return;
  const p = data as Pedido;
  await db().from('pedidos').update({ estado }).eq('id', id);
  if (estado === 'cancelado') await reponerStock(p);
  else if (['reservado', 'pagado', 'entregado'].includes(estado)) await descontarStock(p);
  revalidatePath('/admin', 'layout');
}

export async function crearPedidoManual(f: FormData) {
  await requireAdmin();
  const nombre = s(f, 'cliente', 120);
  const telefono = s(f, 'telefono', 40);
  if (!nombre) return;
  const prodId = s(f, 'producto', 40);
  const cant = Math.max(1, Math.floor(Number(f.get('cantidad')) || 1));
  let items = [{ producto_id: null as string | null, nombre: s(f, 'detalle', 200) || 'Pedido', precio: 0, cantidad: 1 }];
  let total = Math.max(0, Math.round(Number(f.get('total')) || 0));
  if (prodId) {
    const { data: p } = await db().from('productos').select('id,nombre,precio').eq('id', prodId).maybeSingle();
    if (p) {
      items = [{ producto_id: p.id, nombre: p.nombre, precio: Number(p.precio), cantidad: cant }];
      if (!total) total = Number(p.precio) * cant;
    }
  }
  if (!prodId) items[0].precio = total;
  const cliente_id = await upsertCliente({ nombre, telefono, origen: 'manual' });
  const estado = s(f, 'estado', 20) as Estado;
  const { data } = await db().from('pedidos').insert({
    cliente_id, cliente_nombre: nombre, cliente_telefono: telefono, items, total,
    metodo: s(f, 'metodo', 20), estado, nota: s(f, 'nota'), origen: 'manual',
  }).select('*').single();
  if (data && estado !== 'cancelado') await descontarStock(data as Pedido);
  revalidatePath('/admin', 'layout');
}

export async function borrarPedido(id: string) {
  await requireAdmin();
  const { data } = await db().from('pedidos').select('*').eq('id', id).maybeSingle();
  if (data) await reponerStock(data as Pedido);
  await db().from('pedidos').delete().eq('id', id);
  revalidatePath('/admin', 'layout');
}

/* ---------- clientes ---------- */
export async function guardarCliente(f: FormData) {
  await requireAdmin();
  const id = s(f, 'id', 40);
  const telefono = s(f, 'telefono', 40);
  const dia = Number(f.get('dia')), mes = Number(f.get('mes'));
  const datos = {
    nombre: s(f, 'nombre', 120) || 'Sin nombre', telefono, telefono_norm: telNorm(telefono) || null,
    email: s(f, 'email', 160), direccion: s(f, 'direccion', 200), notas: s(f, 'notas', 1000),
    cumple: dia && mes ? `${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}` : '',
    acepta_novedades: f.get('novedades') === 'on',
  };
  const r = id
    ? await db().from('clientes').update(datos).eq('id', id)
    : await db().from('clientes').insert({ ...datos, origen: 'manual' });
  if (r.error) {
    if (r.error.code === '23505') redirect('/admin/clientes?error=telefono');
    throw new Error(r.error.message);
  }
  revalidatePath('/admin/clientes');
  redirect('/admin/clientes?ok=1');
}

export async function borrarCliente(id: string) {
  await requireAdmin();
  await db().from('clientes').delete().eq('id', id);
  revalidatePath('/admin/clientes');
}

/* ---------- ajustes ---------- */
export async function guardarConfig(f: FormData) {
  await requireAdmin();
  await db().from('config').update({
    nombre: s(f, 'nombre', 80) || 'Mi tienda', slogan: s(f, 'slogan', 200), whatsapp: telNorm(s(f, 'whatsapp', 40)),
    alias: s(f, 'alias', 60), cbu: s(f, 'cbu', 40).replace(/\D/g, ''), titular: s(f, 'titular', 120),
    retiro: s(f, 'retiro', 200), horario: s(f, 'horario', 120), actualizado: new Date().toISOString(),
  }).eq('id', 1);
  revalidatePath('/', 'layout');
  redirect('/admin/ajustes?ok=1');
}

/* ---------- carga masiva ---------- */

export async function importarProductos(filas: FilaProducto[], columnas: Columna[], actualizar: boolean) {
  await requireAdmin();
  if (!Array.isArray(filas) || filas.length > 2000) return { ok: false, error: 'Se pueden importar hasta 2000 productos por vez.' };
  const tiene = (c: Columna) => columnas.includes(c);
  const { data: existentes } = await db().from('productos').select('id,nombre,imagenes');
  const porNombre = new Map((existentes || []).map((p: any) => [normalizar(p.nombre), p]));

  const nuevos: any[] = [];
  let actualizados = 0, salteados = 0;
  for (const f of filas) {
    // se vuelve a validar en el servidor
    const nombre = String(f.nombre || '').trim().slice(0, 160);
    const precio = leerPrecio(f.precio);
    if (!nombre || precio === null) { salteados++; continue; }
    const datos: any = { nombre, precio };
    if (tiene('categoria')) datos.categoria = String(f.categoria || '').slice(0, 60);
    if (tiene('descripcion')) datos.descripcion = String(f.descripcion || '').slice(0, 4000);
    if (tiene('stock')) datos.stock = f.stock == null ? null : Math.max(0, Math.floor(Number(f.stock)) || 0);
    if (tiene('orden')) datos.orden = Math.floor(Number(f.orden) || 0);
    if (tiene('publicado') && typeof f.publicado === 'boolean') datos.publicado = f.publicado;
    const foto = typeof f.foto === 'string' && /^https:\/\/\S+$/i.test(f.foto) ? f.foto : '';

    const ex = porNombre.get(normalizar(nombre));
    if (ex) {
      if (!actualizar) { salteados++; continue; }
      if (foto && !(ex.imagenes || []).includes(foto)) datos.imagenes = [...(ex.imagenes || []), foto];
      const { error } = await db().from('productos').update(datos).eq('id', ex.id);
      if (error) return { ok: false, error: `Error en "${nombre}": ${error.message}` };
      actualizados++;
    } else {
      nuevos.push({ publicado: true, ...datos, imagenes: foto ? [foto] : [] });
      porNombre.set(normalizar(nombre), { id: '', nombre, imagenes: [] });
    }
  }
  for (let i = 0; i < nuevos.length; i += 200) {
    const { error } = await db().from('productos').insert(nuevos.slice(i, i + 200));
    if (error) return { ok: false, error: `Se cargaron ${i} productos nuevos y después falló: ${error.message}` };
  }
  revalidatePath('/', 'layout');
  return { ok: true, creados: nuevos.length, actualizados, salteados };
}

export async function agregarFotos(productoId: string, urls: string[]) {
  await requireAdmin();
  const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/productos/`;
  const validas = (urls || []).filter((u) => typeof u === 'string' && u.startsWith(base)).slice(0, 12);
  const { data } = await db().from('productos').select('imagenes').eq('id', productoId).maybeSingle();
  if (!data) return { ok: false };
  const imagenes = [...(data.imagenes || []), ...validas.filter((u) => !(data.imagenes || []).includes(u))].slice(0, 12);
  await db().from('productos').update({ imagenes }).eq('id', productoId);
  revalidatePath('/', 'layout');
  return { ok: true };
}

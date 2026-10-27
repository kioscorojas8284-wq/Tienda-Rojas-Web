// Lectura de planillas de productos (sirve en el navegador y en el servidor).

export type FilaProducto = {
  fila: number;              // número de fila en la planilla (para mostrar errores)
  nombre: string;
  precio: number | null;
  categoria?: string;
  descripcion?: string;
  stock?: number | null;     // null = sin control de stock
  publicado?: boolean;
  orden?: number;
  foto?: string;
  errores: string[];
};

export type Columna = 'nombre' | 'precio' | 'categoria' | 'descripcion' | 'stock' | 'publicado' | 'orden' | 'foto';

export const COLUMNAS: { key: Columna; titulo: string; ejemplo: string[]; ayuda: string }[] = [
  { key: 'nombre', titulo: 'Nombre', ejemplo: ['(Ejemplo) Taza de cerámica', '(Ejemplo) Mantel de lino 140x180'], ayuda: 'Obligatorio' },
  { key: 'precio', titulo: 'Precio', ejemplo: ['12500', '38000'], ayuda: 'Obligatorio. Solo el número, sin $' },
  { key: 'categoria', titulo: 'Categoría', ejemplo: ['Cocina', 'Textil'], ayuda: 'Opcional' },
  { key: 'descripcion', titulo: 'Descripción', ejemplo: ['Hecha a mano, 350 ml.', 'Lino natural, apto lavarropas.'], ayuda: 'Opcional' },
  { key: 'stock', titulo: 'Stock', ejemplo: ['5', ''], ayuda: 'Opcional. Vacío = sin control de stock' },
  { key: 'publicado', titulo: 'Publicado', ejemplo: ['Sí', 'No'], ayuda: 'Sí o No. Vacío = Sí' },
  { key: 'orden', titulo: 'Orden', ejemplo: ['1', '2'], ayuda: 'Opcional. Menor aparece primero' },
  { key: 'foto', titulo: 'Foto (link)', ejemplo: ['', ''], ayuda: 'Opcional. Link https a una imagen' },
];

const ALIAS: Record<string, Columna> = {
  nombre: 'nombre', producto: 'nombre', articulo: 'nombre', titulo: 'nombre',
  precio: 'precio', valor: 'precio', importe: 'precio', 'precio de venta': 'precio',
  categoria: 'categoria', rubro: 'categoria', tipo: 'categoria',
  descripcion: 'descripcion', detalle: 'descripcion', 'descripcion del producto': 'descripcion',
  stock: 'stock', cantidad: 'stock', existencias: 'stock',
  publicado: 'publicado', publicar: 'publicado', visible: 'publicado', activo: 'publicado',
  orden: 'orden', posicion: 'orden',
  foto: 'foto', imagen: 'foto', 'foto (link)': 'foto', 'link foto': 'foto', 'url foto': 'foto', 'url imagen': 'foto',
};

/** Pasa a minúsculas, saca acentos y signos: "Taza de Cerámica!" -> "taza de ceramica". */
export function normalizar(s: unknown): string {
  return String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ').trim();
}

/** Acepta 12500, "12.500", "$ 12.500,50", "12,5", "12500.75". */
export function leerPrecio(v: unknown): number | null {
  if (typeof v === 'number') return isFinite(v) && v >= 0 ? Math.round(v * 100) / 100 : null;
  let s = String(v ?? '').replace(/[^\d.,-]/g, '');
  if (!s || s.startsWith('-')) return null;
  const coma = s.lastIndexOf(','), punto = s.lastIndexOf('.');
  if (coma >= 0 && punto >= 0) {
    s = coma > punto ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else if (coma >= 0) {
    s = /,\d{3}$/.test(s) && s.split(',').length > 2 ? s.replace(/,/g, '') : s.replace(',', '.');
  } else if (punto >= 0 && /\.\d{3}$/.test(s)) {
    s = s.replace(/\./g, ''); // 12.500 -> 12500 (miles)
  }
  const n = Number(s);
  return isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
}

function leerEntero(v: unknown): number | null | 'error' {
  if (v === null || v === undefined || String(v).trim() === '') return null;
  const n = Number(String(v).replace(/[^\d-]/g, ''));
  return Number.isInteger(n) && n >= 0 ? n : 'error';
}

function leerSiNo(v: unknown): boolean | undefined | 'error' {
  if (typeof v === 'boolean') return v;
  const s = normalizar(v);
  if (!s) return undefined;
  if (['si', 's', 'yes', 'y', 'true', '1', 'x', 'publicado', 'visible'].includes(s)) return true;
  if (['no', 'n', 'false', '0', 'oculto'].includes(s)) return false;
  return 'error';
}

/** Recibe la planilla como filas (la primera son los títulos) y devuelve los productos y qué columnas había. */
export function interpretarPlanilla(filas: unknown[][]): { productos: FilaProducto[]; columnas: Columna[]; error?: string } {
  const idxTitulos = filas.findIndex((f) => f.some((c) => ALIAS[normalizar(c)]));
  if (idxTitulos < 0) return { productos: [], columnas: [], error: 'No encontramos los títulos de las columnas. La primera fila tiene que decir Nombre, Precio, etc. Usá la planilla modelo.' };
  const titulos = filas[idxTitulos].map((c) => ALIAS[normalizar(c)] || null);
  const columnas = Array.from(new Set(titulos.filter(Boolean))) as Columna[];
  if (!columnas.includes('nombre') || !columnas.includes('precio')) {
    return { productos: [], columnas, error: 'La planilla tiene que tener al menos las columnas Nombre y Precio.' };
  }
  const productos: FilaProducto[] = [];
  filas.slice(idxTitulos + 1).forEach((fila, i) => {
    const celda = (k: Columna) => { const j = titulos.indexOf(k); return j >= 0 ? fila[j] : undefined; };
    const texto = (k: Columna) => String(celda(k) ?? '').trim();
    if (!fila.some((c) => String(c ?? '').trim() !== '')) return; // fila vacía
    const p: FilaProducto = { fila: idxTitulos + i + 2, nombre: texto('nombre').slice(0, 160), precio: leerPrecio(celda('precio')), errores: [] };
    if (!p.nombre) p.errores.push('Falta el nombre');
    if (/^\(ejemplo\)/i.test(p.nombre)) p.errores.push('Es una fila de ejemplo: borrala de la planilla');
    if (p.precio === null) p.errores.push('Precio inválido');
    if (columnas.includes('categoria')) p.categoria = texto('categoria').slice(0, 60);
    if (columnas.includes('descripcion')) p.descripcion = texto('descripcion').slice(0, 4000);
    if (columnas.includes('stock')) { const s = leerEntero(celda('stock')); if (s === 'error') p.errores.push('Stock inválido'); else p.stock = s; }
    if (columnas.includes('orden')) { const o = leerEntero(celda('orden')); if (o === 'error') p.errores.push('Orden inválido'); else p.orden = o ?? 0; }
    if (columnas.includes('publicado')) { const b = leerSiNo(celda('publicado')); if (b === 'error') p.errores.push('Publicado tiene que ser Sí o No'); else p.publicado = b; }
    if (columnas.includes('foto')) {
      const f = texto('foto');
      if (f && !/^https:\/\/\S+$/i.test(f)) p.errores.push('El link de la foto tiene que empezar con https://');
      else if (f) p.foto = f.slice(0, 1000);
    }
    productos.push(p);
  });
  // nombres repetidos dentro de la misma planilla
  const vistos = new Map<string, number>();
  for (const p of productos) {
    const k = normalizar(p.nombre);
    if (!k) continue;
    if (vistos.has(k)) p.errores.push(`Repetido (ya está en la fila ${vistos.get(k)})`);
    else vistos.set(k, p.fila);
  }
  return { productos, columnas };
}

/** Lee un CSV exportado de Excel (separado por ; o ,) respetando comillas. */
export function leerCSV(texto: string): string[][] {
  const t = texto.replace(/^﻿/, '');
  const primera = t.split(/\r?\n/, 1)[0] || '';
  const sep = (primera.match(/;/g) || []).length >= (primera.match(/,/g) || []).length ? ';' : ',';
  const filas: string[][] = [];
  let fila: string[] = [], campo = '', comillas = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (comillas) {
      if (c === '"' && t[i + 1] === '"') { campo += '"'; i++; }
      else if (c === '"') comillas = false;
      else campo += c;
    } else if (c === '"') comillas = true;
    else if (c === sep) { fila.push(campo); campo = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && t[i + 1] === '\n') i++;
      fila.push(campo); filas.push(fila); fila = []; campo = '';
    } else campo += c;
  }
  if (campo || fila.length) { fila.push(campo); filas.push(fila); }
  return filas;
}

/** Busca a qué producto corresponde una foto por el nombre del archivo ("Taza de cerámica (2).jpg"). */
export function productoDeArchivo<T extends { id: string; nombre: string }>(archivo: string, productos: T[]): T | null {
  const base = normalizar(archivo.replace(/\.[a-z0-9]+$/i, ''));
  const mapa = new Map(productos.map((p) => [normalizar(p.nombre), p]));
  if (mapa.has(base)) return mapa.get(base)!;
  const sinNumero = base.replace(/\s+\d{1,2}$/, '');
  return mapa.get(sinNumero) || null;
}

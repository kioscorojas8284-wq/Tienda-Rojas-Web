'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { readSheet } from 'read-excel-file/browser';
import writeXlsxFile from 'write-excel-file/browser';
import { COLUMNAS, interpretarPlanilla, leerCSV, normalizar, productoDeArchivo, type Columna, type FilaProducto } from '@/lib/importar';
import { importarProductos, agregarFotos } from '@/app/admin/actions';
import { money } from '@/lib/format';

type Existente = { id: string; nombre: string; precio: number; categoria: string; descripcion: string; stock: number | null; publicado: boolean; orden: number; imagenes: string[] };

const titulo = (t: string) => ({ value: t, fontWeight: 'bold' as const, backgroundColor: '#F1D9D3' });

/** Achica la foto antes de subirla (máx. 1400 px, JPEG). */
async function comprimir(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = mal; i.src = url; });
    const k = Math.min(1, 1400 / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
    return await new Promise<Blob>((ok, mal) => c.toBlob((b) => (b ? ok(b) : mal(new Error('foto'))), 'image/jpeg', 0.85));
  } finally { URL.revokeObjectURL(url); }
}

export default function Importador({ existentes }: { existentes: Existente[] }) {
  const router = useRouter();
  /* ---------- planilla ---------- */
  const [archivo, setArchivo] = useState('');
  const [filas, setFilas] = useState<FilaProducto[]>([]);
  const [columnas, setColumnas] = useState<Columna[]>([]);
  const [error, setError] = useState('');
  const [actualizar, setActualizar] = useState(true);
  const [estado, setEstado] = useState<'' | 'importando' | 'listo'>('');
  const [resultado, setResultado] = useState('');

  const nombres = useMemo(() => new Set(existentes.map((p) => normalizar(p.nombre))), [existentes]);
  const conError = filas.filter((f) => f.errores.length);
  const validas = filas.filter((f) => !f.errores.length);
  const nuevas = validas.filter((f) => !nombres.has(normalizar(f.nombre)));
  const repetidas = validas.filter((f) => nombres.has(normalizar(f.nombre)));
  const aImportar = actualizar ? validas.length : nuevas.length;

  async function bajarModelo(conProductos: boolean) {
    const filasEjemplo = conProductos && existentes.length
      ? existentes.map((p) => [p.nombre, p.precio, p.categoria, p.descripcion, p.stock ?? '', p.publicado ? 'Sí' : 'No', p.orden, p.imagenes[0] || ''])
      : [0, 1].map((i) => COLUMNAS.map((c) => c.ejemplo[i]));
    const data = [
      COLUMNAS.map((c) => titulo(c.titulo)),
      ...filasEjemplo.map((f) => f.map((v) => ({ value: v === '' ? null : v }))),
    ];
    await writeXlsxFile(data as any, { columns: [{ width: 34 }, { width: 12 }, { width: 16 }, { width: 50 }, { width: 8 }, { width: 11 }, { width: 8 }, { width: 40 }] } as any)
      .toFile(conProductos ? 'productos-tienda.xlsx' : 'modelo-productos.xlsx');
  }

  async function leer(file: File | undefined) {
    setError(''); setFilas([]); setResultado(''); setEstado('');
    if (!file) return;
    setArchivo(file.name);
    try {
      let datos: unknown[][];
      if (/\.csv$/i.test(file.name) || file.type === 'text/csv') datos = leerCSV(await file.text());
      else if (/\.xlsx$/i.test(file.name)) datos = (await readSheet(file)) as unknown[][];
      else { setError('Subí un archivo de Excel (.xlsx) o .csv. Si tenés un .xls viejo, abrilo en Excel y guardalo como .xlsx.'); return; }
      const r = interpretarPlanilla(datos);
      if (r.error) { setError(r.error); return; }
      if (!r.productos.length) { setError('La planilla no tiene productos debajo de los títulos.'); return; }
      setFilas(r.productos); setColumnas(r.columnas);
    } catch {
      setError('No pudimos leer el archivo. Probá guardarlo de nuevo como .xlsx desde Excel o Google Sheets.');
    }
  }

  async function importar() {
    setEstado('importando');
    const r = await importarProductos(actualizar ? validas : nuevas, columnas, actualizar);
    if (!r.ok) { setError(r.error || 'No se pudo importar'); setEstado(''); return; }
    setResultado(`Listo: ${r.creados} productos nuevos${r.actualizados ? ` y ${r.actualizados} actualizados` : ''}.${r.salteados ? ` ${r.salteados} se saltearon.` : ''}`);
    setEstado('listo'); setFilas([]); router.refresh();
  }

  /* ---------- fotos en lote ---------- */
  const [fotos, setFotos] = useState<{ file: File; prod: Existente | null; estado: string }[]>([]);
  const [subiendo, setSubiendo] = useState(false);
  const asignadas = fotos.filter((f) => f.prod);

  function elegirFotos(list: FileList | null) {
    if (!list) return;
    setFotos(Array.from(list).filter((f) => f.type.startsWith('image/')).map((file) => ({ file, prod: productoDeArchivo(file.name, existentes), estado: '' })));
  }

  async function subirFotos() {
    setSubiendo(true);
    const porProducto = new Map<string, string[]>();
    const copia = [...fotos];
    for (let i = 0; i < copia.length; i++) {
      const f = copia[i];
      if (!f.prod) continue;
      copia[i] = { ...f, estado: 'Subiendo…' }; setFotos([...copia]);
      try {
        const fd = new FormData();
        fd.append('file', await comprimir(f.file), 'foto.jpg');
        const r = await fetch('/api/admin/upload', { method: 'POST', body: fd });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        porProducto.set(f.prod.id, [...(porProducto.get(f.prod.id) || []), d.url]);
        copia[i] = { ...f, estado: 'Subida' };
      } catch (e: any) { copia[i] = { ...f, estado: `Error: ${e.message || 'no se pudo subir'}` }; }
      setFotos([...copia]);
    }
    for (const [id, urls] of Array.from(porProducto.entries())) await agregarFotos(id, urls);
    setSubiendo(false);
    setResultado(`Fotos asignadas a ${porProducto.size} productos.`); router.refresh();
  }

  return (
    <>
      <section className="panel stack">
        <div className="phead" style={{ marginBottom: 0 }}>
          <div><h2>Cargar productos desde Excel</h2><span className="meta">También sirve para actualizar precios y stock de muchos productos a la vez.</span></div>
          <Link className="btn ghost sm" href="/admin/productos">← Volver a productos</Link>
        </div>

        <ol className="stack" style={{ margin: 0, paddingLeft: 20 }}>
          <li>
            <strong>Bajá la planilla</strong> y completala en Excel o Google Sheets (una fila por producto).
            <div className="row" style={{ marginTop: 8 }}>
              <button type="button" className="btn sm" onClick={() => bajarModelo(false)}>Bajar planilla modelo</button>
              {existentes.length > 0 && <button type="button" className="btn sm" onClick={() => bajarModelo(true)}>Bajar mis {existentes.length} productos para editar</button>}
            </div>
            <div className="tbl" style={{ marginTop: 10 }}>
              <table><thead><tr>{COLUMNAS.map((c) => <th key={c.key}>{c.titulo}</th>)}</tr></thead>
                <tbody><tr>{COLUMNAS.map((c) => <td key={c.key} className="meta">{c.ayuda}</td>)}</tr></tbody></table>
            </div>
          </li>
          <li>
            <strong>Subí el archivo</strong> (.xlsx o .csv). Antes de guardar vas a ver una vista previa.
            <div style={{ marginTop: 8 }}>
              <label className="btn pri sm">Elegir archivo
                <input type="file" accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden
                  onChange={(e) => { leer(e.target.files?.[0]); e.target.value = ''; }} />
              </label>
              {archivo && <span className="note" style={{ marginLeft: 10 }}>{archivo}</span>}
            </div>
          </li>
        </ol>

        {error && <div className="alert err">{error}</div>}
        {resultado && <div className="alert ok">{resultado} <Link href="/admin/productos">Ver productos</Link></div>}

        {filas.length > 0 && (
          <div className="stack">
            <div className="kpis" style={{ marginBottom: 0 }}>
              <div className="kpi"><div className="k">Nuevos</div><div className="v">{nuevas.length}</div></div>
              <div className="kpi"><div className="k">Ya existen</div><div className="v">{repetidas.length}</div><div className="meta">mismo nombre</div></div>
              <div className="kpi"><div className="k">Con errores</div><div className="v" style={{ color: conError.length ? 'var(--accent)' : undefined }}>{conError.length}</div><div className="meta">no se importan</div></div>
            </div>
            {repetidas.length > 0 && (
              <label className="row" style={{ gap: 8, fontWeight: 600 }}>
                <input type="checkbox" checked={actualizar} onChange={(e) => setActualizar(e.target.checked)} style={{ accentColor: 'var(--accent)', width: 18, height: 18 }} />
                Actualizar los {repetidas.length} productos que ya existen con los datos de la planilla
              </label>
            )}
            <div className="tbl" style={{ maxHeight: 420, overflowY: 'auto' }}>
              <table>
                <thead><tr><th>Fila</th><th>Nombre</th><th className="num">Precio</th><th>Categoría</th><th className="num">Stock</th><th>Estado</th></tr></thead>
                <tbody>{filas.map((f) => {
                  const existe = nombres.has(normalizar(f.nombre));
                  return (
                    <tr key={f.fila}>
                      <td className="meta">{f.fila}</td>
                      <td><strong>{f.nombre || '—'}</strong>{f.descripcion && <div className="meta">{f.descripcion.slice(0, 80)}</div>}</td>
                      <td className="num">{f.precio != null ? money(f.precio) : '—'}</td>
                      <td className="meta">{f.categoria}</td>
                      <td className="num">{f.stock ?? ''}</td>
                      <td>{f.errores.length ? <span className="pill acc">{f.errores.join(' · ')}</span>
                        : existe ? <span className="pill warn">{actualizar ? 'Se actualiza' : 'Ya existe, se saltea'}</span>
                        : <span className="pill ok">Nuevo{f.publicado === false ? ' (oculto)' : ''}</span>}</td>
                    </tr>
                  );
                })}</tbody>
              </table>
            </div>
            <div className="row">
              <button type="button" className="btn pri" disabled={!aImportar || estado === 'importando'} onClick={importar}>
                {estado === 'importando' ? 'Importando…' : `Importar ${aImportar} productos`}
              </button>
              <button type="button" className="btn ghost" onClick={() => { setFilas([]); setArchivo(''); }}>Cancelar</button>
            </div>
          </div>
        )}
      </section>

      <section className="panel stack">
        <div><h2>Subir fotos en lote</h2>
          <span className="meta">Nombrá cada foto igual que el producto, por ejemplo <code>Taza de cerámica.jpg</code>. Para varias fotos del mismo producto: <code>Taza de cerámica 2.jpg</code>, <code>Taza de cerámica 3.jpg</code>.</span></div>
        <div>
          <label className="btn sm">Elegir fotos
            <input type="file" accept="image/*" multiple hidden onChange={(e) => { elegirFotos(e.target.files); e.target.value = ''; }} />
          </label>
        </div>
        {fotos.length > 0 && (
          <>
            <p className="note" style={{ margin: 0 }}>{asignadas.length} de {fotos.length} fotos coinciden con un producto. Las que no coinciden no se suben: revisá que el nombre del archivo sea igual al del producto.</p>
            <div className="tbl" style={{ maxHeight: 360, overflowY: 'auto' }}>
              <table><thead><tr><th>Archivo</th><th>Producto</th><th>Estado</th></tr></thead>
                <tbody>{fotos.map((f, i) => (
                  <tr key={i}><td className="meta">{f.file.name}</td>
                    <td>{f.prod ? <strong>{f.prod.nombre}</strong> : <span className="pill acc">Sin coincidencia</span>}</td>
                    <td className="meta">{f.estado}</td></tr>
                ))}</tbody></table>
            </div>
            <div className="row">
              <button type="button" className="btn pri" disabled={!asignadas.length || subiendo} onClick={subirFotos}>
                {subiendo ? 'Subiendo fotos…' : `Subir ${asignadas.length} fotos`}
              </button>
              <button type="button" className="btn ghost" disabled={subiendo} onClick={() => setFotos([])}>Cancelar</button>
            </div>
          </>
        )}
      </section>
    </>
  );
}

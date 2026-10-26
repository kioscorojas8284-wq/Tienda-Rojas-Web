'use client';
import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { guardarProducto } from '@/app/admin/actions';
import type { Producto } from '@/lib/types';

function Guardar() {
  const { pending } = useFormStatus();
  return <button className="btn pri" type="submit" disabled={pending}>{pending ? 'Guardando…' : 'Guardar'}</button>;
}

/** Achica la foto en el navegador antes de subirla (máx. 1400 px, JPEG). */
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

export default function ProductoForm({ p, categorias }: { p: Producto | null; categorias: string[] }) {
  const [imgs, setImgs] = useState<string[]>(p?.imagenes || []);
  const [msg, setMsg] = useState('');

  async function subir(files: FileList | null) {
    if (!files?.length) return;
    const lista = Array.from(files);
    for (let i = 0; i < lista.length; i++) {
      setMsg(`Subiendo foto ${i + 1} de ${lista.length}…`);
      try {
        const fd = new FormData();
        fd.append('file', await comprimir(lista[i]), 'foto.jpg');
        const r = await fetch('/api/admin/upload', { method: 'POST', body: fd });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setImgs((x) => [...x, d.url]);
      } catch (e: any) { setMsg(`No se pudo subir una foto: ${e.message || 'error'}`); return; }
    }
    setMsg('');
  }
  const mover = (i: number) => setImgs((x) => { const y = [...x]; const [it] = y.splice(i, 1); y.unshift(it); return y; });

  return (
    <form action={guardarProducto} className="panel fgrid">
      <input type="hidden" name="id" value={p?.id || 'nuevo'} />
      <input type="hidden" name="imagenes" value={JSON.stringify(imgs)} />
      <div className="phead full" style={{ marginBottom: 0 }}>
        <h2>{p ? 'Editar producto' : 'Nuevo producto'}</h2>
        <Link className="btn ghost sm" href="/admin/productos">Cancelar</Link>
      </div>
      <label className="f full"><span>Nombre</span><input className="inp" id="nombre" name="nombre" required defaultValue={p?.nombre} /></label>
      <label className="f"><span>Precio (ARS)</span><input className="inp" id="precio" name="precio" type="number" min="0" step="1" required defaultValue={p?.precio} /></label>
      <label className="f"><span>Categoría</span>
        <input className="inp" id="categoria" name="categoria" list="cats" defaultValue={p?.categoria} />
        <datalist id="cats">{categorias.map((c) => <option key={c} value={c} />)}</datalist>
      </label>
      <label className="f full"><span>Descripción</span><textarea className="inp" id="descripcion" name="descripcion" defaultValue={p?.descripcion} /></label>
      <label className="f"><span>Stock (vacío = sin control)</span><input className="inp" id="stock" name="stock" type="number" min="0" step="1" defaultValue={p?.stock ?? ''} /></label>
      <label className="f"><span>Orden en la tienda (menor = primero)</span><input className="inp" id="orden" name="orden" type="number" step="1" defaultValue={p?.orden ?? 0} /></label>
      <div className="f full"><span>Fotos (la primera es la portada)</span>
        <div className="imgs">
          {imgs.map((s, i) => (
            <div className="it" key={s}>
              <img src={s} alt={`Foto ${i + 1}`} />
              <button type="button" className="x" onClick={() => setImgs((x) => x.filter((y) => y !== s))} aria-label="Quitar foto">×</button>
              {i === 0 ? <span className="first">Portada</span> : <button type="button" className="first" onClick={() => mover(i)}>Usar de portada</button>}
            </div>
          ))}
          <label className="upl">+ Agregar<br />fotos<input type="file" accept="image/*" multiple hidden onChange={(e) => { subir(e.target.files); e.target.value = ''; }} /></label>
        </div>
        {msg && <span className="note">{msg}</span>}
      </div>
      <label className="row full" style={{ gap: 8, fontWeight: 600 }}>
        <input type="checkbox" id="publicado" name="publicado" defaultChecked={p ? p.publicado : true} style={{ accentColor: 'var(--ok)', width: 18, height: 18 }} />
        Publicar en la tienda
      </label>
      <div className="row full"><Guardar /><span className="note">Los cambios se ven en la tienda al instante.</span></div>
    </form>
  );
}

import Link from 'next/link';
import { db, normProducto } from '@/lib/db';
import { money } from '@/lib/format';
import { borrarProducto } from '@/app/admin/actions';
import Foto from '@/components/Foto';
import PublicarSwitch from '@/components/admin/PublicarSwitch';
import Confirmar from '@/components/admin/Confirmar';

export default async function Productos({ searchParams }: { searchParams: { ok?: string } }) {
  const { data } = await db().from('productos').select('*').order('orden').order('creado', { ascending: false });
  const P = (data || []).map(normProducto);
  return (
    <section className="panel">
      <div className="phead">
        <div><h2>Productos</h2><span className="meta">{P.length} cargados · {P.filter((p) => p.publicado).length} publicados</span></div>
        <div className="row">
          <Link className="btn" href="/admin/productos/importar">Carga masiva (Excel)</Link>
          <Link className="btn pri" href="/admin/productos/nuevo">+ Nuevo producto</Link>
        </div>
      </div>
      {searchParams.ok && <div className="alert ok" style={{ marginBottom: 12 }}>Producto guardado.</div>}
      {!P.length ? <div className="empty"><h3>Sin productos</h3><p>Tocá “Nuevo producto” para cargar el primero, o “Carga masiva” para subir muchos desde una planilla de Excel.</p></div> : (
        <div className="alist">
          {P.map((p) => (
            <div className="aitem" key={p.id}>
              <Foto src={p.imagenes[0]} alt={p.nombre} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>{p.nombre}</div>
                <div className="meta">{money(p.precio)}{p.categoria && ` · ${p.categoria}`}
                  {p.stock !== null && (p.stock <= 0 ? <> · <span className="pill acc">Agotado</span></> : ` · Stock ${p.stock}`)}</div>
              </div>
              <div className="acts row">
                <PublicarSwitch key={String(p.publicado)} id={p.id} publicado={p.publicado} />
                <Link className="btn sm" href={`/admin/productos/${p.id}`}>Editar</Link>
                <Confirmar accion={borrarProducto.bind(null, p.id)} pregunta="¿Borrar producto?" />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

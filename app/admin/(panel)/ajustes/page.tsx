import { getConfig } from '@/lib/db';
import { SITE_URL, MP_ENABLED } from '@/lib/env';
import { guardarConfig } from '@/app/admin/actions';

export default async function Ajustes({ searchParams }: { searchParams: { ok?: string } }) {
  const c = await getConfig();
  const F = ({ n, l, v, ph, full, type }: { n: string; l: string; v: string; ph?: string; full?: boolean; type?: string }) => (
    <label className={`f${full ? ' full' : ''}`}><span>{l}</span><input className="inp" id={`cfg_${n}`} name={n} type={type || 'text'} defaultValue={v} placeholder={ph} /></label>
  );
  return (
    <>
      <form action={guardarConfig} className="panel fgrid">
        <div className="full"><h2>Ajustes de la tienda</h2></div>
        {searchParams.ok && <div className="alert ok full">Ajustes guardados.</div>}
        <F n="nombre" l="Nombre de la tienda" v={c.nombre} full />
        <F n="slogan" l="Frase de bienvenida" v={c.slogan} full />
        <F n="whatsapp" l="WhatsApp de la tienda" v={c.whatsapp} ph="11 2345 6789" type="tel" />
        <F n="horario" l="Horario de atención" v={c.horario} ph="Lun a vie 10 a 19 h" />
        <F n="alias" l="Alias para transferencias" v={c.alias} ph="mi.tienda.mp" />
        <F n="cbu" l="CBU / CVU" v={c.cbu} ph="22 dígitos" />
        <F n="titular" l="Titular de la cuenta" v={c.titular} />
        <F n="retiro" l="Dónde se retira / paga en efectivo" v={c.retiro} ph="Dirección o zona" />
        <div className="full"><button className="btn pri">Guardar</button></div>
      </form>
      <section className="panel stack">
        <h2>Estado de la conexión</h2>
        <div><span className={`pill ${MP_ENABLED ? 'ok' : 'acc'}`}>{MP_ENABLED ? 'Mercado Pago conectado' : 'Mercado Pago sin configurar'}</span></div>
        <p className="note" style={{ margin: 0 }}>Dirección de la tienda: <strong>{SITE_URL}</strong>. Notificaciones de pago: <code>{SITE_URL}/api/mp/webhook</code></p>
      </section>
    </>
  );
}

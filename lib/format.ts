const fmt = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
export const money = (n: number | string | null | undefined) => fmt.format(Number(n) || 0);

/** Normaliza un celular argentino al formato que usa WhatsApp: 549 + área + número. */
export function telNorm(t: string | null | undefined): string {
  let d = String(t || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('549')) return d;
  if (d.startsWith('54')) return '549' + d.slice(2);
  d = d.replace(/^0/, '');
  // quita el "15" después del código de área (ej: 11 15 2345 6789)
  const m = d.match(/^(\d{2,4})15(\d{6,8})$/);
  if (m && (m[1] + m[2]).length === 10) d = m[1] + m[2];
  if (d.length === 10) return '549' + d;
  return d;
}

export function waLink(numero: string | null | undefined, mensaje?: string): string {
  const n = String(numero || '').replace(/\D/g, '');
  if (!n) return '';
  return `https://wa.me/${n}${mensaje ? `?text=${encodeURIComponent(mensaje)}` : ''}`;
}

export const ESTADOS: Record<string, { label: string; tono: string }> = {
  pendiente_pago: { label: 'Esperando pago', tono: 'warn' },
  reservado: { label: 'Reservado', tono: 'warn' },
  pagado: { label: 'Pagado', tono: 'ok' },
  entregado: { label: 'Entregado', tono: '' },
  cancelado: { label: 'Cancelado', tono: 'acc' },
};
export const METODOS: Record<string, string> = {
  mercadopago: 'Mercado Pago', efectivo: 'Efectivo', transferencia: 'Transferencia',
};

export function fecha(iso: string, conHora = false) {
  const d = new Date(iso);
  return d.toLocaleDateString('es-AR', {
    day: '2-digit', month: '2-digit', year: conHora ? undefined : '2-digit', timeZone: 'America/Argentina/Buenos_Aires',
    ...(conHora ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

export const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
export function cumpleTexto(c: string) {
  const m = /^(\d{2})-(\d{2})$/.exec(c || '');
  return m ? `${Number(m[2])} de ${MESES[Number(m[1]) - 1]}` : '';
}

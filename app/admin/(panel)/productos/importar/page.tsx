import { db, normProducto } from '@/lib/db';
import Importador from '@/components/admin/Importador';

export default async function Importar() {
  const { data } = await db().from('productos').select('*').order('orden').order('nombre');
  return <Importador existentes={(data || []).map(normProducto)} />;
}

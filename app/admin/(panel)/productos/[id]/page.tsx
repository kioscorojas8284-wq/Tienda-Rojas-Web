import { notFound } from 'next/navigation';
import { db, getProducto } from '@/lib/db';
import ProductoForm from '@/components/admin/ProductoForm';

export default async function EditarProducto({ params }: { params: { id: string } }) {
  const p = params.id === 'nuevo' ? null : await getProducto(params.id);
  if (params.id !== 'nuevo' && !p) notFound();
  const { data } = await db().from('productos').select('categoria');
  const cats = Array.from(new Set((data || []).map((x: any) => x.categoria).filter(Boolean))) as string[];
  return <ProductoForm p={p} categorias={cats} />;
}

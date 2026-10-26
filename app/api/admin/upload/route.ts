import { NextResponse } from 'next/server';
import { getAdmin } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(req: Request) {
  if (!(await getAdmin())) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const f = await req.formData();
  const file = f.get('file');
  if (!(file instanceof Blob)) return NextResponse.json({ error: 'Falta la foto' }, { status: 400 });
  if (file.size > 4 * 1024 * 1024) return NextResponse.json({ error: 'La foto pesa más de 4 MB' }, { status: 400 });
  const tipo = file.type || 'image/jpeg';
  if (!/^image\/(jpeg|png|webp)$/.test(tipo)) return NextResponse.json({ error: 'Formato no soportado' }, { status: 400 });
  const ext = tipo.split('/')[1].replace('jpeg', 'jpg');
  const path = `${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.${ext}`;
  const { error } = await db().storage.from('productos').upload(path, file, { contentType: tipo, cacheControl: '31536000' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const { data } = db().storage.from('productos').getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}

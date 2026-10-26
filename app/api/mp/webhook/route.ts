import { NextResponse } from 'next/server';
import { WebhookSignatureValidator } from 'mercadopago';
import { aplicarPago } from '@/lib/mp';

// Mercado Pago avisa acá cada vez que cambia un pago.
export async function POST(req: Request) {
  const url = new URL(req.url);
  let body: any = {};
  try { body = await req.json(); } catch {}
  const tipo = body.type || body.topic || url.searchParams.get('type') || url.searchParams.get('topic');
  const id = body?.data?.id || url.searchParams.get('data.id') || url.searchParams.get('id');
  if (tipo !== 'payment' || !id) return NextResponse.json({ ok: true });

  const secret = process.env.MP_WEBHOOK_SECRET;
  if (secret) {
    try {
      WebhookSignatureValidator.validate({
        xSignature: req.headers.get('x-signature'), xRequestId: req.headers.get('x-request-id'),
        dataId: url.searchParams.get('data.id') || String(id), secret,
      });
    } catch {
      return NextResponse.json({ error: 'firma inválida' }, { status: 401 });
    }
  }
  try {
    await aplicarPago(String(id));
  } catch (e) {
    console.error('webhook MP', e);
    return NextResponse.json({ error: 'reintentar' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function GET() { return NextResponse.json({ ok: true }); }

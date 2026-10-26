import { NextResponse } from 'next/server';
import { authClient } from '@/lib/auth';

export async function POST(req: Request) {
  await authClient().auth.signOut();
  return NextResponse.redirect(new URL('/admin/login', req.url), { status: 303 });
}

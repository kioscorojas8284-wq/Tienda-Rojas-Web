import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth';
import AdminNav from '@/components/admin/AdminNav';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Panel', robots: { index: false } };

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <>
      <AdminNav />
      <main className="wrap adm">{children}</main>
    </>
  );
}

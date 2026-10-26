import Link from 'next/link';
export default function NotFound() {
  return (
    <main className="wrap narrow" style={{ paddingTop: 80 }}>
      <div className="empty"><h3>No encontramos esta página</h3><p><Link href="/">Volver a la tienda</Link></p></div>
    </main>
  );
}

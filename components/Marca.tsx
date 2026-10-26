export default function Marca({ nombre }: { nombre: string }) {
  const p = (nombre || 'Mi tienda').trim().split(' ');
  if (p.length < 2) return <>{nombre}</>;
  return <>{p.slice(0, -1).join(' ')} <b>{p[p.length - 1]}</b></>;
}

export default function Foto({ src, alt, children }: { src?: string; alt: string; children?: React.ReactNode }) {
  return (
    <div className="ph">
      {src ? <img src={src} alt={alt} loading="lazy" /> : <span className="mono">{(alt || '?').trim().charAt(0).toUpperCase()}</span>}
      {children}
    </div>
  );
}

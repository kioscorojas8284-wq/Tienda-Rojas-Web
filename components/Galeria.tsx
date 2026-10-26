'use client';
import { useState } from 'react';
import Foto from './Foto';

export default function Galeria({ imagenes, alt }: { imagenes: string[]; alt: string }) {
  const [i, setI] = useState(0);
  return (
    <div className="gal">
      <Foto src={imagenes[i]} alt={alt} />
      {imagenes.length > 1 && (
        <div className="thumbs">
          {imagenes.map((s, k) => (
            <button key={s} className={k === i ? 'on' : ''} onClick={() => setI(k)} aria-label={`Foto ${k + 1}`}><img src={s} alt="" /></button>
          ))}
        </div>
      )}
    </div>
  );
}

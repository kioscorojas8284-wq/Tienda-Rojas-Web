'use client';
import { useState, useTransition } from 'react';

/** Botón de borrar en dos pasos (sin ventanas emergentes). */
export default function Confirmar({ accion, label = 'Borrar', pregunta = '¿Borrar?' }: { accion: () => Promise<void>; label?: string; pregunta?: string }) {
  const [abierto, setAbierto] = useState(false);
  const [pend, start] = useTransition();
  if (!abierto) return <button type="button" className="btn sm ghost danger" onClick={() => setAbierto(true)}>{label}</button>;
  return (
    <span className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>
      <span className="note">{pregunta}</span>
      <button type="button" className="btn sm pri" disabled={pend} onClick={() => start(() => accion())}>Sí</button>
      <button type="button" className="btn sm" onClick={() => setAbierto(false)}>No</button>
    </span>
  );
}

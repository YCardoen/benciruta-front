'use client';

import { useState } from 'react';

const SUGERIDOS = ['Casa', 'Trabajo', 'Universidad'];

const campo =
  'h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200';

function mismaUbicacion(a, b) {
  return Math.abs(a.lat - b.lat) < 1e-6 && Math.abs(a.lng - b.lng) < 1e-6;
}

// Lugares guardados (Casa, Trabajo, etc.) para elegirlos como destino con un clic
export default function Lugares({ lugares, destino, onCambio, onUsar }) {
  const [nombre, setNombre] = useState('');
  const [intentado, setIntentado] = useState(false);

  const yaGuardado = destino && lugares.some((l) => mismaUbicacion(l, destino));
  const nombreLimpio = nombre.trim();
  const error = !nombreLimpio ? 'Ponle un nombre al lugar' : '';

  function guardar(e) {
    e.preventDefault();
    setIntentado(true);
    if (error) return;
    const nuevo = { id: crypto.randomUUID(), nombre: nombreLimpio, texto: destino.texto, lat: destino.lat, lng: destino.lng };
    // Si ya existe un lugar con ese nombre, se reemplaza
    const otros = lugares.filter((l) => l.nombre.toLowerCase() !== nombreLimpio.toLowerCase());
    onCambio([...otros, nuevo]);
    setNombre('');
    setIntentado(false);
  }

  return (
    <>
      {lugares.length > 0 && (
        <div>
          <p className="mb-1 text-sm font-semibold">Mis lugares</p>
          <ul className="space-y-2">
            {lugares.map((l) => {
              const enUso = destino && mismaUbicacion(l, destino);
              return (
                <li
                  key={l.id}
                  className={`flex items-center gap-2 rounded-xl bg-white p-3 ring-1 ${
                    enUso ? 'ring-green-400' : 'ring-slate-200'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {l.nombre} {enUso && <span className="text-green-700">✓</span>}
                    </p>
                    <p className="truncate text-xs text-slate-500">{l.texto}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onUsar(l)}
                    aria-label={`Usar ${l.nombre} como destino`}
                    className="h-9 shrink-0 rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white"
                  >
                    Usar
                  </button>
                  <button
                    type="button"
                    onClick={() => onCambio(lugares.filter((x) => x.id !== l.id))}
                    aria-label={`Borrar lugar ${l.nombre}`}
                    className="h-9 shrink-0 rounded-lg px-3 text-sm font-semibold text-red-600 hover:bg-red-50"
                  >
                    Borrar
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {destino && !yaGuardado && (
        <form onSubmit={guardar} className="space-y-2 rounded-xl bg-white p-3 ring-1 ring-slate-200">
          <p className="text-sm font-semibold">Guardar este destino como lugar</p>
          <div className="flex flex-wrap gap-2">
            {SUGERIDOS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setNombre(s)}
                className={`h-9 rounded-full px-4 text-sm font-semibold ${
                  nombreLimpio === s ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-300'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <input
            aria-label="Nombre del lugar"
            placeholder="Nombre (ej: Casa, Trabajo, Gimnasio)"
            maxLength={30}
            className={`${campo} ${intentado && error ? 'border-red-500' : ''}`}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            aria-invalid={intentado && Boolean(error)}
          />
          {intentado && error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}
          <button type="submit" className="h-11 w-full rounded-xl bg-slate-900 font-semibold text-white">
            Guardar lugar
          </button>
        </form>
      )}
    </>
  );
}

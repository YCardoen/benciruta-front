'use client';

import { useEffect, useState } from 'react';
import { formatCLP } from '../lib/format';
import { obtenerMarcas } from '../lib/api';
import { NUNOA_CENTER } from '../lib/config';

// Para comparar marcas sin importar mayúsculas ni tildes
function normalizar(t) {
  return String(t || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

export const TIPOS_DESCUENTO = [
  { id: 'peso_litro', label: '$ por litro', unidad: '$/L' },
  { id: 'porcentaje', label: 'Porcentaje (%)', unidad: '%' },
  { id: 'monto_fijo', label: 'Monto fijo ($ en la carga)', unidad: '$' },
];

const campo =
  'h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200';

const FORM_VACIO = { nombre: '', marca: '', tipo: 'peso_litro', valor: '' };

function parseValor(texto) {
  return Number(String(texto).replace(',', '.'));
}

export function validarValor(tipo, texto) {
  const n = parseValor(texto);
  if (texto === '' || isNaN(n) || n <= 0) return 'Ingresa un valor mayor a 0';
  if (tipo === 'porcentaje' && n > 100) return 'El porcentaje no puede superar 100';
  return '';
}

export function textoDescuento(d) {
  const t = TIPOS_DESCUENTO.find((x) => x.id === d.tipo);
  const n = Number(d.valor);
  const valor =
    d.tipo === 'porcentaje'
      ? `${String(n).replace('.', ',')}%`
      : d.tipo === 'peso_litro'
        ? `${formatCLP(n)}/L`
        : formatCLP(n);
  return `${valor} · ${t ? t.label.split(' (')[0] : d.tipo} · ${d.marca || 'Todas las marcas'}`;
}

export default function Descuentos({ descuentos, onCambio }) {
  const [form, setForm] = useState(FORM_VACIO);
  const [intentado, setIntentado] = useState(false);

  const [marcas, setMarcas] = useState([]);
  const [cargandoMarcas, setCargandoMarcas] = useState(true);
  const [marcasFallaron, setMarcasFallaron] = useState(false);
  const [listaAbierta, setListaAbierta] = useState(false);

  // Marcas reales de las estaciones de la zona, para que el descuento coincida con ellas
  useEffect(() => {
    let activo = true;
    obtenerMarcas({ lat: NUNOA_CENTER.lat, lng: NUNOA_CENTER.lng })
      .then((m) => activo && setMarcas(m))
      .catch(() => activo && setMarcasFallaron(true))
      .finally(() => activo && setCargandoMarcas(false));
    return () => {
      activo = false;
    };
  }, []);

  const textoMarca = form.marca.trim();
  const sugerencias = marcas.filter((m) => normalizar(m).includes(normalizar(textoMarca)));

  // Con la lista cargada, solo se acepta una marca de la lista (o vacío = todas)
  const marcaExacta = marcas.find((m) => normalizar(m) === normalizar(textoMarca));
  const errorMarca =
    textoMarca && !marcasFallaron && !cargandoMarcas && !marcaExacta ? 'Elige una marca de la lista' : '';

  const errorValor = validarValor(form.tipo, form.valor);
  const error = errorValor || errorMarca;
  const set = (c) => setForm((f) => ({ ...f, ...c }));

  function agregar(e) {
    e.preventDefault();
    setIntentado(true);
    if (error) return;
    onCambio([
      ...descuentos,
      {
        id: crypto.randomUUID(),
        nombre: form.nombre.trim() || 'Descuento',
        marca: marcaExacta || textoMarca,
        tipo: form.tipo,
        valor: parseValor(form.valor),
        activo: true,
      },
    ]);
    setForm(FORM_VACIO);
    setIntentado(false);
  }

  const alternar = (id) => onCambio(descuentos.map((d) => (d.id === id ? { ...d, activo: !d.activo } : d)));
  const borrar = (id) => onCambio(descuentos.filter((d) => d.id !== id));

  return (
    <>
      <p className="text-xs text-slate-500">
        Registra tus descuentos (app de fidelización, tarjeta o convenio). Se guardan en este navegador. Solo los
        activos se usan al calcular el costo.
      </p>

      {descuentos.length > 0 && (
        <ul className="space-y-2">
          {descuentos.map((d) => (
            <li
              key={d.id}
              className={`flex items-center gap-3 rounded-xl bg-white p-3 ring-1 ${
                d.activo ? 'ring-green-300' : 'ring-slate-200'
              }`}
            >
              <input
                type="checkbox"
                checked={d.activo}
                onChange={() => alternar(d.id)}
                aria-label={`Usar descuento ${d.nombre}`}
                className="h-5 w-5 shrink-0 accent-green-600"
              />
              <div className={`min-w-0 flex-1 ${d.activo ? '' : 'text-slate-400'}`}>
                <p className="truncate text-sm font-semibold">{d.nombre}</p>
                <p className="truncate text-xs">{textoDescuento(d)}</p>
              </div>
              <button
                type="button"
                onClick={() => borrar(d.id)}
                aria-label={`Borrar descuento ${d.nombre}`}
                className="h-9 shrink-0 rounded-lg px-3 text-sm font-semibold text-red-600 hover:bg-red-50"
              >
                Borrar
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={agregar} className="space-y-2 rounded-xl bg-white p-3 ring-1 ring-slate-200">
        <p className="text-sm font-semibold">Agregar descuento</p>
        <input
          aria-label="Nombre del descuento"
          placeholder="Nombre (ej: App Copec)"
          maxLength={60}
          className={campo}
          value={form.nombre}
          onChange={(e) => set({ nombre: e.target.value })}
        />
        <div className="relative">
          <input
            aria-label="Marca de estación"
            role="combobox"
            aria-expanded={listaAbierta}
            aria-autocomplete="list"
            placeholder="Marca de estación (vacío = todas)"
            autoComplete="off"
            className={`${campo} ${intentado && errorMarca ? 'border-red-500' : ''}`}
            value={form.marca}
            onChange={(e) => {
              set({ marca: e.target.value });
              setListaAbierta(true);
            }}
            onFocus={() => setListaAbierta(true)}
            onBlur={() => setTimeout(() => setListaAbierta(false), 150)}
          />
          {form.marca && (
            <button
              type="button"
              aria-label="Quitar marca"
              onClick={() => set({ marca: '' })}
              className="absolute right-3 top-2.5 text-sm font-bold text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          )}
          {listaAbierta && (
            <ul
              role="listbox"
              className="absolute left-0 right-0 z-20 mt-1 max-h-48 overflow-y-auto rounded-xl bg-white shadow-lg ring-1 ring-slate-200"
            >
              {sugerencias.length === 0 ? (
                <li className="px-4 py-2.5 text-sm text-slate-500">
                  {cargandoMarcas ? 'Cargando marcas…' : 'No hay marcas que coincidan'}
                </li>
              ) : (
                sugerencias.map((m) => (
                  <li key={m} role="option" aria-selected={m === form.marca}>
                    <button
                      type="button"
                      className="block w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        set({ marca: m });
                        setListaAbierta(false);
                      }}
                    >
                      {m}
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
        {intentado && errorMarca && (
          <p role="alert" className="text-sm text-red-600">
            {errorMarca}
          </p>
        )}
        <div className="grid grid-cols-2 gap-2">
          <select
            aria-label="Tipo de descuento"
            className={campo}
            value={form.tipo}
            onChange={(e) => set({ tipo: e.target.value })}
          >
            {TIPOS_DESCUENTO.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
          <input
            aria-label="Valor del descuento"
            inputMode="decimal"
            placeholder={`Valor (${TIPOS_DESCUENTO.find((t) => t.id === form.tipo).unidad})`}
            className={`${campo} ${intentado && errorValor ? 'border-red-500' : ''}`}
            value={form.valor}
            onChange={(e) => set({ valor: e.target.value.replace(/[^\d.,]/g, '') })}
            aria-invalid={intentado && Boolean(errorValor)}
          />
        </div>
        {intentado && errorValor && (
          <p role="alert" className="text-sm text-red-600">
            {errorValor}
          </p>
        )}
        <button type="submit" className="h-11 w-full rounded-xl bg-slate-900 font-semibold text-white">
          Guardar descuento
        </button>
      </form>
    </>
  );
}

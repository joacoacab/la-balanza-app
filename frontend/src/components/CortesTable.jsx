import { useState } from 'react'
import { api } from '../api/client'

function fmt(str) {
  const n = parseFloat(str)
  if (Number.isNaN(n)) return '-'
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

function fmtKg(valor) {
  const n = numero(valor)
  if (n === null) return '-'
  return `${n.toFixed(1)} kg`
}

function numero(valor) {
  if (valor === null || valor === undefined || valor === '') return null
  const n = parseFloat(valor)
  return Number.isNaN(n) ? null : n
}

function fmtInput(valor) {
  const n = numero(valor)
  if (n === null) return ''
  return n.toFixed(2).replace(/\.?0+$/, '')
}

const TOLERANCIA_KG = 0.01

export default function CortesTable({
  cortes,
  compra = null,
  editable = false,
  onCorteActualizado,
}) {
  const [editandoId, setEditandoId] = useState(null)
  const [form, setForm] = useState({ kg: '', precio: '' })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)

  const kgVendibles = numero(compra?.kg_carne_vendible)
  const kgAsignados = numero(compra?.kg_cortes_total)
    ?? cortes.reduce((total, corte) => total + (numero(corte.kg_corte) ?? 0), 0)
  const kgDisponibles = kgVendibles === null ? null : kgVendibles - kgAsignados

  function abrirEdicion(corte) {
    setEditandoId(corte.id)
    setForm({
      kg: fmtInput(corte.kg_corte),
      precio: fmtInput(corte.precio_sugerido_kg),
    })
    setError(null)
  }

  function cancelarEdicion() {
    setEditandoId(null)
    setForm({ kg: '', precio: '' })
    setError(null)
  }

  async function guardarEdicion(corte) {
    const kgNuevo = numero(form.kg)
    const precioNuevo = numero(form.precio)
    const precioMinimo = numero(corte.precio_minimo_kg)
    const kgActual = numero(corte.kg_corte) ?? 0
    const pesoCompra = numero(compra?.peso_media_res)

    if (kgNuevo === null || kgNuevo < 0) {
      setError('Ingresá kilos válidos para el corte.')
      return
    }
    if (precioNuevo === null || precioNuevo < 0) {
      setError('Ingresá un precio de venta válido.')
      return
    }
    if (pesoCompra === null || pesoCompra <= 0 || !compra?.id) {
      setError('No se pudo editar este corte. Falta información de la compra.')
      return
    }

    const nuevoTotal = kgAsignados - kgActual + kgNuevo
    if (kgVendibles !== null && nuevoTotal > kgVendibles + TOLERANCIA_KG) {
      setError('No podés asignar más kilos que la carne vendible disponible.')
      return
    }

    const porcentaje = (kgNuevo / pesoCompra) * 100
    const margenCalculado =
      precioMinimo > 0 ? ((precioNuevo / precioMinimo) - 1) * 100 : 0

    setGuardando(true)
    setError(null)
    try {
      await api.compraCortes.editar(compra.id, corte.id, {
        porcentaje_rendimiento: porcentaje.toFixed(2),
        margen_porcentaje: margenCalculado.toFixed(2),
      })
      await onCorteActualizado?.()
      cancelarEdicion()
    } catch (err) {
      if (err.status === 400) {
        setError('Revisá los kilos y el precio ingresados.')
      } else {
        setError('No se pudo guardar el corte. Intentá de nuevo.')
      }
    } finally {
      setGuardando(false)
    }
  }

  const colorDisponible =
    kgDisponibles === null
      ? 'text-gray-900'
      : kgDisponibles < -TOLERANCIA_KG
      ? 'text-red-600'
      : kgDisponibles <= TOLERANCIA_KG
      ? 'text-green-700'
      : 'text-gray-900'

  return (
    <div>
      <h2 className="text-base font-semibold text-gray-900 mb-3">Cortes</h2>
      {compra && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Asignado</span>
            <span className="font-medium text-gray-900">
              {fmtKg(kgAsignados)}{kgVendibles !== null ? ` / ${fmtKg(kgVendibles)}` : ''}
            </span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-gray-600">Disponible</span>
            <span className={`font-medium ${colorDisponible}`}>{fmtKg(kgDisponibles)}</span>
          </div>
        </div>
      )}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3">
        {cortes.map((corte) => (
          <div
            key={corte.id}
            className="bg-white rounded-xl border border-gray-200 p-4 min-h-[148px] flex flex-col"
          >
            <div className="flex justify-between items-start gap-3 mb-3">
              <span className="text-base font-medium text-gray-900 leading-snug">
                {corte.nombre}
              </span>
              <span className="shrink-0 text-sm font-medium text-gray-700">
                {fmtKg(corte.kg_corte)}
              </span>
            </div>
            <div className="space-y-2 text-sm">
              <div>
                <p className="text-gray-500">Mínimo</p>
                <p className="font-medium text-gray-900">
                  ${fmt(corte.precio_minimo_kg)}/kg
                </p>
              </div>
              <div>
                <p className="text-gray-500">Precio de venta</p>
                <p className="font-medium text-gray-900">
                  ${fmt(corte.precio_sugerido_kg)}/kg
                </p>
              </div>
            </div>
            {editable && editandoId !== corte.id && (
              <button
                type="button"
                onClick={() => abrirEdicion(corte)}
                className="mt-4 w-full border border-gray-300 text-gray-700 rounded-lg px-3 py-2 text-sm font-medium min-h-[40px]"
              >
                Editar
              </button>
            )}
            {editable && editandoId === corte.id && (
              <div className="mt-4 space-y-3">
                <div>
                  <label
                    htmlFor={`kg-corte-${corte.id}`}
                    className="block text-xs font-medium text-gray-600 mb-1"
                  >
                    Kg del corte
                  </label>
                  <input
                    id={`kg-corte-${corte.id}`}
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={form.kg}
                    disabled={guardando}
                    onChange={(e) => setForm((prev) => ({ ...prev, kg: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-gray-900 disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label
                    htmlFor={`precio-venta-${corte.id}`}
                    className="block text-xs font-medium text-gray-600 mb-1"
                  >
                    Precio de venta ($/kg)
                  </label>
                  <input
                    id={`precio-venta-${corte.id}`}
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="1"
                    value={form.precio}
                    disabled={guardando}
                    onChange={(e) => setForm((prev) => ({ ...prev, precio: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-gray-900 disabled:bg-gray-100"
                  />
                  <HintMargen precio={form.precio} precioMinimo={corte.precio_minimo_kg} />
                </div>
                {error && (
                  <p className="text-sm text-red-700">{error}</p>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={cancelarEdicion}
                    disabled={guardando}
                    className="flex-1 border border-gray-300 text-gray-700 rounded-lg px-3 py-2 text-sm font-medium min-h-[40px] disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => guardarEdicion(corte)}
                    disabled={guardando}
                    className="flex-1 bg-gray-900 text-white rounded-lg px-3 py-2 text-sm font-medium min-h-[40px] disabled:opacity-50"
                  >
                    {guardando ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function HintMargen({ precio, precioMinimo }) {
  const p = parseFloat(precio)
  const min = parseFloat(precioMinimo)
  if (!precio || Number.isNaN(p) || Number.isNaN(min) || min <= 0) return null
  const margen = ((p / min) - 1) * 100
  if (p < min) {
    return (
      <p className="text-xs mt-1 text-red-600">
        Por debajo del costo mínimo (${Math.round(min).toLocaleString('es-AR')}/kg)
      </p>
    )
  }
  return (
    <p className="text-xs mt-1 text-gray-500">
      Ganancia: {margen.toFixed(1)}%
    </p>
  )
}

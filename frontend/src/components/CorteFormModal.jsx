import { useState } from 'react'

export default function CorteFormModal({ corte, onGuardar, onCancelar, guardando, error }) {
  const [form, setForm] = useState({
    nombre: corte?.nombre ?? '',
    porcentaje_rendimiento: corte?.porcentaje_rendimiento ?? '',
    margen_porcentaje: corte?.margen_porcentaje ?? '',
  })
  const [localError, setLocalError] = useState(null)

  function setField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function validate() {
    if (!form.nombre.trim()) {
      return 'El nombre es requerido.'
    }
    if (!form.porcentaje_rendimiento || parseFloat(form.porcentaje_rendimiento) <= 0) {
      return 'El % de rendimiento debe ser mayor a 0.'
    }
    if (!form.margen_porcentaje || parseFloat(form.margen_porcentaje) <= 0) {
      return 'El % de margen debe ser mayor a 0.'
    }
    return null
  }

  function handleSubmit(e) {
    e.preventDefault()
    const err = validate()
    if (err) {
      setLocalError(err)
      return
    }
    setLocalError(null)
    onGuardar({
      nombre: form.nombre.trim(),
      porcentaje_rendimiento: form.porcentaje_rendimiento,
      margen_porcentaje: form.margen_porcentaje,
    })
  }

  const mensajeError = localError || error

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center px-6 z-50">
      <div className="bg-white rounded-xl w-full max-w-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-5">
          {corte ? 'Editar corte' : 'Nuevo corte'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="corte-nombre"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Nombre
            </label>
            <input
              id="corte-nombre"
              type="text"
              disabled={guardando}
              value={form.nombre}
              onChange={(e) => setField('nombre', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-gray-900 disabled:bg-gray-100"
            />
          </div>

          <div>
            <label
              htmlFor="corte-rendimiento"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              % Rendimiento
            </label>
            <input
              id="corte-rendimiento"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              disabled={guardando}
              value={form.porcentaje_rendimiento}
              onChange={(e) => setField('porcentaje_rendimiento', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-gray-900 disabled:bg-gray-100"
            />
          </div>

          <div>
            <label
              htmlFor="corte-margen"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              % Margen
            </label>
            <input
              id="corte-margen"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              disabled={guardando}
              value={form.margen_porcentaje}
              onChange={(e) => setField('margen_porcentaje', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-gray-900 disabled:bg-gray-100"
            />
          </div>

          {mensajeError && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <p className="text-red-700 text-base">{mensajeError}</p>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onCancelar}
              disabled={guardando}
              className="flex-1 border border-gray-300 text-gray-700 rounded-lg px-4 py-3 text-base font-medium min-h-[44px] disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="flex-1 bg-gray-900 text-white rounded-lg px-4 py-3 text-base font-medium min-h-[44px] disabled:opacity-50"
            >
              {guardando ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

import { useState } from 'react'
import PorcentajesInput from './PorcentajesInput'

const DEFAULTS = {
  precio_kg: '',
  peso_media_res: '',
  porcentaje_carne: '80',
  porcentaje_hueso: '12',
  porcentaje_grasa: '8',
  precio_grasa: '0',
}

export default function CompraForm({ onSubmit, loading, serverError }) {
  const [form, setForm] = useState(DEFAULTS)
  const [localError, setLocalError] = useState(null)

  function setField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function validate() {
    if (!form.precio_kg || parseFloat(form.precio_kg) <= 0) {
      return 'El precio por kg es requerido y debe ser mayor a 0.'
    }
    if (!form.peso_media_res || parseFloat(form.peso_media_res) <= 0) {
      return 'El peso de la media res es requerido y debe ser mayor a 0.'
    }
    const suma =
      parseFloat(form.porcentaje_carne || 0) +
      parseFloat(form.porcentaje_hueso || 0) +
      parseFloat(form.porcentaje_grasa || 0)
    if (Math.abs(suma - 100) > 0.005) {
      return `Los porcentajes deben sumar 100. Actualmente suman ${parseFloat(suma.toFixed(2))}.`
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
    onSubmit({
      precio_kg: form.precio_kg,
      peso_media_res: form.peso_media_res,
      porcentaje_carne: form.porcentaje_carne,
      porcentaje_hueso: form.porcentaje_hueso,
      porcentaje_grasa: form.porcentaje_grasa,
      precio_grasa: form.precio_grasa,
    })
  }

  const error = localError || serverError

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label
          htmlFor="precio_kg"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Precio por kg ($)
        </label>
        <input
          id="precio_kg"
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          disabled={loading}
          value={form.precio_kg}
          onChange={(e) => setField('precio_kg', e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-gray-900 disabled:bg-gray-100"
        />
      </div>

      <div>
        <label
          htmlFor="peso_media_res"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Peso media res (kg)
        </label>
        <input
          id="peso_media_res"
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          disabled={loading}
          value={form.peso_media_res}
          onChange={(e) => setField('peso_media_res', e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-gray-900 disabled:bg-gray-100"
        />
      </div>

      <div>
        <p className="text-sm font-medium text-gray-700 mb-1">Rendimiento</p>
        <PorcentajesInput
          values={{
            carne: form.porcentaje_carne,
            hueso: form.porcentaje_hueso,
            grasa: form.porcentaje_grasa,
          }}
          onChange={(field, value) =>
            setField(`porcentaje_${field}`, value)
          }
          disabled={loading}
        />
      </div>

      <div>
        <label
          htmlFor="precio_grasa"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Precio grasa ($/kg)
        </label>
        <input
          id="precio_grasa"
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          disabled={loading}
          value={form.precio_grasa}
          onChange={(e) => setField('precio_grasa', e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-gray-900 disabled:bg-gray-100"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <p className="text-red-700 text-base">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-gray-900 text-white rounded-lg px-4 py-3 text-base font-medium min-h-[44px] disabled:opacity-50"
      >
        {loading ? 'Calculando...' : 'Calcular'}
      </button>
    </form>
  )
}

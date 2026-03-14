const CAMPOS = [
  { field: 'carne', label: '% Carne' },
  { field: 'hueso', label: '% Hueso' },
  { field: 'grasa', label: '% Grasa' },
]

export default function PorcentajesInput({ values, onChange, disabled }) {
  const total =
    parseFloat(values.carne || 0) +
    parseFloat(values.hueso || 0) +
    parseFloat(values.grasa || 0)
  const totalRedondeado = Math.round(total * 100) / 100
  const esCien = Math.abs(total - 100) < 0.005

  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {CAMPOS.map(({ field, label }) => (
          <div key={field}>
            <label className="block text-xs text-gray-500 mb-1">{label}</label>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              max="100"
              step="any"
              disabled={disabled}
              value={values[field]}
              onChange={(e) => onChange(field, e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-2 py-3 text-base text-center focus:outline-none focus:ring-2 focus:ring-gray-900 disabled:bg-gray-100"
            />
          </div>
        ))}
      </div>
      <p className={`text-sm mt-1 ${esCien ? 'text-green-600' : 'text-gray-500'}`}>
        Total: {totalRedondeado}
        {esCien ? ' ✓' : ' — deben sumar 100'}
      </p>
    </div>
  )
}

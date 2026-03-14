function fmt(str) {
  return Math.round(parseFloat(str))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

export default function CompraResumen({ compra }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
      <h2 className="text-base font-semibold text-gray-900 mb-3">Resumen</h2>
      <dl className="space-y-2">
        <Fila label="Costo total" valor={`$${fmt(compra.costo_total)}`} />
        <Fila label="Costo neto" valor={`$${fmt(compra.costo_neto)}`} />
        <Fila
          label="Kg vendibles"
          valor={`${parseFloat(compra.kg_carne_vendible).toFixed(1)} kg`}
        />
        <Fila
          label="Costo/kg vendible"
          valor={`$${fmt(compra.costo_por_kg_vendible)}/kg`}
        />
      </dl>
    </div>
  )
}

function Fila({ label, valor }) {
  return (
    <div className="flex justify-between items-baseline">
      <dt className="text-sm text-gray-600">{label}</dt>
      <dd className="text-base font-medium text-gray-900">{valor}</dd>
    </div>
  )
}

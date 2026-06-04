function fmt(str) {
  return Math.round(parseFloat(str))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

function numero(valor) {
  if (valor === null || valor === undefined || valor === '') return null
  const n = parseFloat(valor)
  return Number.isNaN(n) ? null : n
}

function fmtKg(valor) {
  const n = numero(valor)
  if (n === null) return '-'
  return `${n.toFixed(1)} kg`
}

function fmtPorcentaje(valor) {
  const n = numero(valor)
  if (n === null) return '-'
  return `${n.toFixed(1)}%`
}

export default function CompraResumen({ compra }) {
  const kgCortesTotal = numero(compra.kg_cortes_total)
  const diferenciaKg = numero(compra.diferencia_kg)
  const diferenciaPorcentaje = numero(compra.diferencia_porcentaje)
  const tieneMetricasDespiece =
    kgCortesTotal !== null ||
    diferenciaKg !== null ||
    diferenciaPorcentaje !== null
  const diferenciaRelevante =
    Math.abs(diferenciaKg ?? 0) >= 0.1 ||
    Math.abs(diferenciaPorcentaje ?? 0) >= 0.5

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
      <h2 className="text-base font-semibold text-gray-900 mb-3">Resumen</h2>
      <dl className="space-y-2">
        <Fila
          label="Peso media vaca"
          valor={fmtKg(compra.peso_media_res)}
        />
        <Fila label="Costo total" valor={`$${fmt(compra.costo_total)}`} />
        <Fila label="Costo neto" valor={`$${fmt(compra.costo_neto)}`} />
        <Fila
          label="Kg vendibles"
          valor={fmtKg(compra.kg_carne_vendible)}
        />
        {tieneMetricasDespiece && (
          <>
            <Fila label="Kg en cortes" valor={fmtKg(compra.kg_cortes_total)} />
            <Fila
              label="Diferencia"
              valor={`${fmtKg(compra.diferencia_kg)} / ${fmtPorcentaje(compra.diferencia_porcentaje)}`}
            />
          </>
        )}
        <Fila
          label="Costo/kg vendible"
          valor={`$${fmt(compra.costo_por_kg_vendible)}/kg`}
        />
      </dl>
      {diferenciaRelevante && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
          <p className="text-sm text-amber-900">
            Atención: los cortes asignados difieren de la carne vendible por{' '}
            <span className="font-semibold">{fmtKg(compra.diferencia_kg)}</span>
            {' / '}
            <span className="font-semibold">
              {fmtPorcentaje(compra.diferencia_porcentaje)}
            </span>
            .
          </p>
        </div>
      )}
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

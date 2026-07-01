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

export default function CompraResumen({ compra }) {
  const costoTotal = numero(compra.costo_total)
  const costoNeto = numero(compra.costo_neto)
  const mostrarCostoNeto =
    costoNeto !== null && costoTotal !== null && Math.abs(costoNeto - costoTotal) >= 1

  const diferenciaKg = numero(compra.diferencia_kg)
  const diferenciaRelevante = Math.abs(diferenciaKg ?? 0) >= 0.1

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
      <h2 className="text-base font-semibold text-gray-900 mb-3">Resumen</h2>
      <dl className="space-y-2">
        <Fila label="Peso media vaca" valor={fmtKg(compra.peso_media_res)} />
        <Fila label="Costo total" valor={`$${fmt(compra.costo_total)}`} />
        {mostrarCostoNeto && (
          <Fila label="Costo neto (c/grasa)" valor={`$${fmt(compra.costo_neto)}`} />
        )}
        <Fila label="Carne vendible" valor={fmtKg(compra.kg_carne_vendible)} />
        <Fila
          label="Costo/kg vendible"
          valor={`$${fmt(compra.costo_por_kg_vendible)}/kg`}
        />
      </dl>
      {diferenciaRelevante && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
          <p className="text-sm text-amber-900">
            {diferenciaKg > 0
              ? <>
                  Hay <span className="font-semibold">{fmtKg(diferenciaKg)}</span> de más
                  asignados en los cortes. Ajustá los kg de cada corte hasta llegar a{' '}
                  <span className="font-semibold">{fmtKg(compra.kg_carne_vendible)}</span> en total.
                </>
              : <>
                  Faltan <span className="font-semibold">{fmtKg(Math.abs(diferenciaKg))}</span> por
                  asignar. Ajustá los kg de los cortes hasta llegar a{' '}
                  <span className="font-semibold">{fmtKg(compra.kg_carne_vendible)}</span> en total.
                </>
            }
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

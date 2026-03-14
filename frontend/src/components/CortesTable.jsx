function fmt(str) {
  return Math.round(parseFloat(str))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

export default function CortesTable({ cortes }) {
  return (
    <div>
      <h2 className="text-base font-semibold text-gray-900 mb-3">Cortes</h2>
      <div className="space-y-3">
        {cortes.map((corte) => (
          <div
            key={corte.id}
            className="bg-white rounded-xl border border-gray-200 p-4"
          >
            <div className="flex justify-between items-baseline mb-2">
              <span className="text-base font-medium text-gray-900">
                {corte.nombre}
              </span>
              <span className="text-sm text-gray-500">
                {parseFloat(corte.kg_corte).toFixed(1)} kg
              </span>
            </div>
            <div className="flex justify-between text-sm text-gray-700">
              <span>
                Mín:{' '}
                <span className="font-medium">
                  ${fmt(corte.precio_minimo_kg)}/kg
                </span>
              </span>
              <span>
                Sug:{' '}
                <span className="font-medium">
                  ${fmt(corte.precio_sugerido_kg)}/kg
                </span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

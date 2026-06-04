const LABEL_ANIMAL = { vaca: 'Vaca', cerdo: 'Cerdo', pollo: 'Pollo' }

function fmtPorcentaje(valor) {
  const n = parseFloat(valor)
  if (Number.isNaN(n)) return '-'
  return `${n.toFixed(1).replace('.0', '')}%`
}

export default function CorteCard({ corte, onEditar, onDesactivar }) {
  const animal = LABEL_ANIMAL[corte.tipo_animal] ?? corte.tipo_animal
  const estaActivo = corte.activo ?? corte.is_active ?? corte.estado !== 'inactivo'

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 min-h-[176px] flex flex-col">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-base font-medium text-gray-900 leading-snug">{corte.nombre}</p>
          {animal && (
            <p className="text-sm text-gray-500 mt-0.5">{animal}</p>
          )}
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
            estaActivo
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-gray-100 text-gray-500'
          }`}
        >
          {estaActivo ? 'Activo' : 'Inactivo'}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm mb-4">
        <div>
          <p className="text-gray-500">Rendimiento</p>
          <p className="font-medium text-gray-900">
            {fmtPorcentaje(corte.porcentaje_rendimiento)}
          </p>
        </div>
        <div>
          <p className="text-gray-500">Margen</p>
          <p className="font-medium text-gray-900">
            {fmtPorcentaje(corte.margen_porcentaje)}
          </p>
        </div>
      </div>
      <div className="flex gap-2 mt-auto">
        <button
          onClick={() => onEditar(corte)}
          className="flex-1 border border-gray-300 text-gray-700 rounded-lg px-3 py-2 text-base font-medium min-h-[44px]"
        >
          Editar
        </button>
        <button
          onClick={() => onDesactivar(corte)}
          className="flex-1 border border-red-200 text-red-600 rounded-lg px-3 py-2 text-base font-medium min-h-[44px]"
        >
          Desactivar
        </button>
      </div>
    </div>
  )
}

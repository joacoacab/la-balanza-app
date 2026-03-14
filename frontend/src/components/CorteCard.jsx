export default function CorteCard({ corte, onEditar, onDesactivar }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-base font-medium text-gray-900 mb-1">{corte.nombre}</p>
      <p className="text-sm text-gray-500 mb-3">
        Rend: {corte.porcentaje_rendimiento}% · Margen: {corte.margen_porcentaje}%
      </p>
      <div className="flex gap-2">
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

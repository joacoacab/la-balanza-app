export default function ConfirmDialog({ nombre, onConfirmar, onCancelar, guardando }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center px-6 z-50">
      <div className="bg-white rounded-xl w-full max-w-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          ¿Desactivar "{nombre}"?
        </h2>
        <p className="text-base text-gray-600 mb-6">
          El corte dejará de aparecer en nuevas compras. Las compras anteriores
          no se modifican.
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={onConfirmar}
            disabled={guardando}
            className="w-full bg-red-600 text-white rounded-lg px-4 py-3 text-base font-medium min-h-[44px] disabled:opacity-50"
          >
            {guardando ? 'Desactivando...' : 'Sí, desactivar'}
          </button>
          <button
            onClick={onCancelar}
            disabled={guardando}
            className="w-full border border-gray-300 text-gray-700 rounded-lg px-4 py-3 text-base font-medium min-h-[44px] disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

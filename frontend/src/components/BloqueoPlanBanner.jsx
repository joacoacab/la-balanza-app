import { useNavigate } from 'react-router-dom'

export default function BloqueoPlanBanner({ mensaje }) {
  const navigate = useNavigate()

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3 mb-4">
      <span className="text-yellow-600 mt-0.5 text-base">⚠</span>
      <p className="flex-1 text-sm text-yellow-800">{mensaje}</p>
      <button
        onClick={() => navigate('/planes')}
        className="text-sm font-medium text-yellow-700 underline whitespace-nowrap"
      >
        Ver planes
      </button>
    </div>
  )
}

import { useState, useEffect, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { Beef, Ham, Bird, Printer } from 'lucide-react'
import { api } from '../api/client'
import { AuthContext } from '../auth/AuthContext'
import CompraForm from '../components/CompraForm'
import CompraResumen from '../components/CompraResumen'
import CortesTable from '../components/CortesTable'
import BloqueoPlanBanner from '../components/BloqueoPlanBanner'
import { generarListaPreciosPdf } from '../utils/generarListaPreciosPdf'

const ICON_ANIMAL = { res: Beef, cerdo: Ham, pollo: Bird }
const LABEL_ANIMAL = { res: 'Res', cerdo: 'Cerdo', pollo: 'Pollo' }
const ORDEN_ANIMAL = ['res', 'cerdo', 'pollo']

function VolverBtn() {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => navigate(-1)}
      className="text-base text-gray-700 font-medium mb-6 flex items-center gap-1 min-h-[44px]"
    >
      ← Volver
    </button>
  )
}

function AnimalSelector({ animales, seleccionado, onSeleccionar }) {
  if (animales.length <= 1) return null
  return (
    <div className="flex gap-3 mb-6">
      {animales.map((animal) => {
        const Icon = ICON_ANIMAL[animal]
        const activo = seleccionado === animal
        return (
          <button
            key={animal}
            type="button"
            onClick={() => onSeleccionar(animal)}
            className={`flex-1 flex flex-col items-center gap-2 py-3 rounded-xl border-2 transition-colors ${
              activo
                ? 'border-gray-900 bg-gray-900 text-white'
                : 'border-gray-200 bg-white text-gray-500'
            }`}
          >
            <Icon size={24} />
            <span className="text-sm font-medium">{LABEL_ANIMAL[animal]}</span>
          </button>
        )
      })}
    </div>
  )
}

export default function NuevaCompra() {
  const navigate = useNavigate()
  const { user } = useContext(AuthContext)

  const [animalesDisponibles, setAnimalesDisponibles] = useState(null) // null = cargando
  const [tipoAnimal, setTipoAnimal] = useState('res')
  const [status, setStatus] = useState('idle') // idle | loading | result
  const [compra, setCompra] = useState(null)
  const [error, setError] = useState(null)
  const [bloqueo, setBloqueo] = useState(null)

  useEffect(() => {
    api.cortes
      .listar()
      .then((cortes) => {
        const animales = ORDEN_ANIMAL.filter((a) => cortes.some((c) => c.tipo_animal === a))
        setAnimalesDisponibles(animales.length > 0 ? animales : null)
        if (animales.length > 0) setTipoAnimal(animales[0])
      })
      .catch((err) => {
        if (err.status === 401) navigate('/')
        else setAnimalesDisponibles([])
      })
  }, [navigate])

  function handleCambiarAnimal(animal) {
    setTipoAnimal(animal)
    setError(null)
    setBloqueo(null)
  }

  async function handleSubmit(formData) {
    setStatus('loading')
    setError(null)
    try {
      const fecha = new Date().toISOString().slice(0, 10)
      const creada = await api.compras.crear({ fecha, tipo_animal: tipoAnimal, ...formData })
      const detalle = await api.compras.detalle(creada.id)
      setCompra(detalle)
      setStatus('result')
    } catch (err) {
      if (err.status === 401) {
        navigate('/')
        return
      }
      if (err.status === 403 && err.data?.error === 'plan_insuficiente') {
        setBloqueo(err.data.mensaje)
      } else if (err.status === 400) {
        const msgs = err.data?.non_field_errors
        setError(msgs ? msgs[0] : 'Error en los datos ingresados.')
      } else {
        setError('Error de conexión. Verificá tu red e intentá de nuevo.')
      }
      setStatus('idle')
    }
  }

  function handleNuevaCompra() {
    setCompra(null)
    setError(null)
    setStatus('idle')
  }

  if (animalesDisponibles === null) {
    return (
      <div className="px-6 py-8">
        <div className="max-w-sm mx-auto">
          <VolverBtn />
          <p className="text-gray-500 text-base">Cargando...</p>
        </div>
      </div>
    )
  }

  if (animalesDisponibles.length === 0) {
    return (
      <div className="px-6 py-8">
        <div className="max-w-sm mx-auto">
          <VolverBtn />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Sin cortes configurados
          </h2>
          <p className="text-gray-600 text-base">
            Todavía no configuraste ningún corte. Los cortes determinan los
            precios de venta.
          </p>
        </div>
      </div>
    )
  }

  if (status === 'result') {
    return (
      <div className="px-6 py-8">
        <div className="max-w-sm mx-auto">
          <div className="flex gap-3 mb-6">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex-1 border border-gray-300 text-gray-700 rounded-lg px-4 py-3 text-base font-medium min-h-[44px]"
            >
              ← Menú
            </button>
            <button
              onClick={handleNuevaCompra}
              className="flex-1 bg-gray-900 text-white rounded-lg px-4 py-3 text-base font-medium min-h-[44px]"
            >
              Nueva compra
            </button>
          </div>
          <CompraResumen compra={compra} />
          <CortesTable cortes={compra.cortes} />
          <button
            onClick={() => generarListaPreciosPdf({ nombreCarniceria: user?.username ?? '', compra })}
            className="w-full mt-4 border border-gray-300 text-gray-700 rounded-lg px-4 py-3 text-base font-medium min-h-[44px] flex items-center justify-center gap-2"
          >
            <Printer size={18} />
            Imprimir lista de precios
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="px-6 py-8">
      <div className="max-w-sm mx-auto">
        <VolverBtn />
        <h2 className="text-xl font-semibold text-gray-900 mb-6">
          Nueva compra
        </h2>
        <AnimalSelector
          animales={animalesDisponibles}
          seleccionado={tipoAnimal}
          onSeleccionar={handleCambiarAnimal}
        />
        {bloqueo && <BloqueoPlanBanner mensaje={bloqueo} />}
        <CompraForm
          key={tipoAnimal}
          tipoAnimal={tipoAnimal}
          onSubmit={handleSubmit}
          loading={status === 'loading'}
          serverError={error}
        />
      </div>
    </div>
  )
}

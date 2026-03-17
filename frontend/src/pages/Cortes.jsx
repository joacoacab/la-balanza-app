import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Beef, Ham, Bird } from 'lucide-react'
import { api } from '../api/client'
import CorteCard from '../components/CorteCard'
import CorteFormModal from '../components/CorteFormModal'
import ConfirmDialog from '../components/ConfirmDialog'

const ORDEN_ANIMAL = ['res', 'cerdo', 'pollo']
const LABEL_ANIMAL = { res: 'Res', cerdo: 'Cerdo', pollo: 'Pollo' }
const ICON_ANIMAL = { res: Beef, cerdo: Ham, pollo: Bird }

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

export default function Cortes() {
  const navigate = useNavigate()

  const [cortes, setCortes] = useState(null)
  const [errorCarga, setErrorCarga] = useState(null)
  const [tabActivo, setTabActivo] = useState(null)
  const [modal, setModal] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [errorModal, setErrorModal] = useState(null)
  const [cargandoAnimal, setCargandoAnimal] = useState(null)
  const [errorAnimal, setErrorAnimal] = useState(null)

  const cargarCortes = useCallback(() => {
    setErrorCarga(null)
    setCortes(null)
    api.cortes
      .listar()
      .then((data) => {
        setCortes(data)
        setTabActivo((prev) => {
          const animalesActivos = ORDEN_ANIMAL.filter((a) => data.some((c) => c.tipo_animal === a))
          if (prev && animalesActivos.includes(prev)) return prev
          return animalesActivos[0] ?? 'res'
        })
      })
      .catch((err) => {
        if (err.status === 401) navigate('/')
        else setErrorCarga('Error al cargar cortes. Verificá tu red.')
      })
  }, [navigate])

  useEffect(() => {
    cargarCortes()
  }, [cargarCortes])

  function abrirAgregar() {
    setErrorModal(null)
    setModal({ tipo: 'agregar' })
  }

  function abrirEditar(corte) {
    setErrorModal(null)
    setModal({ tipo: 'editar', corte })
  }

  function abrirConfirmar(corte) {
    setErrorModal(null)
    setModal({ tipo: 'confirmar', corte })
  }

  function cerrarModal() {
    setModal(null)
    setErrorModal(null)
  }

  async function handleGuardar(datos) {
    setGuardando(true)
    setErrorModal(null)
    try {
      if (modal.tipo === 'agregar') {
        const nuevo = await api.cortes.crear({ ...datos, tipo_animal: tabActivo })
        setCortes((prev) => [nuevo, ...prev])
      } else {
        const actualizado = await api.cortes.editar(modal.corte.id, datos)
        setCortes((prev) =>
          prev.map((c) => (c.id === actualizado.id ? actualizado : c))
        )
      }
      cerrarModal()
    } catch (err) {
      if (err.status === 401) { navigate('/'); return }
      if (err.status === 404) { cargarCortes(); cerrarModal(); return }
      if (err.status === 400 && err.data?.nombre) {
        setErrorModal('Ya existe un corte con ese nombre.')
      } else if (err.status === 400) {
        setErrorModal('Error en los datos ingresados.')
      } else {
        setErrorModal('Error de conexión. Intentá de nuevo.')
      }
    } finally {
      setGuardando(false)
    }
  }

  async function handleDesactivar() {
    setGuardando(true)
    setErrorModal(null)
    try {
      await api.cortes.desactivar(modal.corte.id)
      setCortes((prev) => prev.filter((c) => c.id !== modal.corte.id))
      cerrarModal()
    } catch (err) {
      if (err.status === 401) { navigate('/'); return }
      if (err.status === 404) {
        setCortes((prev) => prev.filter((c) => c.id !== modal.corte.id))
        cerrarModal()
        return
      }
      setErrorModal('Error de conexión. Intentá de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  async function handleAgregarAnimal(animal) {
    setCargandoAnimal(animal)
    setErrorAnimal(null)
    try {
      await api.cortes.cargarPlantilla(animal)
      cargarCortes()
    } catch {
      setErrorAnimal(`Error al cargar cortes de ${LABEL_ANIMAL[animal]}. Intentá de nuevo.`)
    } finally {
      setCargandoAnimal(null)
    }
  }

  const animalesActivos = cortes
    ? ORDEN_ANIMAL.filter((a) => cortes.some((c) => c.tipo_animal === a))
    : []

  const animalesFaltantes = cortes
    ? ORDEN_ANIMAL.filter((a) => !cortes.some((c) => c.tipo_animal === a))
    : []

  const cortesDeTrab = cortes?.filter((c) => c.tipo_animal === tabActivo) ?? []

  return (
    <div className="px-6 py-8">
      <div className="max-w-sm mx-auto">
        <VolverBtn />
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Mis cortes</h2>

        {/* Cargando */}
        {cortes === null && !errorCarga && (
          <p className="text-gray-500 text-base">Cargando...</p>
        )}

        {/* Error de carga */}
        {errorCarga && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-red-700 text-base mb-3">{errorCarga}</p>
            <button
              onClick={cargarCortes}
              className="w-full border border-red-300 text-red-700 rounded-lg px-4 py-3 text-base font-medium min-h-[44px]"
            >
              Reintentar
            </button>
          </div>
        )}

        {cortes !== null && (
          <>
            {/* Tabs por animal */}
            {animalesActivos.length > 1 && (
              <div className="flex gap-1 mb-6 border-b border-gray-200">
                {animalesActivos.map((animal) => {
                  const Icon = ICON_ANIMAL[animal]
                  return (
                    <button
                      key={animal}
                      onClick={() => setTabActivo(animal)}
                      className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                        tabActivo === animal
                          ? 'border-gray-900 text-gray-900'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <Icon size={15} />
                      {LABEL_ANIMAL[animal]}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Lista de cortes del tab activo */}
            {cortesDeTrab.length === 0 && (
              <p className="text-gray-500 text-base mb-6">
                Todavía no agregaste ningún corte.
              </p>
            )}

            <div className="space-y-3 mb-4">
              {cortesDeTrab.map((corte) => (
                <CorteCard
                  key={corte.id}
                  corte={corte}
                  onEditar={abrirEditar}
                  onDesactivar={abrirConfirmar}
                />
              ))}
            </div>

            <button
              onClick={abrirAgregar}
              className="w-full border border-gray-300 text-gray-700 rounded-lg px-4 py-3 text-base font-medium min-h-[44px]"
            >
              + Agregar corte
            </button>

            {/* Sección agregar animal */}
            {animalesFaltantes.length > 0 && (
              <div className="mt-8 pt-6 border-t border-gray-200">
                <p className="text-sm font-medium text-gray-700 mb-3">Agregar animal</p>
                <div className="flex gap-3">
                  {animalesFaltantes.map((animal) => {
                    const Icon = ICON_ANIMAL[animal]
                    return (
                      <button
                        key={animal}
                        type="button"
                        disabled={cargandoAnimal !== null}
                        onClick={() => handleAgregarAnimal(animal)}
                        className="flex-1 flex flex-col items-center gap-2 py-3 rounded-xl border-2 border-gray-200 bg-white text-gray-500 hover:border-gray-400 transition-colors disabled:opacity-50"
                      >
                        <Icon size={22} />
                        <span className="text-sm font-medium">
                          {cargandoAnimal === animal ? 'Cargando...' : LABEL_ANIMAL[animal]}
                        </span>
                      </button>
                    )
                  })}
                </div>
                {errorAnimal && (
                  <p className="text-red-600 text-sm mt-3">{errorAnimal}</p>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modales */}
      {(modal?.tipo === 'agregar' || modal?.tipo === 'editar') && (
        <CorteFormModal
          corte={modal.tipo === 'editar' ? modal.corte : null}
          onGuardar={handleGuardar}
          onCancelar={cerrarModal}
          guardando={guardando}
          error={errorModal}
        />
      )}

      {modal?.tipo === 'confirmar' && (
        <ConfirmDialog
          nombre={modal.corte.nombre}
          onConfirmar={handleDesactivar}
          onCancelar={cerrarModal}
          guardando={guardando}
        />
      )}
    </div>
  )
}

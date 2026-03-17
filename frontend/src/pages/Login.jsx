import { useState, useEffect, useRef, useContext } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { AuthContext } from '../auth/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const { loginConGoogle } = useContext(AuthContext)
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const googleBtnRef = useRef(null)
  const googleCallbackRef = useRef(null)

  async function handleGoogleCallback(response) {
    setError(null)
    setLoading(true)
    try {
      const es_primera_vez = await loginConGoogle(response.credential)
      navigate(es_primera_vez ? '/bienvenida' : '/dashboard', {
        state: { fromAuth: true },
      })
    } catch {
      setError('No se pudo iniciar sesión con Google.')
    } finally {
      setLoading(false)
    }
  }

  googleCallbackRef.current = handleGoogleCallback

  useEffect(() => {
    function initGoogle() {
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: (resp) => googleCallbackRef.current(resp),
      })
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        locale: 'es',
        width: googleBtnRef.current?.offsetWidth || 360,
      })
    }

    if (window.google) {
      initGoogle()
    } else {
      window.onGoogleLibraryLoad = initGoogle
    }
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(username, password)
      navigate('/dashboard')
    } catch {
      setError('Usuario o contraseña incorrectos.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center px-6 py-12">
      <div className="max-w-sm w-full mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">La Balanza</h1>
        <p className="text-gray-500 mb-8">Ingresá a tu cuenta</p>

        <div ref={googleBtnRef} className="w-full mb-4" />

        <div className="flex items-center gap-3 mb-4">
          <hr className="flex-1 border-gray-300" />
          <span className="text-sm text-gray-400">o</span>
          <hr className="flex-1 border-gray-300" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
              Usuario
            </label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>

          {error && (
            <p className="text-red-600 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gray-900 text-white rounded-lg px-4 py-3 text-base font-medium min-h-[44px] disabled:opacity-50"
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          ¿Primera vez?{' '}
          <Link to="/registro" className="text-gray-900 underline">
            Registrarse
          </Link>
        </p>
      </div>
    </div>
  )
}

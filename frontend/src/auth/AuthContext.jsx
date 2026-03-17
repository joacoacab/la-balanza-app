import { createContext, useState } from 'react'
import { api, setToken, clearToken } from '../api/client'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)

  async function registrar(datos) {
    const { token, es_primera_vez } = await api.auth.registro(datos)
    setToken(token)
    setUser({ username: datos.username })
    return es_primera_vez
  }

  async function login(username, password) {
    const { token } = await api.auth.login(username, password)
    setToken(token)
    setUser({ username })
  }

  async function loginConGoogle(idToken) {
    const { token, username, es_primera_vez } = await api.auth.google(idToken)
    setToken(token)
    setUser({ username })
    return es_primera_vez
  }

  async function logout() {
    await api.auth.logout().catch(() => {})
    clearToken()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, registrar, login, logout, loginConGoogle }}>
      {children}
    </AuthContext.Provider>
  )
}

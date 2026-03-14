import { createContext, useState } from 'react'
import { api, setToken, clearToken } from '../api/client'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)

  async function login(username, password) {
    const { token } = await api.auth.login(username, password)
    setToken(token)
    setUser({ username })
  }

  async function logout() {
    await api.auth.logout().catch(() => {})
    clearToken()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

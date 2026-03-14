// El token vive solo en memoria. Reload = logout (ver deuda técnica en spec 05).
let token = null

export function setToken(t) {
  token = t
}

export function clearToken() {
  token = null
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  if (token) {
    headers['Authorization'] = `Token ${token}`
  }

  const res = await fetch(path, { ...options, headers })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    const err = new Error('API error')
    err.status = res.status
    err.data = data
    throw err
  }

  if (res.status === 204) return null
  return res.json()
}

export const api = {
  auth: {
    login: (username, password) =>
      request('/api/v1/auth/login/', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      }),
    logout: () =>
      request('/api/v1/auth/logout/', { method: 'POST' }),
  },
}

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './auth/useAuth'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import NuevaCompra from './pages/NuevaCompra'
import Cortes from './pages/Cortes'

function PrivateRoute({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/nueva-compra"
          element={
            <PrivateRoute>
              <NuevaCompra />
            </PrivateRoute>
          }
        />
        <Route
          path="/cortes"
          element={
            <PrivateRoute>
              <Cortes />
            </PrivateRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { api } from './api'
import AuthPage from './pages/AuthPage'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import Categories from './pages/Categories'
import Stock from './pages/Stock'
import { ToastProvider } from './components/Toast'

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('smartstock_token'))
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(Boolean(localStorage.getItem('smartstock_token')))

  useEffect(() => {
    if (!token) { setChecking(false); setUser(null); return }
    api('/api/auth/me')
      .then((data) => setUser(data.user || data))
      .catch(() => { localStorage.removeItem('smartstock_token'); setToken(null); setUser(null) })
      .finally(() => setChecking(false))
  }, [token])

  function onLogin(newToken, userData) {
    localStorage.setItem('smartstock_token', newToken)
    setToken(newToken)
    setUser(userData || null)
  }
  function onLogout() {
    localStorage.removeItem('smartstock_token')
    setToken(null)
    setUser(null)
  }

  if (checking) return <div className="loading-screen"><div className="spinner"/><p>Loading SmartStock…</p></div>
  if (!token) return <ToastProvider><AuthPage onLogin={onLogin} /></ToastProvider>
  return <ToastProvider><Routes><Route element={<Layout user={user} onLogout={onLogout} />}>
    <Route index element={<Dashboard />} />
    <Route path="products" element={<Products />} />
    <Route path="categories" element={<Categories />} />
    <Route path="stock" element={<Stock />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Route></Routes></ToastProvider>
}

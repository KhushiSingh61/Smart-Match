import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { authAPI } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('smartmatch_user')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })
  const [loading, setLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem('smartmatch_token')
    if (!token) {
      setUser(null)
      setLoading(false)
      return
    }
    try {
      const { data } = await authAPI.me()
      setUser(data)
      localStorage.setItem('smartmatch_user', JSON.stringify(data))
    } catch {
      localStorage.removeItem('smartmatch_token')
      localStorage.removeItem('smartmatch_user')
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshUser()
  }, [refreshUser])

  const login = async (email, password) => {
    const { data } = await authAPI.login({ email, password })
    localStorage.setItem('smartmatch_token', data.access_token)
    localStorage.setItem('smartmatch_user', JSON.stringify(data.user))
    setUser(data.user)
    return data.user
  }

  const register = async (payload) => {
    const { data } = await authAPI.register(payload)
    localStorage.setItem('smartmatch_token', data.access_token)
    localStorage.setItem('smartmatch_user', JSON.stringify(data.user))
    setUser(data.user)
    return data.user
  }

  const logout = () => {
    localStorage.removeItem('smartmatch_token')
    localStorage.removeItem('smartmatch_user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return ctx
}

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { api } from '@/lib/api'
import { Shield } from 'lucide-react'

export default function LoginPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [email, setEmail] = useState('admin@msp.local')
  const [password, setPassword] = useState('admin123')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [requires2FA, setRequires2FA] = useState(false)
  const [userId2FA, setUserId2FA] = useState('')
  const [twoFAToken, setTwoFAToken] = useState('')
  const [twoFAError, setTwoFAError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { data } = await api.post('/auth/login', { email, password })
      if (data.requires2FA) {
        setRequires2FA(true)
        setUserId2FA(data.userId)
      } else {
        setAuth(data.user, data.token)
        navigate('/dashboard')
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerify2FA(e: React.FormEvent) {
    e.preventDefault()
    try {
      const res = await api.post('/auth/2fa/verify', { userId: userId2FA, token: twoFAToken })
      setAuth(res.data.user, res.data.token)
      navigate('/dashboard')
    } catch (e: any) {
      setTwoFAError(e.response?.data?.message || 'Invalid code')
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">M</span>
            </div>
            <span className="text-2xl font-bold text-slate-900">MSP System</span>
          </div>
          <p className="text-slate-500 text-sm">Sign in to your account</p>
        </div>

        <div className="card p-8">
          {requires2FA ? (
            <form onSubmit={handleVerify2FA} className="space-y-4">
              <div className="text-center">
                <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Shield size={22} className="text-primary-600" />
                </div>
                <h2 className="text-lg font-bold text-slate-900">Two-Factor Authentication</h2>
                <p className="text-sm text-slate-500 mt-1">Enter the 6-digit code from your authenticator app</p>
              </div>
              <input
                className="input text-center text-2xl font-mono tracking-widest"
                placeholder="000 000"
                maxLength={6}
                value={twoFAToken}
                onChange={e => setTwoFAToken(e.target.value.replace(/\D/g, ''))}
                autoFocus
              />
              {twoFAError && <p className="text-sm text-red-600 text-center">{twoFAError}</p>}
              <button type="submit" disabled={twoFAToken.length !== 6} className="btn-primary w-full disabled:opacity-50">
                Verify
              </button>
              <button type="button" onClick={() => setRequires2FA(false)} className="w-full text-sm text-slate-500 hover:text-slate-700">
                ← Back to login
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  className="input"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@msp.local"
                  required
                />
              </div>
              <div>
                <label className="label">Password</label>
                <input
                  type="password"
                  className="input"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
              {error && (
                <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg border border-red-100">
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full justify-center flex items-center gap-2 py-2.5"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          )}
          <div className="mt-4 p-3 bg-slate-50 rounded-lg">
            <p className="text-xs text-slate-500 text-center">
              Default: <strong>admin@msp.local</strong> / <strong>admin123</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

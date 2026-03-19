import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { api } from '@/lib/api'
import { Shield, QrCode } from 'lucide-react'
import clsx from 'clsx'

export default function LoginPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [email, setEmail] = useState('admin@msp.local')
  const [password, setPassword] = useState('admin123')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Standard 2FA verify
  const [requires2FA, setRequires2FA] = useState(false)
  const [userId2FA, setUserId2FA] = useState('')
  const [twoFAToken, setTwoFAToken] = useState('')
  const [twoFAError, setTwoFAError] = useState('')

  // MFA setup (enforced by admin)
  const [mfaSetupStage, setMfaSetupStage] = useState<'idle' | 'qr' | 'verify'>('idle')
  const [setupToken, setSetupToken] = useState('')
  const [setupUserId, setSetupUserId] = useState('')
  const [setupUser, setSetupUser] = useState<any>(null)
  const [qrData, setQrData] = useState<{ secret: string; qrCodeDataUrl: string } | null>(null)
  const [setupCode, setSetupCode] = useState('')
  const [setupError, setSetupError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { data } = await api.post('/auth/login', { email, password })
      if (data.requires2FA) {
        setRequires2FA(true)
        setUserId2FA(data.userId)
      } else if (data.requiresMfaSetup) {
        // Admin has enforced MFA — begin setup flow
        setSetupToken(data.setupToken)
        setSetupUserId(data.user.id)
        setSetupUser(data.user)
        // Call setup2FA with the setup token
        const setupRes = await api.get('/auth/2fa/setup', {
          headers: { Authorization: `Bearer ${data.setupToken}` },
        })
        setQrData(setupRes.data)
        setMfaSetupStage('qr')
      } else {
        setAuth(data.user, data.token)
        navigate('/dashboard')
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Login failed')
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

  async function handleMfaSetupVerify(e: React.FormEvent) {
    e.preventDefault()
    setSetupError('')
    try {
      const res = await api.post('/auth/2fa/enable', { token: setupCode }, {
        headers: { Authorization: `Bearer ${setupToken}` },
      })
      // enable2FA now returns full tokens
      setAuth(res.data.user, res.data.token)
      navigate('/dashboard')
    } catch (err: any) {
      setSetupError(err.response?.data?.message || 'Invalid code. Try again.')
    }
  }

  // MFA setup — QR code stage
  if (mfaSetupStage === 'qr' && qrData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-2">
              <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">M</span>
              </div>
              <span className="text-2xl font-bold text-slate-900">MSP System</span>
            </div>
          </div>
          <div className="card p-8">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <QrCode size={22} className="text-primary-600" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Set Up Two-Factor Authentication</h2>
              <p className="text-sm text-slate-500 mt-1">
                Your administrator requires MFA. Scan the QR code below with your authenticator app.
              </p>
            </div>
            <div className="flex justify-center mb-6">
              <img src={qrData.qrCodeDataUrl} alt="QR Code" className="w-48 h-48 rounded-xl border border-slate-200" />
            </div>
            <div className="bg-slate-50 rounded-xl px-4 py-3 mb-6 text-center">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Manual code</p>
              <p className="text-xs font-mono text-slate-700 break-all">{qrData.secret}</p>
            </div>
            <button onClick={() => setMfaSetupStage('verify')} className="btn-primary w-full py-2.5">
              I've scanned the code →
            </button>
          </div>
        </div>
      </div>
    )
  }

  // MFA setup — verify code stage
  if (mfaSetupStage === 'verify') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-2">
              <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">M</span>
              </div>
              <span className="text-2xl font-bold text-slate-900">MSP System</span>
            </div>
          </div>
          <div className="card p-8">
            <form onSubmit={handleMfaSetupVerify} className="space-y-4">
              <div className="text-center">
                <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Shield size={22} className="text-primary-600" />
                </div>
                <h2 className="text-lg font-bold text-slate-900">Confirm Your Authenticator</h2>
                <p className="text-sm text-slate-500 mt-1">Enter the 6-digit code from your authenticator app to complete setup</p>
              </div>
              <input
                className="input text-center text-2xl font-mono tracking-widest"
                placeholder="000 000"
                maxLength={6}
                value={setupCode}
                onChange={e => setSetupCode(e.target.value.replace(/\D/g, ''))}
                autoFocus
              />
              {setupError && <p className="text-sm text-red-600 text-center">{setupError}</p>}
              <button type="submit" disabled={setupCode.length !== 6} className="btn-primary w-full disabled:opacity-50">
                Verify &amp; Complete Setup
              </button>
              <button type="button" onClick={() => setMfaSetupStage('qr')} className="w-full text-sm text-slate-500 hover:text-slate-700">
                ← Back to QR code
              </button>
            </form>
          </div>
        </div>
      </div>
    )
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
                <div className={clsx('text-sm px-3 py-2 rounded-lg border',
                  error.includes('maintenance')
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-red-50 text-red-600 border-red-100'
                )}>
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

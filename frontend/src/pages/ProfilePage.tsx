import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { api } from '@/lib/api'
import { Shield, CheckCircle2, AlertTriangle } from 'lucide-react'

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore()
  const [profileForm, setProfileForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: '',
  })
  const [saved, setSaved] = useState(false)

  // 2FA state — seeded from API, not stale JWT store
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('')
  const [setupStep, setSetupStep] = useState<'idle' | 'scan' | 'verify'>('idle')
  const [verifyToken, setVerifyToken] = useState('')
  const [disableToken, setDisableToken] = useState('')
  const [showDisable, setShowDisable] = useState(false)
  const [twoFAEnabled, setTwoFAEnabled] = useState(user?.twoFactorEnabled || false)
  const [twoFAError, setTwoFAError] = useState('')

  // Fetch fresh user data from API on mount so twoFactorEnabled is accurate
  useEffect(() => {
    if (!user?.id) return
    api.get(`/users/${user.id}`).then(res => {
      const fresh = res.data
      setTwoFAEnabled(!!fresh.twoFactorEnabled)
      updateUser({ twoFactorEnabled: !!fresh.twoFactorEnabled })
      setProfileForm(f => ({
        ...f,
        firstName: fresh.firstName || f.firstName,
        lastName: fresh.lastName || f.lastName,
        email: fresh.email || f.email,
        phone: fresh.phone || '',
      }))
    }).catch(() => {})
  }, [user?.id])

  async function saveProfile() {
    const res = await api.patch(`/users/${user!.id}`, profileForm)
    updateUser(res.data)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function startSetup2FA() {
    const res = await api.post('/auth/2fa/setup')
    setQrCodeDataUrl(res.data.qrCodeDataUrl)
    setSetupStep('scan')
  }

  async function enable2FA() {
    try {
      await api.post('/auth/2fa/enable', { token: verifyToken })
      setTwoFAEnabled(true)
      updateUser({ twoFactorEnabled: true })
      setSetupStep('idle')
      setVerifyToken('')
      setTwoFAError('')
    } catch (e: any) {
      setTwoFAError(e.response?.data?.message || 'Invalid code')
    }
  }

  async function disable2FA() {
    try {
      await api.post('/auth/2fa/disable', { token: disableToken })
      setTwoFAEnabled(false)
      updateUser({ twoFactorEnabled: false })
      setShowDisable(false)
      setDisableToken('')
      setTwoFAError('')
    } catch (e: any) {
      setTwoFAError(e.response?.data?.message || 'Invalid code')
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>

      {/* Profile form */}
      <div className="card p-6 space-y-4">
        <h2 className="text-base font-semibold text-slate-800">Personal Information</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">First Name</label>
            <input className="input" value={profileForm.firstName} onChange={e => setProfileForm(f => ({ ...f, firstName: e.target.value }))} />
          </div>
          <div>
            <label className="label">Last Name</label>
            <input className="input" value={profileForm.lastName} onChange={e => setProfileForm(f => ({ ...f, lastName: e.target.value }))} />
          </div>
        </div>
        <div>
          <label className="label">Email</label>
          <input className="input" type="email" value={profileForm.email} onChange={e => setProfileForm(f => ({ ...f, email: e.target.value }))} />
        </div>
        <div>
          <label className="label">Phone</label>
          <input className="input" value={profileForm.phone} onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))} />
        </div>
        <div className="flex items-center gap-3">
          <button onClick={saveProfile} className="btn-primary text-sm">Save Changes</button>
          {saved && <span className="text-sm text-green-600 font-medium">✓ Saved</span>}
        </div>
      </div>

      {/* 2FA */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center ${twoFAEnabled ? 'bg-green-100' : 'bg-slate-100'}`}>
              <Shield size={18} className={twoFAEnabled ? 'text-green-600' : 'text-slate-400'} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-800">Two-Factor Authentication</h2>
              <p className="text-xs text-slate-500">Add an extra layer of security to your account</p>
            </div>
          </div>
          {twoFAEnabled
            ? <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium"><CheckCircle2 size={14} /> Enabled</span>
            : <span className="text-sm text-slate-400">Not enabled</span>}
        </div>

        {!twoFAEnabled && setupStep === 'idle' && (
          <button onClick={startSetup2FA} className="btn-primary text-sm w-fit">Enable 2FA</button>
        )}

        {setupStep === 'scan' && (
          <div className="space-y-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <p className="text-sm text-slate-700 font-medium">1. Scan this QR code with your authenticator app</p>
            {qrCodeDataUrl && <img src={qrCodeDataUrl} alt="2FA QR Code" className="w-40 h-40 rounded-lg" />}
            <p className="text-sm text-slate-700 font-medium">2. Enter the 6-digit code from your app</p>
            <div className="flex gap-3">
              <input
                className="input w-40 text-center text-lg font-mono tracking-widest"
                placeholder="000000"
                maxLength={6}
                value={verifyToken}
                onChange={e => setVerifyToken(e.target.value.replace(/\D/g, ''))}
              />
              <button onClick={enable2FA} disabled={verifyToken.length !== 6} className="btn-primary text-sm disabled:opacity-50">
                Verify & Enable
              </button>
              <button onClick={() => setSetupStep('idle')} className="btn-secondary text-sm">Cancel</button>
            </div>
            {twoFAError && <p className="text-sm text-red-600">{twoFAError}</p>}
          </div>
        )}

        {twoFAEnabled && !showDisable && (
          <button onClick={() => setShowDisable(true)} className="text-sm text-red-600 hover:text-red-700 font-medium">
            Disable 2FA
          </button>
        )}

        {twoFAEnabled && showDisable && (
          <div className="space-y-3 p-4 bg-red-50 rounded-xl border border-red-200">
            <div className="flex items-center gap-2 text-red-700">
              <AlertTriangle size={14} />
              <p className="text-sm font-medium">Enter your authenticator code to disable 2FA</p>
            </div>
            <div className="flex gap-3">
              <input
                className="input w-40 text-center text-lg font-mono tracking-widest"
                placeholder="000000"
                maxLength={6}
                value={disableToken}
                onChange={e => setDisableToken(e.target.value.replace(/\D/g, ''))}
              />
              <button onClick={disable2FA} disabled={disableToken.length !== 6} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg disabled:opacity-50">
                Disable 2FA
              </button>
              <button onClick={() => { setShowDisable(false); setDisableToken('') }} className="btn-secondary text-sm">Cancel</button>
            </div>
            {twoFAError && <p className="text-sm text-red-600">{twoFAError}</p>}
          </div>
        )}
      </div>
    </div>
  )
}

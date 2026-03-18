import { Router } from 'express'
import { login, logout, refresh, me, setup2FA, enable2FA, disable2FA, verify2FA } from './auth.controller'
import { authenticate } from '../../middleware/auth'

export const authRouter = Router()
authRouter.post('/login', login)
authRouter.post('/logout', logout)
authRouter.post('/refresh', refresh)
authRouter.get('/me', authenticate, me)
authRouter.post('/2fa/setup', authenticate, setup2FA)
authRouter.post('/2fa/enable', authenticate, enable2FA)
authRouter.post('/2fa/disable', authenticate, disable2FA)
authRouter.post('/2fa/verify', verify2FA)

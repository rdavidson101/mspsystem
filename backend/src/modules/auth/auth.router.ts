import { Router } from 'express'
import { login, logout, refresh, me } from './auth.controller'
import { authenticate } from '../../middleware/auth'

export const authRouter = Router()
authRouter.post('/login', login)
authRouter.post('/logout', logout)
authRouter.post('/refresh', refresh)
authRouter.get('/me', authenticate, me)

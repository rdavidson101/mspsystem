import { Router } from 'express'
import { authenticate } from '../../middleware/auth'
import { getSettings, updateSettings } from './settings.controller'

export const settingsRouter = Router()
settingsRouter.use(authenticate)
settingsRouter.get('/', getSettings)
settingsRouter.patch('/', updateSettings)

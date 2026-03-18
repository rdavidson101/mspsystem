import { Router } from 'express'
import { authenticate } from '../../middleware/auth'
import { getSlaPolicies, upsertSlaPolicy } from './sla.controller'

export const slaRouter = Router()
slaRouter.use(authenticate)
slaRouter.get('/', getSlaPolicies)
slaRouter.put('/', upsertSlaPolicy)

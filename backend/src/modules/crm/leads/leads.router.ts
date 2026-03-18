import { Router } from 'express'
import { authenticate } from '../../../middleware/auth'
import { getLeads, createLead, updateLead, deleteLead } from './leads.controller'

export const leadsRouter = Router()
leadsRouter.use(authenticate)
leadsRouter.get('/', getLeads)
leadsRouter.post('/', createLead)
leadsRouter.put('/:id', updateLead)
leadsRouter.delete('/:id', deleteLead)

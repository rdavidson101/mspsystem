import { Router } from 'express'
import { authenticate } from '../../middleware/auth'
import { getChanges, getChange, createChange, updateChange, submitChange, approveInternal, rejectInternal, approveCustomer, rejectCustomer, completeChange, failChange, cancelChange, abandonChange, getApprovers } from './changes.controller'

export const changesRouter = Router()
changesRouter.use(authenticate)

changesRouter.get('/', getChanges)
changesRouter.post('/', createChange)
changesRouter.get('/approvers', getApprovers)
changesRouter.get('/:id', getChange)
changesRouter.patch('/:id', updateChange)
changesRouter.post('/:id/submit', submitChange)
changesRouter.post('/:id/approve-internal', approveInternal)
changesRouter.post('/:id/reject-internal', rejectInternal)
changesRouter.post('/:id/approve-customer', approveCustomer)
changesRouter.post('/:id/reject-customer', rejectCustomer)
changesRouter.post('/:id/complete', completeChange)
changesRouter.post('/:id/fail', failChange)
changesRouter.post('/:id/cancel', cancelChange)
changesRouter.post('/:id/abandon', abandonChange)

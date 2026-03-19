import { Router } from 'express'
import { authenticate } from '../../middleware/auth'
import { getChanges, getChange, createChange, updateChange, submitChange, approveInternal, rejectInternal, approveCustomer, rejectCustomer, completeChange, failChange, cancelChange, abandonChange, getApprovers } from './changes.controller'
import { prisma } from '../../lib/prisma'

export const changesRouter = Router()
changesRouter.use(authenticate)

changesRouter.param('id', async (req, res, next, id) => {
  if (/^RFC-/i.test(id)) {
    const num = parseInt(id.slice(4), 10)
    if (isNaN(num)) return res.status(400).json({ message: 'Invalid RFC reference' })
    const change = await prisma.change.findUnique({ where: { number: num }, select: { id: true } })
    if (!change) return res.status(404).json({ message: 'Change not found' })
    req.params.id = change.id
  }
  next()
})

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

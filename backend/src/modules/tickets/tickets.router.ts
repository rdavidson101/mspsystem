import { Router } from 'express'
import { authenticate, requireRole } from '../../middleware/auth'
import { getTickets, getTicket, createTicket, updateTicket, deleteTicket, addComment, getComments, getHistory } from './tickets.controller'
import { prisma } from '../../lib/prisma'

export const ticketsRouter = Router()
ticketsRouter.use(authenticate)

ticketsRouter.param('id', async (req, res, next, id) => {
  if (/^INC-/i.test(id)) {
    const num = parseInt(id.slice(4), 10)
    if (isNaN(num)) return res.status(400).json({ message: 'Invalid ticket reference' })
    const ticket = await prisma.ticket.findUnique({ where: { number: num }, select: { id: true } })
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' })
    req.params.id = ticket.id
  }
  next()
})

ticketsRouter.get('/', getTickets)
ticketsRouter.get('/:id', getTicket)
ticketsRouter.post('/', createTicket)
ticketsRouter.put('/:id', updateTicket)
ticketsRouter.delete('/:id', requireRole('ADMIN'), deleteTicket)
ticketsRouter.get('/:id/comments', getComments)
ticketsRouter.post('/:id/comments', addComment)
ticketsRouter.get('/:id/history', getHistory)

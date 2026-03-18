import { Router } from 'express'
import { authenticate } from '../../middleware/auth'
import { getTickets, getTicket, createTicket, updateTicket, deleteTicket, addComment, getComments } from './tickets.controller'

export const ticketsRouter = Router()
ticketsRouter.use(authenticate)
ticketsRouter.get('/', getTickets)
ticketsRouter.get('/:id', getTicket)
ticketsRouter.post('/', createTicket)
ticketsRouter.put('/:id', updateTicket)
ticketsRouter.delete('/:id', deleteTicket)
ticketsRouter.get('/:id/comments', getComments)
ticketsRouter.post('/:id/comments', addComment)

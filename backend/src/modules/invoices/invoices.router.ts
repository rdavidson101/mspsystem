import { Router } from 'express'
import { authenticate } from '../../middleware/auth'
import { getInvoices, getInvoice, createInvoice, updateInvoice, deleteInvoice } from './invoices.controller'

export const invoicesRouter = Router()
invoicesRouter.use(authenticate)
invoicesRouter.get('/', getInvoices)
invoicesRouter.get('/:id', getInvoice)
invoicesRouter.post('/', createInvoice)
invoicesRouter.put('/:id', updateInvoice)
invoicesRouter.delete('/:id', deleteInvoice)

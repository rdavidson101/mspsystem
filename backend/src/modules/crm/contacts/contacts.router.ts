import { Router } from 'express'
import { authenticate } from '../../../middleware/auth'
import { getContacts, createContact, updateContact, deleteContact } from './contacts.controller'

export const contactsRouter = Router()
contactsRouter.use(authenticate)
contactsRouter.get('/', getContacts)
contactsRouter.post('/', createContact)
contactsRouter.put('/:id', updateContact)
contactsRouter.delete('/:id', deleteContact)

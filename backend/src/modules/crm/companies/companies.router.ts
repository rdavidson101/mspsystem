import { Router } from 'express'
import { authenticate } from '../../../middleware/auth'
import { getCompanies, getCompany, createCompany, updateCompany, deleteCompany } from './companies.controller'

export const companiesRouter = Router()
companiesRouter.use(authenticate)
companiesRouter.get('/', getCompanies)
companiesRouter.get('/:id', getCompany)
companiesRouter.post('/', createCompany)
companiesRouter.put('/:id', updateCompany)
companiesRouter.delete('/:id', deleteCompany)

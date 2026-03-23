import { Router } from 'express'
import { authenticate, requireRole } from '../../middleware/auth'
import { getCategories, createCategory, updateCategory, deleteCategory } from './categories.controller'

export const categoriesRouter = Router()
categoriesRouter.use(authenticate)
categoriesRouter.get('/', getCategories)
categoriesRouter.post('/', requireRole('ADMIN', 'MANAGER'), createCategory)
categoriesRouter.put('/:id', requireRole('ADMIN', 'MANAGER'), updateCategory)
categoriesRouter.delete('/:id', requireRole('ADMIN', 'MANAGER'), deleteCategory)

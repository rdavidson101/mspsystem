import { Router } from 'express'
import { authenticate } from '../../middleware/auth'
import { getCategories, createCategory, updateCategory, deleteCategory } from './categories.controller'

export const categoriesRouter = Router()
categoriesRouter.use(authenticate)
categoriesRouter.get('/', getCategories)
categoriesRouter.post('/', createCategory)
categoriesRouter.put('/:id', updateCategory)
categoriesRouter.delete('/:id', deleteCategory)

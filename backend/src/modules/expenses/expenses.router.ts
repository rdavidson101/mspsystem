import { Router } from 'express'
import { authenticate } from '../../middleware/auth'
import { getExpenses, createExpense, updateExpense, deleteExpense } from './expenses.controller'

export const expensesRouter = Router()
expensesRouter.use(authenticate)
expensesRouter.get('/', getExpenses)
expensesRouter.post('/', createExpense)
expensesRouter.put('/:id', updateExpense)
expensesRouter.delete('/:id', deleteExpense)

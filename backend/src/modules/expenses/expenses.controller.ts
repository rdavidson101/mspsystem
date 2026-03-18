import { Response, NextFunction } from 'express'
import { prisma } from '../../lib/prisma'
import { AuthRequest } from '../../middleware/auth'

export async function getExpenses(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const expenses = await prisma.expense.findMany({ orderBy: { date: 'desc' } })
    res.json(expenses)
  } catch (e) { next(e) }
}

export async function createExpense(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const expense = await prisma.expense.create({ data: req.body })
    res.status(201).json(expense)
  } catch (e) { next(e) }
}

export async function updateExpense(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const expense = await prisma.expense.update({ where: { id: req.params.id }, data: req.body })
    res.json(expense)
  } catch (e) { next(e) }
}

export async function deleteExpense(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await prisma.expense.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (e) { next(e) }
}

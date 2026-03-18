import { Response, NextFunction } from 'express'
import { prisma } from '../../lib/prisma'
import { AuthRequest } from '../../middleware/auth'

export async function getCategories(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const categories = await prisma.ticketCategory.findMany({
      where: { isActive: true },
      include: { _count: { select: { tickets: true } } },
      orderBy: { name: 'asc' },
    })
    res.json(categories)
  } catch (e) { next(e) }
}

export async function createCategory(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const category = await prisma.ticketCategory.create({ data: req.body })
    res.status(201).json(category)
  } catch (e) { next(e) }
}

export async function updateCategory(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const category = await prisma.ticketCategory.update({ where: { id: req.params.id }, data: req.body })
    res.json(category)
  } catch (e) { next(e) }
}

export async function deleteCategory(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await prisma.ticketCategory.update({ where: { id: req.params.id }, data: { isActive: false } })
    res.json({ success: true })
  } catch (e) { next(e) }
}

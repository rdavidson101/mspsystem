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
    const { name, color } = req.body
    if (!name?.trim()) return res.status(400).json({ message: 'Name is required' })
    const category = await prisma.ticketCategory.create({ data: { name: name.trim(), color: color || '#6366f1' } })
    res.status(201).json(category)
  } catch (e) { next(e) }
}

export async function updateCategory(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { name, color } = req.body
    const data: any = {}
    if (name !== undefined) data.name = String(name).trim()
    if (color !== undefined) data.color = String(color)
    const category = await prisma.ticketCategory.update({ where: { id: req.params.id }, data })
    res.json(category)
  } catch (e) { next(e) }
}

export async function deleteCategory(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await prisma.ticketCategory.update({ where: { id: req.params.id }, data: { isActive: false } })
    res.json({ success: true })
  } catch (e) { next(e) }
}

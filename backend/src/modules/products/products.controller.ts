import { Request, Response, NextFunction } from 'express'
import { prisma } from '../../lib/prisma'
import { AuthRequest } from '../../middleware/authenticate'

export async function getProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const { search, category, active } = req.query
    const where: any = {}
    if (search) where.OR = [
      { name: { contains: String(search), mode: 'insensitive' } },
      { sku: { contains: String(search), mode: 'insensitive' } },
    ]
    if (category) where.category = String(category)
    if (active !== undefined) where.isActive = active === 'true'
    const products = await prisma.product.findMany({ where, orderBy: { name: 'asc' } })
    res.json(products)
  } catch (e) { next(e) }
}

export async function getProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const product = await prisma.product.findUnique({ where: { id: req.params.id } })
    if (!product) return res.status(404).json({ message: 'Product not found' })
    res.json(product)
  } catch (e) { next(e) }
}

export async function createProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const product = await prisma.product.create({ data: req.body })
    res.status(201).json(product)
  } catch (e) { next(e) }
}

export async function updateProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const product = await prisma.product.update({ where: { id: req.params.id }, data: req.body })
    res.json(product)
  } catch (e) { next(e) }
}

export async function deleteProduct(req: Request, res: Response, next: NextFunction) {
  try {
    await prisma.product.delete({ where: { id: req.params.id } })
    res.status(204).send()
  } catch (e) { next(e) }
}

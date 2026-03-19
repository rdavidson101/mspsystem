import { Response, NextFunction } from 'express'
import { prisma } from '../../lib/prisma'
import { AuthRequest } from '../../middleware/auth'

export async function getVendors(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const vendors = await prisma.vendor.findMany({ orderBy: { name: 'asc' }, include: { _count: { select: { assets: true, licenses: true } } } })
    res.json(vendors)
  } catch (e) { next(e) }
}

export async function createVendor(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const vendor = await prisma.vendor.create({ data: req.body })
    res.status(201).json(vendor)
  } catch (e) { next(e) }
}

export async function updateVendor(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const vendor = await prisma.vendor.update({ where: { id: req.params.id }, data: req.body })
    res.json(vendor)
  } catch (e) { next(e) }
}

export async function deleteVendor(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await prisma.vendor.delete({ where: { id: req.params.id } })
    res.status(204).send()
  } catch (e) { next(e) }
}

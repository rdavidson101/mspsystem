import { Response, NextFunction } from 'express'
import { prisma } from '../../lib/prisma'
import { AuthRequest } from '../../middleware/auth'

export async function getManufacturers(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const manufacturers = await prisma.manufacturer.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } })
    res.json(manufacturers)
  } catch (e) { next(e) }
}

export async function createManufacturer(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const m = await prisma.manufacturer.create({ data: req.body })
    res.status(201).json(m)
  } catch (e) { next(e) }
}

export async function updateManufacturer(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const m = await prisma.manufacturer.update({ where: { id: req.params.id }, data: req.body })
    res.json(m)
  } catch (e) { next(e) }
}

export async function deleteManufacturer(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await prisma.manufacturer.update({ where: { id: req.params.id }, data: { isActive: false } })
    res.json({ success: true })
  } catch (e) { next(e) }
}

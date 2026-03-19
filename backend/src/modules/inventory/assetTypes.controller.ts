import { Response, NextFunction } from 'express'
import { prisma } from '../../lib/prisma'
import { AuthRequest } from '../../middleware/auth'

export async function getAssetTypes(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const types = await prisma.assetType.findMany({ orderBy: { name: 'asc' }, include: { _count: { select: { assets: true } } } })
    res.json(types)
  } catch (e) { next(e) }
}

export async function createAssetType(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const type = await prisma.assetType.create({ data: req.body })
    res.status(201).json(type)
  } catch (e) { next(e) }
}

export async function updateAssetType(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const type = await prisma.assetType.update({ where: { id: req.params.id }, data: req.body })
    res.json(type)
  } catch (e) { next(e) }
}

export async function deleteAssetType(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await prisma.assetType.delete({ where: { id: req.params.id } })
    res.status(204).send()
  } catch (e) { next(e) }
}

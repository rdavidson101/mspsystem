import { Response, NextFunction } from 'express'
import { prisma } from '../../lib/prisma'
import { AuthRequest } from '../../middleware/auth'
import { AppError } from '../../middleware/errorHandler'

function assetRef(n: number) { return `ASSET-${String(n).padStart(5, '0')}` }

export async function getAssets(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { status, companyId } = req.query
    const where: any = {}
    if (status) where.status = status
    if (companyId) where.companyId = companyId
    const assets = await prisma.asset.findMany({
      where,
      include: { manufacturer: true, company: true },
      orderBy: { number: 'desc' },
    })
    res.json(assets.map(a => ({ ...a, ref: assetRef(a.number) })))
  } catch (e) { next(e) }
}

export async function getAsset(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const asset = await prisma.asset.findUnique({
      where: { id: req.params.id },
      include: { manufacturer: true, company: true, shipmentRequests: { include: { requestedBy: true }, orderBy: { createdAt: 'desc' } } },
    })
    if (!asset) throw new AppError(404, 'Asset not found')
    res.json({ ...asset, ref: assetRef(asset.number) })
  } catch (e) { next(e) }
}

export async function createAsset(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const asset = await prisma.asset.create({
      data: req.body,
      include: { manufacturer: true, company: true },
    })
    res.status(201).json({ ...asset, ref: assetRef(asset.number) })
  } catch (e) { next(e) }
}

export async function updateAsset(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const asset = await prisma.asset.update({
      where: { id: req.params.id },
      data: req.body,
      include: { manufacturer: true, company: true },
    })
    res.json({ ...asset, ref: assetRef(asset.number) })
  } catch (e) { next(e) }
}

export async function deleteAsset(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await prisma.asset.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (e) { next(e) }
}

export async function requestShipment(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params
    const asset = await prisma.asset.findUnique({ where: { id } })
    if (!asset) throw new AppError(404, 'Asset not found')
    const shipment = await prisma.shipmentRequest.create({
      data: { ...req.body, assetId: id, requestedById: req.user!.id },
      include: { asset: true, requestedBy: true },
    })
    await prisma.asset.update({ where: { id }, data: { status: 'SHIPPING' } })
    res.status(201).json(shipment)
  } catch (e) { next(e) }
}

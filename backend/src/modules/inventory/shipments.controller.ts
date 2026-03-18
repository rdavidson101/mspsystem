import { Response, NextFunction } from 'express'
import { prisma } from '../../lib/prisma'
import { AuthRequest } from '../../middleware/auth'

export async function getShipments(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { status } = req.query
    const where: any = {}
    if (status) where.status = status
    const shipments = await prisma.shipmentRequest.findMany({
      where,
      include: { asset: { include: { manufacturer: true } }, requestedBy: true },
      orderBy: { createdAt: 'desc' },
    })
    res.json(shipments)
  } catch (e) { next(e) }
}

export async function updateShipment(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const shipment = await prisma.shipmentRequest.update({
      where: { id: req.params.id },
      data: req.body,
      include: { asset: true, requestedBy: true },
    })
    // If delivered, update asset status to DEPLOYED
    if (req.body.status === 'DELIVERED') {
      await prisma.asset.update({ where: { id: shipment.assetId }, data: { status: 'DEPLOYED' } })
    }
    res.json(shipment)
  } catch (e) { next(e) }
}

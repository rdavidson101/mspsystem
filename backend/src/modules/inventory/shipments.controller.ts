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
    const { status, notes } = req.body
    const shipment = await prisma.shipmentRequest.update({
      where: { id: req.params.id },
      data: { ...(status && { status }), ...(notes !== undefined && { notes }) },
      include: { asset: true, requestedBy: true },
    })
    if (status === 'DELIVERED') {
      await prisma.asset.update({ where: { id: shipment.assetId }, data: { status: 'DEPLOYED' } })
    }
    res.json(shipment)
  } catch (e) { next(e) }
}

export async function deleteShipment(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await prisma.shipmentRequest.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (e) { next(e) }
}

import { Response, NextFunction } from 'express'
import { prisma } from '../../lib/prisma'
import { AuthRequest } from '../../middleware/auth'
import { AppError } from '../../middleware/errorHandler'

function assetRef(n: number) { return `ASSET-${String(n).padStart(5, '0')}` }

const assetInclude = {
  manufacturer: true,
  company: true,
  assetType: true,
  vendor: true,
  assignedUser: { select: { id: true, firstName: true, lastName: true, jobTitle: true } },
  assignedContact: { select: { id: true, firstName: true, lastName: true } },
}

export async function getAssets(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { status, companyId } = req.query
    const where: any = {}
    if (status) where.status = status
    if (companyId) where.companyId = companyId
    const assets = await prisma.asset.findMany({
      where,
      include: assetInclude,
      orderBy: { number: 'desc' },
    })
    res.json(assets.map(a => ({ ...a, ref: assetRef(a.number) })))
  } catch (e) { next(e) }
}

export async function getAsset(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const asset = await prisma.asset.findUnique({
      where: { id: req.params.id },
      include: {
        ...assetInclude,
        shipmentRequests: { include: { requestedBy: true }, orderBy: { createdAt: 'desc' } },
      },
    })
    if (!asset) throw new AppError(404, 'Asset not found')
    res.json({ ...asset, ref: assetRef(asset.number) })
  } catch (e) { next(e) }
}


export async function createAsset(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const {
      name, modelNumber, serialNumber, status,
      manufacturerId, companyId, purchaseDate, purchasePrice, warrantyExpiry, notes,
      assetTypeId, vendorId, assigneeType, assignedUserId, assignedContactId,
    } = req.body
    const data: any = {}
    if (name !== undefined) data.name = name
    if (modelNumber !== undefined) data.modelNumber = modelNumber || null
    if (serialNumber !== undefined) data.serialNumber = serialNumber || null
    if (status !== undefined) data.status = status
    if (manufacturerId !== undefined) data.manufacturerId = manufacturerId || null
    if (companyId !== undefined) data.companyId = companyId || null
    if (purchaseDate !== undefined) data.purchaseDate = purchaseDate ? new Date(purchaseDate) : null
    if (purchasePrice !== undefined) data.purchasePrice = purchasePrice != null && purchasePrice !== '' ? parseFloat(purchasePrice) : null
    if (warrantyExpiry !== undefined) data.warrantyExpiry = warrantyExpiry ? new Date(warrantyExpiry) : null
    if (notes !== undefined) data.notes = notes || null
    if (assetTypeId !== undefined) data.assetTypeId = assetTypeId || null
    if (vendorId !== undefined) data.vendorId = vendorId || null
    if (assigneeType !== undefined) data.assigneeType = assigneeType || null
    if (assignedUserId !== undefined) data.assignedUserId = assignedUserId || null
    if (assignedContactId !== undefined) data.assignedContactId = assignedContactId || null
    const asset = await prisma.asset.create({
      data,
      include: assetInclude,
    })
    res.status(201).json({ ...asset, ref: assetRef(asset.number) })
  } catch (e) { next(e) }
}

export async function updateAsset(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const {
      name, modelNumber, serialNumber, status,
      manufacturerId, companyId, purchaseDate, purchasePrice, warrantyExpiry, notes,
      assetTypeId, vendorId, assigneeType, assignedUserId, assignedContactId,
    } = req.body
    const data: any = {}
    if (name !== undefined) data.name = name
    if (modelNumber !== undefined) data.modelNumber = modelNumber || null
    if (serialNumber !== undefined) data.serialNumber = serialNumber || null
    if (status !== undefined) data.status = status
    if (manufacturerId !== undefined) data.manufacturerId = manufacturerId || null
    if (companyId !== undefined) data.companyId = companyId || null
    if (purchaseDate !== undefined) data.purchaseDate = purchaseDate ? new Date(purchaseDate) : null
    if (purchasePrice !== undefined) data.purchasePrice = purchasePrice != null && purchasePrice !== '' ? parseFloat(purchasePrice) : null
    if (warrantyExpiry !== undefined) data.warrantyExpiry = warrantyExpiry ? new Date(warrantyExpiry) : null
    if (notes !== undefined) data.notes = notes || null
    if (assetTypeId !== undefined) data.assetTypeId = assetTypeId || null
    if (vendorId !== undefined) data.vendorId = vendorId || null
    if (assigneeType !== undefined) data.assigneeType = assigneeType || null
    if (assignedUserId !== undefined) data.assignedUserId = assignedUserId || null
    if (assignedContactId !== undefined) data.assignedContactId = assignedContactId || null
    const asset = await prisma.asset.update({
      where: { id: req.params.id },
      data,
      include: assetInclude,
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
    const {
      recipientName, company, addressLine1, addressLine2,
      city, state, zip, country, purpose, notes,
    } = req.body
    const shipment = await prisma.shipmentRequest.create({
      data: {
        recipientName,
        company: company || null,
        addressLine1,
        addressLine2: addressLine2 || null,
        city,
        state: state || null,
        zip: zip || null,
        country: country || 'UK',
        purpose,
        notes: notes || null,
        assetId: id,
        requestedById: req.user!.id,
      },
      include: { asset: true, requestedBy: true },
    })
    await prisma.asset.update({ where: { id }, data: { status: 'SHIPPING' } })
    res.status(201).json(shipment)
  } catch (e) { next(e) }
}

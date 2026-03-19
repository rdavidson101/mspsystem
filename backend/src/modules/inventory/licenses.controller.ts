import { Response, NextFunction } from 'express'
import { prisma } from '../../lib/prisma'
import { AuthRequest } from '../../middleware/auth'

export async function getLicenses(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const licenses = await prisma.license.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        vendor: { select: { id: true, name: true } },
        company: { select: { id: true, name: true } },
      }
    })
    res.json(licenses)
  } catch (e) { next(e) }
}

export async function createLicense(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const license = await prisma.license.create({
      data: req.body,
      include: {
        vendor: { select: { id: true, name: true } },
        company: { select: { id: true, name: true } },
      }
    })
    res.status(201).json(license)
  } catch (e) { next(e) }
}

export async function updateLicense(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const license = await prisma.license.update({
      where: { id: req.params.id },
      data: req.body,
      include: {
        vendor: { select: { id: true, name: true } },
        company: { select: { id: true, name: true } },
      }
    })
    res.json(license)
  } catch (e) { next(e) }
}

export async function deleteLicense(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await prisma.license.delete({ where: { id: req.params.id } })
    res.status(204).send()
  } catch (e) { next(e) }
}

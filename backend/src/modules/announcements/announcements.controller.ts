import { Response, NextFunction } from 'express'
import { prisma } from '../../lib/prisma'
import { AuthRequest } from '../../middleware/auth'

export async function getAnnouncements(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const announcements = await prisma.announcement.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    })
    res.json(announcements)
  } catch (e) { next(e) }
}

export async function createAnnouncement(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const a = await prisma.announcement.create({ data: req.body })
    res.status(201).json(a)
  } catch (e) { next(e) }
}

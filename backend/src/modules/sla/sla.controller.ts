import { Response, NextFunction } from 'express'
import { prisma } from '../../lib/prisma'
import { AuthRequest } from '../../middleware/auth'

export async function getSlaPolicies(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const policies = await prisma.slaPolicy.findMany({
      orderBy: { priority: 'asc' },
    })
    res.json(policies)
  } catch (e) { next(e) }
}

export async function upsertSlaPolicy(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { priority, responseTime, resolutionTime, isActive } = req.body
    const policy = await prisma.slaPolicy.upsert({
      where: { priority },
      update: { responseTime: Number(responseTime), resolutionTime: Number(resolutionTime), isActive: isActive ?? true },
      create: { priority, responseTime: Number(responseTime), resolutionTime: Number(resolutionTime), isActive: isActive ?? true },
    })
    res.json(policy)
  } catch (e) { next(e) }
}

import { Response, NextFunction } from 'express'
import { prisma } from '../../lib/prisma'
import { AuthRequest } from '../../middleware/auth'

export async function getSettings(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const rows = await prisma.systemSetting.findMany()
    const result: Record<string, string> = {}
    rows.forEach(r => { result[r.key] = r.value })
    res.json(result)
  } catch (e) { next(e) }
}

export async function updateSettings(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const updates: Record<string, string> = req.body

    await prisma.$transaction(
      Object.entries(updates).map(([key, value]) =>
        prisma.systemSetting.upsert({
          where: { key },
          update: { value: String(value) },
          create: { key, value: String(value) },
        })
      )
    )

    // If mspName updated, upsert the internal (MSP) company
    if (updates.mspName) {
      const existing = await prisma.company.findFirst({ where: { isInternal: true } })
      if (existing) {
        await prisma.company.update({ where: { id: existing.id }, data: { name: updates.mspName } })
      } else {
        const company = await prisma.company.create({
          data: { name: updates.mspName, isInternal: true, isActive: true },
        })
        await prisma.systemSetting.upsert({
          where: { key: 'mspCompanyId' },
          update: { value: company.id },
          create: { key: 'mspCompanyId', value: company.id },
        })
      }
    }

    const rows = await prisma.systemSetting.findMany()
    const result: Record<string, string> = {}
    rows.forEach(r => { result[r.key] = r.value })
    res.json(result)
  } catch (e) { next(e) }
}

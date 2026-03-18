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
      let mspCompany = await prisma.company.findFirst({ where: { isInternal: true } })
      if (mspCompany) {
        await prisma.company.update({ where: { id: mspCompany.id }, data: { name: updates.mspName } })
      } else {
        mspCompany = await prisma.company.create({
          data: { name: updates.mspName, isInternal: true, isActive: true },
        })
        await prisma.systemSetting.upsert({
          where: { key: 'mspCompanyId' },
          update: { value: mspCompany.id },
          create: { key: 'mspCompanyId', value: mspCompany.id },
        })
      }

      // Associate all INTERNAL users with the MSP company
      await prisma.user.updateMany({
        where: { userType: 'INTERNAL' },
        data: { companyId: mspCompany.id },
      })
    }

    const rows = await prisma.systemSetting.findMany()
    const result: Record<string, string> = {}
    rows.forEach(r => { result[r.key] = r.value })
    res.json(result)
  } catch (e) { next(e) }
}

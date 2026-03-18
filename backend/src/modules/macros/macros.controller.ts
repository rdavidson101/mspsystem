import { Response, NextFunction } from 'express'
import { prisma } from '../../lib/prisma'
import { AuthRequest } from '../../middleware/auth'

export async function getMacros(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const macros = await prisma.macro.findMany({
      where: {
        OR: [
          { isGlobal: true },
          { createdById: req.user!.id },
        ],
      },
      include: { createdBy: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { name: 'asc' },
    })
    res.json(macros)
  } catch (e) { next(e) }
}

export async function createMacro(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const macro = await prisma.macro.create({
      data: { ...req.body, createdById: req.user!.id },
      include: { createdBy: { select: { id: true, firstName: true, lastName: true } } },
    })
    res.status(201).json(macro)
  } catch (e) { next(e) }
}

export async function updateMacro(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const macro = await prisma.macro.update({ where: { id: req.params.id }, data: req.body })
    res.json(macro)
  } catch (e) { next(e) }
}

export async function deleteMacro(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await prisma.macro.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (e) { next(e) }
}

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
    const { name, content, isGlobal } = req.body
    if (!name?.trim()) return res.status(400).json({ message: 'Name is required' })
    if (!content?.trim()) return res.status(400).json({ message: 'Content is required' })
    const macro = await prisma.macro.create({
      data: {
        name: name.trim(),
        content: content.trim(),
        isGlobal: req.user!.role === 'ADMIN' || req.user!.role === 'MANAGER' ? Boolean(isGlobal) : false,
        createdById: req.user!.id,
      },
      include: { createdBy: { select: { id: true, firstName: true, lastName: true } } },
    })
    res.status(201).json(macro)
  } catch (e) { next(e) }
}

export async function updateMacro(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { name, content, isGlobal } = req.body
    const updateData: any = {}
    if (name !== undefined) updateData.name = String(name).trim()
    if (content !== undefined) updateData.content = String(content).trim()
    if (isGlobal !== undefined) {
      if (req.user!.role === 'ADMIN' || req.user!.role === 'MANAGER') {
        updateData.isGlobal = Boolean(isGlobal)
      }
    }
    const macro = await prisma.macro.update({ where: { id: req.params.id }, data: updateData })
    res.json(macro)
  } catch (e) { next(e) }
}

export async function deleteMacro(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await prisma.macro.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (e) { next(e) }
}

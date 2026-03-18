import { Response, NextFunction } from 'express'
import { prisma } from '../../../lib/prisma'
import { AuthRequest } from '../../../middleware/auth'

export async function getLeads(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const leads = await prisma.lead.findMany({
      include: { company: { select: { id: true, name: true } }, contact: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
    })
    res.json(leads)
  } catch (e) { next(e) }
}

export async function createLead(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const lead = await prisma.lead.create({ data: req.body, include: { company: { select: { id: true, name: true } } } })
    res.status(201).json(lead)
  } catch (e) { next(e) }
}

export async function updateLead(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const lead = await prisma.lead.update({ where: { id: req.params.id }, data: req.body })
    res.json(lead)
  } catch (e) { next(e) }
}

export async function deleteLead(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await prisma.lead.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (e) { next(e) }
}

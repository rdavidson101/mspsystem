import { Response, NextFunction } from 'express'
import { prisma } from '../../../lib/prisma'
import { AuthRequest } from '../../../middleware/auth'

export async function getContacts(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { companyId, search } = req.query
    const contacts = await prisma.contact.findMany({
      where: {
        ...(companyId ? { companyId: String(companyId) } : {}),
        ...(search ? { OR: [{ firstName: { contains: String(search), mode: 'insensitive' } }, { lastName: { contains: String(search), mode: 'insensitive' } }, { email: { contains: String(search), mode: 'insensitive' } }] } : {}),
      },
      include: { company: { select: { id: true, name: true } } },
      orderBy: { firstName: 'asc' },
    })
    res.json(contacts)
  } catch (e) { next(e) }
}

export async function createContact(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const contact = await prisma.contact.create({ data: req.body, include: { company: { select: { id: true, name: true } } } })
    res.status(201).json(contact)
  } catch (e) { next(e) }
}

export async function updateContact(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const contact = await prisma.contact.update({ where: { id: req.params.id }, data: req.body, include: { company: { select: { id: true, name: true } } } })
    res.json(contact)
  } catch (e) { next(e) }
}

export async function deleteContact(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await prisma.contact.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (e) { next(e) }
}

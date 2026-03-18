import { Response, NextFunction } from 'express'
import { prisma } from '../../lib/prisma'
import { AuthRequest } from '../../middleware/auth'

export async function getInvoices(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { status } = req.query
    const invoices = await prisma.invoice.findMany({
      where: status ? { status: status as any } : {},
      include: { company: { select: { id: true, name: true } }, _count: { select: { items: true } } },
      orderBy: { createdAt: 'desc' },
    })
    res.json(invoices)
  } catch (e) { next(e) }
}

export async function getInvoice(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: { company: true, items: true, contract: true },
    })
    res.json(invoice)
  } catch (e) { next(e) }
}

export async function createInvoice(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { items, ...data } = req.body
    const number = `INV-${Date.now()}`
    const invoice = await prisma.invoice.create({
      data: { ...data, number, items: { create: items || [] } },
      include: { company: { select: { id: true, name: true } }, items: true },
    })
    res.status(201).json(invoice)
  } catch (e) { next(e) }
}

export async function updateInvoice(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const invoice = await prisma.invoice.update({ where: { id: req.params.id }, data: req.body })
    res.json(invoice)
  } catch (e) { next(e) }
}

export async function deleteInvoice(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await prisma.invoice.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (e) { next(e) }
}

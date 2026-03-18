import { Response, NextFunction } from 'express'
import { prisma } from '../../lib/prisma'
import { AuthRequest } from '../../middleware/auth'
import { AppError } from '../../middleware/errorHandler'

function changeRef(n: number) { return `RFC-${String(n).padStart(5, '0')}` }

const include = {
  createdBy: { select: { id: true, firstName: true, lastName: true } },
  internalApprover: { select: { id: true, firstName: true, lastName: true } },
  companyRef: true,
}

export async function getChanges(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { status } = req.query
    const where: any = {}
    if (status) where.status = status
    const changes = await prisma.change.findMany({ where, include, orderBy: { number: 'desc' } })
    res.json(changes.map(c => ({ ...c, ref: changeRef(c.number) })))
  } catch (e) { next(e) }
}

export async function getChange(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const change = await prisma.change.findUnique({ where: { id: req.params.id }, include })
    if (!change) throw new AppError(404, 'Change not found')
    res.json({ ...change, ref: changeRef(change.number) })
  } catch (e) { next(e) }
}

export async function createChange(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const change = await prisma.change.create({
      data: { ...req.body, createdById: req.user!.id },
      include,
    })
    res.status(201).json({ ...change, ref: changeRef(change.number) })
  } catch (e) { next(e) }
}

export async function updateChange(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const change = await prisma.change.update({
      where: { id: req.params.id },
      data: req.body,
      include,
    })
    res.json({ ...change, ref: changeRef(change.number) })
  } catch (e) { next(e) }
}

export async function submitChange(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const change = await prisma.change.findUnique({ where: { id: req.params.id } })
    if (!change) throw new AppError(404, 'Not found')
    if (change.status !== 'DRAFT') throw new AppError(400, 'Only draft changes can be submitted')
    const updated = await prisma.change.update({
      where: { id: req.params.id },
      data: { status: 'SUBMITTED' },
      include,
    })
    res.json({ ...updated, ref: changeRef(updated.number) })
  } catch (e) { next(e) }
}

export async function approveInternal(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { notes } = req.body
    const change = await prisma.change.findUnique({ where: { id: req.params.id } })
    if (!change) throw new AppError(404, 'Not found')
    if (change.internalApproverId !== req.user!.id) throw new AppError(403, 'You are not the internal approver for this change')
    if (change.status !== 'SUBMITTED') throw new AppError(400, 'Change is not pending internal approval')
    const updated = await prisma.change.update({
      where: { id: req.params.id },
      data: { status: 'CUSTOMER_REVIEW', internalApprovedAt: new Date(), internalNotes: notes },
      include,
    })
    res.json({ ...updated, ref: changeRef(updated.number) })
  } catch (e) { next(e) }
}

export async function rejectInternal(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { notes } = req.body
    const change = await prisma.change.findUnique({ where: { id: req.params.id } })
    if (!change) throw new AppError(404, 'Not found')
    if (change.internalApproverId !== req.user!.id) throw new AppError(403, 'You are not the internal approver')
    const updated = await prisma.change.update({
      where: { id: req.params.id },
      data: { status: 'REJECTED', internalRejectedAt: new Date(), internalNotes: notes },
      include,
    })
    res.json({ ...updated, ref: changeRef(updated.number) })
  } catch (e) { next(e) }
}

export async function approveCustomer(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { notes } = req.body
    const change = await prisma.change.findUnique({ where: { id: req.params.id } })
    if (!change) throw new AppError(404, 'Not found')
    if (change.status !== 'CUSTOMER_REVIEW') throw new AppError(400, 'Change is not pending customer approval')
    const updated = await prisma.change.update({
      where: { id: req.params.id },
      data: { status: 'APPROVED', customerApprovedAt: new Date(), customerNotes: notes },
      include,
    })
    res.json({ ...updated, ref: changeRef(updated.number) })
  } catch (e) { next(e) }
}

export async function rejectCustomer(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { notes } = req.body
    const updated = await prisma.change.update({
      where: { id: req.params.id },
      data: { status: 'REJECTED', customerRejectedAt: new Date(), customerNotes: notes },
      include,
    })
    res.json({ ...updated, ref: changeRef(updated.number) })
  } catch (e) { next(e) }
}

export async function getApprovers(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const approvers = await prisma.user.findMany({
      where: { canApproveChanges: true, isActive: true, userType: 'INTERNAL' },
      select: { id: true, firstName: true, lastName: true, email: true },
    })
    res.json(approvers)
  } catch (e) { next(e) }
}

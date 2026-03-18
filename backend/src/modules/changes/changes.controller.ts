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

function sanitizeChangeData(body: any) {
  const d: any = {}
  const str = (v: any) => (v !== undefined ? v || null : undefined)
  const strReq = (v: any) => (v !== undefined ? v : undefined)
  if (body.title !== undefined) d.title = body.title
  if (body.risk !== undefined) d.risk = body.risk
  if (body.status !== undefined) d.status = body.status
  if (body.scheduledStart !== undefined) d.scheduledStart = body.scheduledStart ? new Date(body.scheduledStart) : null
  if (body.durationMinutes !== undefined) d.durationMinutes = body.durationMinutes ? parseInt(body.durationMinutes, 10) : null
  if (body.companyId !== undefined) d.companyId = body.companyId || null
  if (body.scope !== undefined) d.scope = str(body.scope)
  if (body.reason !== undefined) d.reason = str(body.reason)
  if (body.risks !== undefined) d.risks = str(body.risks)
  if (body.implementationPlan !== undefined) d.implementationPlan = str(body.implementationPlan)
  if (body.validationSteps !== undefined) d.validationSteps = str(body.validationSteps)
  if (body.rollbackSteps !== undefined) d.rollbackSteps = str(body.rollbackSteps)
  if (body.internalApproverId !== undefined) d.internalApproverId = body.internalApproverId || null
  if (body.customerApproverName !== undefined) d.customerApproverName = str(body.customerApproverName)
  if (body.customerApproverEmail !== undefined) d.customerApproverEmail = str(body.customerApproverEmail)
  return d
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
      data: { ...sanitizeChangeData(req.body), createdById: req.user!.id },
      include,
    })
    res.status(201).json({ ...change, ref: changeRef(change.number) })
  } catch (e) { next(e) }
}

export async function updateChange(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const change = await prisma.change.update({
      where: { id: req.params.id },
      data: sanitizeChangeData(req.body),
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

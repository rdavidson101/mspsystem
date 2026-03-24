import { Response, NextFunction } from 'express'
import { prisma } from '../../lib/prisma'
import { AuthRequest } from '../../middleware/auth'
import { AppError } from '../../middleware/errorHandler'

function changeRef(n: number) { return `RFC-${String(n).padStart(5, '0')}` }

const include = {
  createdBy: { select: { id: true, firstName: true, lastName: true } },
  internalApprover: { select: { id: true, firstName: true, lastName: true } },
  clientApprover: { select: { id: true, firstName: true, lastName: true, email: true } },
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
  if (body.clientApproverId !== undefined) d.clientApproverId = body.clientApproverId || null
  if (body.customerApproverName !== undefined) d.customerApproverName = str(body.customerApproverName)
  if (body.customerApproverEmail !== undefined) d.customerApproverEmail = str(body.customerApproverEmail)
  return d
}

async function createNotification(userId: string, type: string, title: string, body: string, link: string) {
  try {
    await (prisma as any).notification.create({ data: { userId, type, title, body, link } })
  } catch (e) {
    console.error('Failed to create notification:', e)
  }
}

export async function getChanges(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { status, internalApproverId, createdById } = req.query
    const where: any = {}
    if (status) where.status = status
    if (internalApproverId) where.internalApproverId = internalApproverId as string
    if (createdById) where.createdById = createdById as string
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
    const { companyId } = req.body
    if (companyId) {
      const co = await prisma.company.findUnique({ where: { id: companyId } })
      if (co && !co.isActive) throw new AppError(400, 'This customer is disabled and cannot have new items created.')
    }
    const data = sanitizeChangeData(req.body)
    if (data.internalApproverId && data.internalApproverId === req.user!.id) {
      throw new AppError(400, 'You cannot assign yourself as the internal approver')
    }
    const change = await prisma.change.create({
      data: { ...data, createdById: req.user!.id },
      include,
    })
    res.status(201).json({ ...change, ref: changeRef(change.number) })
  } catch (e) { next(e) }
}

export async function updateChange(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const current = await prisma.change.findUnique({ where: { id: req.params.id } })
    if (!current) throw new AppError(404, 'Change not found')
    const data = sanitizeChangeData(req.body)
    if (data.internalApproverId && data.internalApproverId === (current.createdById)) {
      throw new AppError(400, 'The RFC creator cannot be the internal approver')
    }
    const change = await prisma.change.update({
      where: { id: req.params.id },
      data,
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
    if (updated.internalApproverId) {
      await createNotification(
        updated.internalApproverId,
        'CHANGE_APPROVAL',
        `Change pending your approval`,
        `RFC-${String(updated.number).padStart(5, '0')} – ${updated.title} requires your internal approval`,
        `/changes/RFC-${String(updated.number).padStart(5, '0')}`
      )
    }
    res.json({ ...updated, ref: changeRef(updated.number) })
  } catch (e) { next(e) }
}

export async function approveInternal(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { notes } = req.body
    const change = await prisma.change.findUnique({ where: { id: req.params.id }, include })
    if (!change) throw new AppError(404, 'Not found')
    if (change.internalApproverId !== req.user!.id) throw new AppError(403, 'You are not the internal approver for this change')
    if (change.status !== 'SUBMITTED') throw new AppError(400, 'Change is not pending internal approval')

    // Generate client approval token if a client approver is assigned
    let tokenData: any = {}
    if (change.clientApproverId) {
      const crypto = await import('crypto')
      const token = crypto.randomBytes(32).toString('hex')
      tokenData = { clientApprovalToken: token, clientApprovalSentAt: new Date() }
    }

    const updated = await prisma.change.update({
      where: { id: req.params.id },
      data: { status: 'CUSTOMER_REVIEW', internalApprovedAt: new Date(), internalNotes: notes, ...tokenData },
      include,
    })

    // Auto-send client approval email
    if (updated.clientApproverId && tokenData.clientApprovalToken) {
      const appUrl = process.env.APP_URL || process.env.CORS_ORIGIN?.split(',')[0] || 'http://localhost:5000'
      const approveUrl = `${appUrl}/change-approval/${tokenData.clientApprovalToken}?action=approve`
      const rejectUrl = `${appUrl}/change-approval/${tokenData.clientApprovalToken}?action=reject`
      const { sendChangeApprovalEmail } = await import('../email/email.service')
      sendChangeApprovalEmail(updated, (updated as any).clientApprover, approveUrl, rejectUrl).catch(console.error)
    }

    // Notify the RFC creator that internal approval passed
    if (updated.createdById && updated.createdById !== req.user!.id) {
      await createNotification(
        updated.createdById,
        'CHANGE_APPROVED',
        'RFC internally approved',
        `${changeRef(updated.number)} – ${updated.title} passed internal review${updated.clientApproverId ? ' and has been sent to the client for approval' : ''}`,
        `/changes/${changeRef(updated.number)}`
      )
    }

    res.json({ ...updated, ref: changeRef(updated.number) })
  } catch (e) { next(e) }
}

export async function rejectInternal(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { notes } = req.body
    const change = await prisma.change.findUnique({ where: { id: req.params.id }, include })
    if (!change) throw new AppError(404, 'Not found')
    if (change.internalApproverId !== req.user!.id) throw new AppError(403, 'You are not the internal approver')
    if (change.status !== 'SUBMITTED') throw new AppError(400, 'Change is not pending internal approval')
    const updated = await prisma.change.update({
      where: { id: req.params.id },
      data: { status: 'DRAFT', internalRejectedAt: new Date(), internalNotes: notes },
      include,
    })
    // Notify the requester
    if (updated.createdById) {
      await createNotification(
        updated.createdById,
        'CHANGE_REJECTED',
        `RFC rejected and returned to draft`,
        `RFC-${String(updated.number).padStart(5, '0')} – ${updated.title} was rejected by internal review${notes ? `: "${notes}"` : ''}`,
        `/changes/RFC-${String(updated.number).padStart(5, '0')}`
      )
    }
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

export async function completeChange(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const change = await prisma.change.findUnique({ where: { id: req.params.id } })
    if (!change) throw new AppError(404, 'Not found')
    if (!['APPROVED', 'IN_PROGRESS'].includes(change.status)) throw new AppError(400, 'Change must be approved or in progress to complete')
    const updated = await prisma.change.update({
      where: { id: req.params.id },
      data: { status: 'COMPLETED' },
      include,
    })
    res.json({ ...updated, ref: changeRef(updated.number) })
  } catch (e) { next(e) }
}

export async function failChange(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const change = await prisma.change.findUnique({ where: { id: req.params.id } })
    if (!change) throw new AppError(404, 'Not found')
    if (!['APPROVED', 'IN_PROGRESS'].includes(change.status)) throw new AppError(400, 'Change must be approved or in progress to mark as failed')
    const updated = await prisma.change.update({
      where: { id: req.params.id },
      data: { status: 'FAILED' },
      include,
    })
    res.json({ ...updated, ref: changeRef(updated.number) })
  } catch (e) { next(e) }
}

export async function cancelChange(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const change = await prisma.change.findUnique({ where: { id: req.params.id } })
    if (!change) throw new AppError(404, 'Not found')
    if (!['APPROVED', 'IN_PROGRESS'].includes(change.status)) throw new AppError(400, 'Change must be approved or in progress to cancel')
    const updated = await prisma.change.update({
      where: { id: req.params.id },
      data: { status: 'CANCELLED' },
      include,
    })
    res.json({ ...updated, ref: changeRef(updated.number) })
  } catch (e) { next(e) }
}

export async function abandonChange(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const change = await prisma.change.findUnique({ where: { id: req.params.id } })
    if (!change) throw new AppError(404, 'Not found')
    if (change.createdById !== req.user!.id) throw new AppError(403, 'Only the requester can abandon this change')
    if (change.status !== 'DRAFT') throw new AppError(400, 'Only draft changes can be abandoned')
    const updated = await prisma.change.update({
      where: { id: req.params.id },
      data: { status: 'CANCELLED' },
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

export async function getClientApprovers(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { companyId } = req.query
    if (!companyId) return res.json([])
    const contacts = await prisma.contact.findMany({
      where: { companyId: companyId as string, canApproveChanges: true },
      select: { id: true, firstName: true, lastName: true, email: true },
    })
    res.json(contacts)
  } catch (e) { next(e) }
}

export async function requestClientApproval(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const change = await prisma.change.findUnique({ where: { id: req.params.id }, include })
    if (!change) throw new AppError(404, 'Change not found')
    if (change.status !== 'CUSTOMER_REVIEW') throw new AppError(400, 'Change must be in CUSTOMER_REVIEW status')
    if (!change.clientApproverId) throw new AppError(400, 'No client approver assigned to this change')

    // Generate a secure random token
    const crypto = await import('crypto')
    const token = crypto.randomBytes(32).toString('hex')

    const updated = await prisma.change.update({
      where: { id: req.params.id },
      data: { clientApprovalToken: token, clientApprovalSentAt: new Date() },
      include,
    })

    // Send approval email
    const appUrl = process.env.APP_URL || process.env.CORS_ORIGIN?.split(',')[0] || 'http://localhost:5000'
    const approveUrl = `${appUrl}/change-approval/${token}?action=approve`
    const rejectUrl = `${appUrl}/change-approval/${token}?action=reject`

    const { sendChangeApprovalEmail } = await import('../email/email.service')
    sendChangeApprovalEmail(updated, change.clientApprover as any, approveUrl, rejectUrl).catch(console.error)

    res.json({ ...updated, ref: changeRef(updated.number) })
  } catch (e) { next(e) }
}

export async function getClientApprovalChange(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const change = await prisma.change.findFirst({
      where: { clientApprovalToken: req.params.token },
      include,
    })
    if (!change) return res.status(404).json({ error: 'Invalid or expired approval link' })
    if (!['CUSTOMER_REVIEW', 'APPROVED', 'REJECTED'].includes(change.status)) {
      return res.status(400).json({ error: 'This change is no longer awaiting approval' })
    }
    res.json({ ...change, ref: changeRef(change.number) })
  } catch (e) { next(e) }
}

export async function submitClientApproval(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { action, comment } = req.body
    if (!['approve', 'reject'].includes(action)) throw new AppError(400, 'Invalid action')

    const change = await prisma.change.findFirst({
      where: { clientApprovalToken: req.params.token },
      include,
    })
    if (!change) return res.status(404).json({ error: 'Invalid or expired approval link' })
    if (change.status !== 'CUSTOMER_REVIEW') {
      return res.status(400).json({ error: 'This change has already been reviewed' })
    }

    const isApprove = action === 'approve'
    const updated = await prisma.change.update({
      where: { id: change.id },
      data: {
        status: isApprove ? 'APPROVED' : 'REJECTED',
        customerApprovedAt: isApprove ? new Date() : null,
        customerRejectedAt: !isApprove ? new Date() : null,
        customerNotes: comment?.trim() || null,
        customerApproverName: change.clientApprover ? `${(change.clientApprover as any).firstName} ${(change.clientApprover as any).lastName}` : change.customerApproverName,
      },
      include,
    })

    // Notify the requester
    const statusLabel = isApprove ? 'approved' : 'rejected'
    const approverName = change.clientApprover ? `${(change.clientApprover as any).firstName} ${(change.clientApprover as any).lastName}` : 'Client'
    await createNotification(
      change.createdById,
      isApprove ? 'CHANGE_APPROVED' : 'CHANGE_REJECTED',
      `RFC ${statusLabel} by client`,
      `${changeRef(change.number)} – ${change.title} was ${statusLabel} by ${approverName}${comment ? `: "${comment}"` : ''}`,
      `/changes/${changeRef(change.number)}`
    )

    // Also notify internal approver if different
    if (change.internalApproverId && change.internalApproverId !== change.createdById) {
      await createNotification(
        change.internalApproverId,
        isApprove ? 'CHANGE_APPROVED' : 'CHANGE_REJECTED',
        `RFC ${statusLabel} by client`,
        `${changeRef(change.number)} – ${change.title} was ${statusLabel} by ${approverName}`,
        `/changes/${changeRef(change.number)}`
      )
    }

    res.json({ success: true, status: updated.status })
  } catch (e) { next(e) }
}

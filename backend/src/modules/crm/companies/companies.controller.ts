import { Response, NextFunction } from 'express'
import { prisma } from '../../../lib/prisma'
import { AuthRequest } from '../../../middleware/auth'
import { AppError } from '../../../middleware/errorHandler'

export async function getCompanies(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { search } = req.query
    const companies = await prisma.company.findMany({
      where: search ? { name: { contains: String(search), mode: 'insensitive' } } : {},
      include: {
        users: { select: { id: true, firstName: true, lastName: true, avatar: true }, orderBy: { firstName: 'asc' }, take: 8 },
        _count: { select: { contacts: true, tickets: true, projects: true, users: true } },
      },
      orderBy: [{ isInternal: 'desc' }, { name: 'asc' }],
    })
    res.json(companies)
  } catch (e) { next(e) }
}

export async function getCompany(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const company = await prisma.company.findUnique({
      where: { id: req.params.id },
      include: {
        contacts: true,
        tickets: { take: 10, orderBy: { createdAt: 'desc' } },
        projects: true,
        contracts: true,
        leads: true,
        _count: { select: { contacts: true, tickets: true, projects: true, users: true } },
      },
    })
    if (!company) throw new AppError(404, 'Company not found')
    res.json(company)
  } catch (e) { next(e) }
}

export async function createCompany(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { name, domain, industry, phone, email, address, city, state, zip, country, website, notes } = req.body
    const company = await prisma.company.create({
      data: { name, domain, industry, phone, email, address, city, state, zip, country, website, notes, isActive: true },
      include: { _count: { select: { contacts: true, tickets: true, projects: true, users: true } } },
    })
    res.status(201).json(company)
  } catch (e) { next(e) }
}

export async function updateCompany(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { name, domain, industry, phone, email, address, city, state, zip, country, website, notes } = req.body
    const data: any = {}
    if (name !== undefined) data.name = name
    if (domain !== undefined) data.domain = domain || null
    if (industry !== undefined) data.industry = industry || null
    if (phone !== undefined) data.phone = phone || null
    if (email !== undefined) data.email = email || null
    if (address !== undefined) data.address = address || null
    if (city !== undefined) data.city = city || null
    if (state !== undefined) data.state = state || null
    if (zip !== undefined) data.zip = zip || null
    if (country !== undefined) data.country = country || null
    if (website !== undefined) data.website = website || null
    if (notes !== undefined) data.notes = notes || null
    const company = await prisma.company.update({
      where: { id: req.params.id },
      data,
      include: { _count: { select: { contacts: true, tickets: true, projects: true, users: true } } },
    })
    res.json(company)
  } catch (e) { next(e) }
}

export async function deleteCompany(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const company = await prisma.company.findUnique({ where: { id: req.params.id } })
    if (!company) throw new AppError(404, 'Company not found')
    if (company.isInternal) throw new AppError(403, 'The MSP company cannot be deleted')

    await prisma.$transaction(async (tx) => {
      // Tickets
      const tickets = await tx.ticket.findMany({ where: { companyId: company.id }, select: { id: true } })
      const ticketIds = tickets.map(t => t.id)
      if (ticketIds.length) {
        await tx.attachment.deleteMany({ where: { ticketId: { in: ticketIds } } })
        await tx.ticketComment.deleteMany({ where: { ticketId: { in: ticketIds } } })
        await tx.ticketHistory.deleteMany({ where: { ticketId: { in: ticketIds } } })
        await tx.timeEntry.deleteMany({ where: { ticketId: { in: ticketIds } } })
        await tx.ticket.deleteMany({ where: { companyId: company.id } })
      }

      // Projects + tasks
      const projects = await tx.project.findMany({ where: { companyId: company.id }, select: { id: true } })
      const projectIds = projects.map(p => p.id)
      if (projectIds.length) {
        const tasks = await tx.task.findMany({ where: { projectId: { in: projectIds } }, select: { id: true } })
        const taskIds = tasks.map(t => t.id)
        if (taskIds.length) {
          await tx.attachment.deleteMany({ where: { taskId: { in: taskIds } } })
          await tx.taskComment.deleteMany({ where: { taskId: { in: taskIds } } })
          await tx.activeTimer.deleteMany({ where: { taskId: { in: taskIds } } })
          await tx.taskAssignee.deleteMany({ where: { taskId: { in: taskIds } } })
          await tx.timeEntry.deleteMany({ where: { taskId: { in: taskIds } } })
          // Subtasks first, then parent tasks
          await tx.task.deleteMany({ where: { projectId: { in: projectIds }, parentTaskId: { not: null } } })
          await tx.task.deleteMany({ where: { projectId: { in: projectIds } } })
        }
        await tx.section.deleteMany({ where: { projectId: { in: projectIds } } })
        await tx.projectMember.deleteMany({ where: { projectId: { in: projectIds } } })
        await tx.timeEntry.deleteMany({ where: { projectId: { in: projectIds } } })
        await tx.project.deleteMany({ where: { companyId: company.id } })
      }

      // Changes
      await tx.change.deleteMany({ where: { companyId: company.id } })

      // Invoices
      const invoices = await tx.invoice.findMany({ where: { companyId: company.id }, select: { id: true } })
      const invoiceIds = invoices.map(i => i.id)
      if (invoiceIds.length) {
        await tx.invoiceItem.deleteMany({ where: { invoiceId: { in: invoiceIds } } })
        await tx.invoice.deleteMany({ where: { companyId: company.id } })
      }

      // Contracts, leads, contacts
      await tx.contract.deleteMany({ where: { companyId: company.id } })
      await tx.lead.deleteMany({ where: { companyId: company.id } })
      await tx.contact.deleteMany({ where: { companyId: company.id } })

      // Finally the company
      await tx.company.delete({ where: { id: company.id } })
    })

    res.json({ success: true })
  } catch (e) { next(e) }
}

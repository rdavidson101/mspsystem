import { Response, NextFunction } from 'express'
import { prisma } from '../../lib/prisma'
import { AuthRequest } from '../../middleware/auth'

export async function getDashboard(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const [
      totalTickets, openTickets, inProgressTickets,
      totalProjects, activeProjects,
      totalTasks, completedTasks, notStartedTasks,
      totalInvoices, paidInvoices, pendingInvoices,
      totalLeads, wonLeads,
      recentTickets, recentTasks, recentActivity,
    ] = await Promise.all([
      prisma.ticket.count(),
      prisma.ticket.count({ where: { status: 'OPEN' } }),
      prisma.ticket.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.project.count(),
      prisma.project.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.task.count(),
      prisma.task.count({ where: { status: 'COMPLETED' } }),
      prisma.task.count({ where: { status: 'NOT_STARTED' } }),
      prisma.invoice.count(),
      prisma.invoice.count({ where: { status: 'PAID' } }),
      prisma.invoice.count({ where: { status: { in: ['SENT', 'OVERDUE'] } } }),
      prisma.lead.count(),
      prisma.lead.count({ where: { status: 'WON' } }),
      prisma.ticket.findMany({ take: 5, orderBy: { createdAt: 'desc' }, include: { company: { select: { name: true } }, assignedTo: { select: { firstName: true, lastName: true } } } }),
      prisma.task.findMany({ take: 10, orderBy: { createdAt: 'desc' }, include: { project: { select: { name: true } }, assignedTo: { select: { firstName: true, lastName: true } } } }),
      prisma.task.findMany({ take: 5, where: { updatedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }, orderBy: { updatedAt: 'desc' }, include: { assignedTo: { select: { firstName: true, lastName: true } }, project: { select: { name: true } } } }),
    ])

    res.json({
      stats: {
        tickets: { total: totalTickets, open: openTickets, inProgress: inProgressTickets },
        projects: { total: totalProjects, active: activeProjects },
        tasks: { total: totalTasks, completed: completedTasks, notStarted: notStartedTasks },
        invoices: { total: totalInvoices, paid: paidInvoices, pending: pendingInvoices },
        leads: { total: totalLeads, won: wonLeads },
      },
      recentTickets,
      recentTasks,
      recentActivity,
    })
  } catch (e) { next(e) }
}

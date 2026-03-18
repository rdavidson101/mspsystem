import { PrismaClient, UserRole, TicketStatus, TicketPriority, ProjectStatus, TaskStatus, TaskPriority, LeadStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  const hashedPassword = await bcrypt.hash('admin123', 10)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@msp.local' },
    update: {},
    create: { email: 'admin@msp.local', password: hashedPassword, firstName: 'Admin', lastName: 'User', role: UserRole.ADMIN },
  })

  const tech = await prisma.user.upsert({
    where: { email: 'tech@msp.local' },
    update: {},
    create: { email: 'tech@msp.local', password: hashedPassword, firstName: 'John', lastName: 'Technician', role: UserRole.TECHNICIAN },
  })

  // Ticket categories
  const categories = await Promise.all([
    prisma.ticketCategory.upsert({ where: { name: 'Network' }, update: {}, create: { name: 'Network', color: '#3b82f6' } }),
    prisma.ticketCategory.upsert({ where: { name: 'Hardware' }, update: {}, create: { name: 'Hardware', color: '#f97316' } }),
    prisma.ticketCategory.upsert({ where: { name: 'Software' }, update: {}, create: { name: 'Software', color: '#8b5cf6' } }),
    prisma.ticketCategory.upsert({ where: { name: 'Email' }, update: {}, create: { name: 'Email', color: '#06b6d4' } }),
    prisma.ticketCategory.upsert({ where: { name: 'Security' }, update: {}, create: { name: 'Security', color: '#ef4444' } }),
    prisma.ticketCategory.upsert({ where: { name: 'User Account' }, update: {}, create: { name: 'User Account', color: '#10b981' } }),
  ])

  // Sample macros
  await prisma.macro.upsert({
    where: { id: 'macro-1' },
    update: {},
    create: {
      id: 'macro-1',
      name: 'Initial Response',
      content: `Hi {{requester_name}},\n\nThank you for contacting support. We have received your request and assigned it reference number {{ticket_ref}}.\n\nA member of our team will be in touch shortly.\n\nBest regards,\n{{assignee_name}}`,
      createdById: admin.id,
      isGlobal: true,
    },
  })

  await prisma.macro.upsert({
    where: { id: 'macro-2' },
    update: {},
    create: {
      id: 'macro-2',
      name: 'Request More Information',
      content: `Hi {{requester_name}},\n\nThank you for your ticket {{ticket_ref}}. To help us resolve this issue as quickly as possible, could you please provide the following additional information:\n\n- \n- \n\nOnce we receive this information, we will be able to proceed.\n\nKind regards,\n{{assignee_name}}`,
      createdById: admin.id,
      isGlobal: true,
    },
  })

  await prisma.macro.upsert({
    where: { id: 'macro-3' },
    update: {},
    create: {
      id: 'macro-3',
      name: 'Resolution Confirmation',
      content: `Hi {{requester_name}},\n\nI'm pleased to let you know that your ticket {{ticket_ref}} has been resolved.\n\nIf you continue to experience issues or have any further questions, please don't hesitate to reply to this ticket.\n\nBest regards,\n{{assignee_name}}`,
      createdById: admin.id,
      isGlobal: true,
    },
  })

  // Company
  const company1 = await prisma.company.upsert({
    where: { id: 'company-1' },
    update: {},
    create: { id: 'company-1', name: 'Acme Corporation', domain: 'acme.com', industry: 'Technology', phone: '555-0100', email: 'info@acme.com', city: 'New York', state: 'NY', country: 'USA' },
  })

  // Tickets
  const t1 = await prisma.ticket.create({
    data: {
      title: 'Server is down - critical production issue',
      description: 'Main production server is unresponsive. All services are affected. Users cannot access any systems.',
      status: TicketStatus.OPEN,
      priority: TicketPriority.CRITICAL,
      categoryId: categories[0].id,
      companyId: company1.id,
      assignedToId: tech.id,
      createdById: admin.id,
      tags: ['server', 'production'],
    },
  })
  await prisma.ticketHistory.createMany({
    data: [
      { ticketId: t1.id, userId: admin.id, field: 'status', oldValue: null, newValue: 'OPEN' },
      { ticketId: t1.id, userId: admin.id, field: 'priority', oldValue: null, newValue: 'CRITICAL' },
      { ticketId: t1.id, userId: admin.id, field: 'assignedTo', oldValue: 'Unassigned', newValue: 'John Technician' },
    ],
  })

  const t2 = await prisma.ticket.create({
    data: {
      title: 'Email not working for finance team',
      description: 'Finance team cannot send or receive emails since this morning.',
      status: TicketStatus.IN_PROGRESS,
      priority: TicketPriority.HIGH,
      categoryId: categories[3].id,
      companyId: company1.id,
      assignedToId: tech.id,
      createdById: admin.id,
      tags: ['email'],
    },
  })
  await prisma.ticketComment.create({
    data: { ticketId: t2.id, userId: tech.id, content: 'Investigating the mail server logs now.', isInternal: true },
  })
  await prisma.ticketHistory.createMany({
    data: [
      { ticketId: t2.id, userId: admin.id, field: 'status', oldValue: 'OPEN', newValue: 'IN_PROGRESS' },
    ],
  })

  // Project
  const project = await prisma.project.create({
    data: {
      name: 'Network Infrastructure Upgrade',
      description: 'Complete network overhaul for Acme Corp',
      status: ProjectStatus.IN_PROGRESS,
      companyId: company1.id,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      budget: 50000,
      members: { create: [{ userId: admin.id, role: 'OWNER' }, { userId: tech.id, role: 'MEMBER' }] },
    },
  })

  await prisma.task.createMany({
    data: [
      { title: 'Make a Website for agency', status: TaskStatus.COMPLETED, priority: TaskPriority.LOW, projectId: project.id, assignedToId: tech.id, createdById: admin.id, startDate: new Date(Date.now() - 10 * 86400000), dueDate: new Date(Date.now() + 14 * 86400000), tags: ['Important', 'Tomorrow'] },
      { title: 'Summarize your Experience', status: TaskStatus.IN_PROGRESS, priority: TaskPriority.MEDIUM, projectId: project.id, assignedToId: tech.id, createdById: admin.id, startDate: new Date(Date.now() - 9 * 86400000), dueDate: new Date(Date.now() + 14 * 86400000) },
      { title: 'Make a video introduction', status: TaskStatus.IN_PROGRESS, priority: TaskPriority.HIGH, projectId: project.id, assignedToId: tech.id, createdById: admin.id, startDate: new Date(Date.now() - 8 * 86400000), dueDate: new Date(Date.now() + 14 * 86400000), tags: ['Bug', 'Follow up'] },
      { title: 'Fix mimetype declarations', status: TaskStatus.NOT_STARTED, priority: TaskPriority.HIGH, projectId: project.id, createdById: admin.id, startDate: new Date(Date.now() - 7 * 86400000), dueDate: new Date(Date.now() + 14 * 86400000) },
    ],
  })

  await prisma.todo.createMany({
    data: [
      { title: 'Text Inputs for Design System', description: 'Search for inspiration to provide a rich cont...', userId: admin.id, completed: false, priority: 'HIGH', tags: ['Today', 'To-do'], dueDate: new Date(Date.now() + 86400000) },
      { title: 'Meeting with Arthur Taylor', description: 'Discuss the MVP version of Apex Mobile on...', userId: admin.id, completed: true, priority: 'MEDIUM', tags: ['Today', 'Meeting'], completedAt: new Date() },
    ],
  })

  await prisma.lead.create({ data: { title: 'Enterprise Security Package', value: 25000, status: LeadStatus.PROPOSAL, companyId: company1.id, source: 'Website' } })

  await prisma.announcement.create({ data: { title: 'System Maintenance Window', content: 'Scheduled maintenance on Sunday 2-4 AM EST', isActive: true } })

  console.log('Seed complete!')
  console.log('Login: admin@msp.local / admin123')
}

main().catch(console.error).finally(() => prisma.$disconnect())
